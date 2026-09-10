import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Feedback from "../models/Feedback.js";
import Complaint from "../models/Complaint.js";
import Event from "../models/Event.js";
import Club from "../models/Club.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import permit from "../middleware/role.js";
import { recalculateClubHealth } from "../services/healthService.js";
import { getIo } from "../socket.js";

const router = express.Router();

router.use(auth);

/* ================= HELPER FUNCTIONS ================= */

function parseCSVHelper(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rawHeaders: [], rows: [] };

  const firstLine = lines[0];
  const isTabDelimited =
    firstLine.includes("\t") &&
    (!firstLine.includes(",") ||
      firstLine.split("\t").length > firstLine.split(",").length);

  function parseLine(line) {
    if (isTabDelimited) {
      return line.split("\t").map((v) => v.trim().replace(/^"(.*)"$/, "$1"));
    }
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, "")
  );

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rawValues = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = rawValues[idx] || "";
    });
    row._values = rawValues;
    rows.push(row);
  }
  return { headers, rawHeaders, rows };
}

function parseRatingHelper(val, fallback = 5) {
  if (val === undefined || val === null || val === "") return fallback;
  const str = String(val).trim();

  // 1. Emoji / Unicode stars count (⭐, ★, ✨)
  const starSymbols = str.match(/[\u2B50\u2605\u2728\u2B55\u2606]/g);
  if (starSymbols && starSymbols.length > 0) {
    const filledStars = (str.match(/[\u2B50\u2605\u2728]/g) || []).length;
    if (filledStars > 0) return Math.min(Math.max(filledStars, 1), 5);
  }

  // 2. Fractions e.g. "5/5", "4 out of 5"
  const fractionMatch = str.match(/^([0-5](?:\.[0-9]+)?)\s*(?:\/|\s+out\s+of\s+)\s*([0-9]+)/i);
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const denom = parseFloat(fractionMatch[2]);
    if (denom > 0) {
      const normalized = Math.round((num / denom) * 5);
      return Math.min(Math.max(normalized, 1), 5);
    }
  }

  // 3. Leading numbers e.g. "5 - Excellent", "4: Good", "5 stars"
  const leadingNumMatch = str.match(/^([1-5])(?:\.0)?(?:\s*[-:/)\w\s*]|$)/);
  if (leadingNumMatch) {
    return parseInt(leadingNumMatch[1], 10);
  }

  // 4. Any direct integer 1-5
  const numMatch = str.match(/([1-5])/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  // 5. Semantic string matches
  const lower = str.toLowerCase();
  if (lower.includes("excellent") || lower.includes("outstanding") || lower.includes("great") || lower.includes("awesome") || lower.includes("amazing")) return 5;
  if (lower.includes("very good") || lower.includes("good") || lower.includes("satisfied")) return 4;
  if (lower.includes("average") || lower.includes("neutral") || lower.includes("okay") || lower.includes("ok")) return 3;
  if (lower.includes("poor") || lower.includes("dissatisfied") || lower.includes("bad")) return 2;
  if (lower.includes("terrible") || lower.includes("horrible") || lower.includes("very poor")) return 1;

  return fallback;
}

// Helper: auto-find or create student User
async function findOrCreateStudentUser(studentInfo) {
  const regNo = (studentInfo.regNo || "").trim().toUpperCase();
  const email = (studentInfo.email || "").trim().toLowerCase();
  const name = (studentInfo.name || "").trim() || regNo || "Student";
  const department = (studentInfo.department || "").trim();

  let studentUser = null;
  if (studentInfo.studentId && mongoose.Types.ObjectId.isValid(studentInfo.studentId)) {
    studentUser = await User.findById(studentInfo.studentId);
  }

  if (!studentUser) {
    const query = [];
    if (regNo && regNo !== "—") query.push({ regNo }, { studentId: regNo });
    if (email && email !== "—") query.push({ email });
    if (name && name !== "Student") query.push({ name: new RegExp(`^${name}$`, "i") });

    if (query.length > 0) {
      studentUser = await User.findOne({ $or: query });
    }
  }

  if (!studentUser) {
    const fallbackId = regNo && regNo !== "—" ? regNo : `student_${crypto.randomBytes(3).toString("hex")}`;
    const studentEmail = email && email !== "—" ? email : `${fallbackId.toLowerCase()}@student.college.edu`;
    const dummyPassword = crypto.randomBytes(12).toString("hex");

    studentUser = await User.create({
      name,
      email: studentEmail,
      regNo: regNo && regNo !== "—" ? regNo : undefined,
      password: dummyPassword,
      role: "student",
      department,
      isActive: true,
      isApproved: true,
    });
  }

  return studentUser;
}

/* ================= GET FEEDBACK ================= */
router.get("/", async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("studentId", "name email studentId regNo")
      .populate("eventId", "name date")
      .populate("clubId", "name")
      .sort({ createdAt: -1 });

    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= CREATE SINGLE FEEDBACK ================= */
router.post("/", async (req, res) => {
  try {
    const { eventId, clubId, rating, comment } = req.body;

    let targetClubId = clubId || null;
    let targetEventId = eventId || null;

    if (eventId) {
      const event = await Event.findById(eventId);
      if (event) {
        targetClubId = event.clubId || targetClubId;
      }
    }

    const feedback = await Feedback.create({
      studentId: req.user._id || req.user.id,
      clubId: targetClubId,
      eventId: targetEventId,
      targetType: targetEventId ? "event" : "club",
      rating: Number(rating) || 5,
      comment: comment || "",
    });

    if (targetClubId) {
      recalculateClubHealth(targetClubId).catch(() => {});
    }

    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GOOGLE SHEET & CSV IMPORT ================= */
router.post("/import-google-sheet", permit("admin", "faculty"), async (req, res) => {
  try {
    const {
      sheetUrl,
      csvData,
      itemsToImport,
      selectedClubId,
      selectedEventId,
      defaultRating = 5,
      previewOnly = false,
    } = req.body;

    const allClubs = await Club.find().select("_id name");

    // Helper to resolve club ID
    const resolveClubId = (clubNameStr) => {
      if (!clubNameStr) return selectedClubId || null;
      const clean = clubNameStr.trim().toLowerCase();
      const matched = allClubs.find(
        (c) => c.name.toLowerCase() === clean || c.name.toLowerCase().includes(clean)
      );
      return matched ? matched._id : selectedClubId || null;
    };

    // CASE 1: Applying pre-confirmed / structured items list from frontend preview
    if (Array.isArray(itemsToImport) && itemsToImport.length > 0) {
      let createdFeedbackCount = 0;
      let createdComplaintCount = 0;
      const touchedClubs = new Set();

      for (const item of itemsToImport) {
        if (!item) continue;
        const studentUser = await findOrCreateStudentUser({
          name: item.studentName || item.name,
          email: item.email,
          regNo: item.regNo,
          studentId: item.studentId,
          department: item.department,
        });

        const targetClubId = item.clubId || resolveClubId(item.clubName);
        const targetEventId = item.eventId || selectedEventId || null;
        if (targetClubId) touchedClubs.add(String(targetClubId));

        const itemCreatedAt = item.date ? new Date(item.date) : new Date();

        // 1. Create Feedback if feedback text exists or rating given
        if (item.feedbackText || item.hasFeedback) {
          await Feedback.create({
            studentId: studentUser._id,
            clubId: targetClubId,
            eventId: targetEventId,
            targetType: targetEventId ? "event" : "club",
            rating: Math.min(Math.max(Number(item.rating) || 5, 1), 5),
            comment: (item.feedbackText || "").trim(),
            createdAt: itemCreatedAt,
          });
          createdFeedbackCount++;
        }

        // 2. Create Complaint if complaint text exists
        if (item.complaintText && item.complaintText.trim().length > 0) {
          const complaint = await Complaint.create({
            studentId: studentUser._id,
            clubId: targetClubId,
            eventId: targetEventId,
            content: item.complaintText.trim(),
            status: "open",
            severity: item.severity || "medium",
            createdAt: itemCreatedAt,
          });
          createdComplaintCount++;

          try {
            getIo().to("admin").emit("complaint:new", complaint);
          } catch (e) {}
        }
      }

      // Recalculate health for touched clubs
      for (const cId of touchedClubs) {
        recalculateClubHealth(cId).catch(() => {});
      }

      return res.json({
        success: true,
        message: `Successfully imported ${createdFeedbackCount} feedback review(s) and ${createdComplaintCount} complaint(s).`,
        feedbackCount: createdFeedbackCount,
        complaintCount: createdComplaintCount,
      });
    }

    // CASE 2: Parsing Google Sheet URL or Raw CSV Data
    let csvContent = csvData || "";

    if (sheetUrl) {
      const match1 = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
      const match2 = sheetUrl.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/i);

      let fetchUrl = "";
      if (match2 && match2[1]) {
        fetchUrl = `https://docs.google.com/spreadsheets/d/e/${match2[1]}/pub?output=csv`;
      } else if (match1 && match1[1]) {
        const sheetId = match1[1];
        const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : "0";
        fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      } else {
        return res.status(400).json({
          message: "Invalid Google Sheets URL format. Please provide a valid share link.",
        });
      }

      try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          return res.status(400).json({
            message: `Could not fetch Google Sheet (HTTP ${response.status}). Please ensure link sharing is set to 'Anyone with the link can view'.`,
          });
        }
        csvContent = await response.text();
      } catch (fetchErr) {
        return res.status(400).json({
          message: `Failed to connect to Google Sheets: ${fetchErr.message}. Make sure the sheet is public or paste CSV data.`,
        });
      }
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return res.status(400).json({ message: "No sheet data found or sheet is empty." });
    }

    const { headers, rawHeaders, rows } = parseCSVHelper(csvContent);
    if (!rows.length) {
      return res.status(400).json({ message: "No data rows found in the sheet." });
    }

    // Header auto-detection
    const nameHeader =
      headers.find((h) =>
        h.includes("name") || h.includes("student") || h.includes("participant") || h.includes("yourname") || h.includes("fullname")
      );
    const emailHeader = headers.find((h) => h.includes("email") || h.includes("mail"));
    const regHeader =
      headers.find((h) =>
        h.includes("reg") || h.includes("usn") || h.includes("roll") || h.includes("id")
      );
    const feedbackHeader =
      headers.find((h) =>
        h.includes("feedback") ||
        h.includes("comment") ||
        h.includes("review") ||
        h.includes("experience") ||
        h.includes("thought") ||
        h.includes("remark") ||
        h.includes("suggestion")
      );
    const complaintHeader =
      headers.find((h) =>
        h.includes("complaint") ||
        h.includes("grievance") ||
        h.includes("issue") ||
        h.includes("problem") ||
        h.includes("concern")
      );
    const ratingHeader =
      headers.find((h) =>
        h.includes("rating") ||
        h.includes("star") ||
        h.includes("rate") ||
        h.includes("score") ||
        h.includes("scale")
      );
    const clubHeader =
      headers.find((h) =>
        h.includes("club") || h.includes("committee") || h.includes("category") || h.includes("department")
      );
    const dateHeader =
      headers.find((h) =>
        h.includes("timestamp") || h.includes("date") || h.includes("time")
      );

    const parsedRows = [];
    let detectedFeedbackCount = 0;
    let detectedComplaintCount = 0;

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const studentName = (nameHeader ? row[nameHeader] : "").trim() || `Student ${idx + 1}`;
      const email = (emailHeader ? row[emailHeader] : "").trim().toLowerCase();
      const regNo = (regHeader ? row[regHeader] : "").trim().toUpperCase();
      const feedbackText = (feedbackHeader ? row[feedbackHeader] : "").trim();
      const complaintText = (complaintHeader ? row[complaintHeader] : "").trim();
      const ratingRaw = ratingHeader ? row[ratingHeader] : "";
      const rating = parseRatingHelper(ratingRaw, Number(defaultRating) || 5);
      const clubName = (clubHeader ? row[clubHeader] : "").trim();
      const rawDate = dateHeader ? row[dateHeader] : "";

      // Check if row has meaningful data
      const hasFeedback = feedbackText.length > 0 || (ratingRaw && !complaintText);
      const hasComplaint = complaintText.length > 0;

      // Skip row if completely blank
      if (!studentName && !feedbackText && !complaintText && !email) {
        continue;
      }

      if (hasFeedback) detectedFeedbackCount++;
      if (hasComplaint) detectedComplaintCount++;

      parsedRows.push({
        id: `row_${idx}_${Date.now()}`,
        slNo: idx + 1,
        studentName,
        email,
        regNo,
        feedbackText,
        complaintText,
        rating,
        ratingRaw,
        clubName,
        clubId: resolveClubId(clubName),
        date: rawDate ? new Date(rawDate) : new Date(),
        hasFeedback,
        hasComplaint,
        selected: true,
      });
    }

    // PREVIEW MODE: Return structured rows for review
    if (previewOnly) {
      return res.json({
        preview: true,
        totalRows: parsedRows.length,
        feedbackCount: detectedFeedbackCount,
        complaintCount: detectedComplaintCount,
        rawHeaders,
        detectedHeaders: {
          name: nameHeader,
          email: emailHeader,
          regNo: regHeader,
          feedback: feedbackHeader,
          complaint: complaintHeader,
          rating: ratingHeader,
          club: clubHeader,
          date: dateHeader,
        },
        rows: parsedRows,
      });
    }

    // DIRECT IMPORT MODE: Save directly
    let createdFeedbackCount = 0;
    let createdComplaintCount = 0;
    const touchedClubs = new Set();

    for (const item of parsedRows) {
      const studentUser = await findOrCreateStudentUser({
        name: item.studentName,
        email: item.email,
        regNo: item.regNo,
      });

      const targetClubId = item.clubId || selectedClubId || null;
      const targetEventId = selectedEventId || null;
      if (targetClubId) touchedClubs.add(String(targetClubId));

      const itemCreatedAt = item.date instanceof Date && !isNaN(item.date.getTime()) ? item.date : new Date();

      if (item.hasFeedback) {
        await Feedback.create({
          studentId: studentUser._id,
          clubId: targetClubId,
          eventId: targetEventId,
          targetType: targetEventId ? "event" : "club",
          rating: item.rating || 5,
          comment: item.feedbackText || "",
          createdAt: itemCreatedAt,
        });
        createdFeedbackCount++;
      }

      if (item.hasComplaint) {
        const complaint = await Complaint.create({
          studentId: studentUser._id,
          clubId: targetClubId,
          eventId: targetEventId,
          content: item.complaintText,
          status: "open",
          severity: "medium",
          createdAt: itemCreatedAt,
        });
        createdComplaintCount++;

        try {
          getIo().to("admin").emit("complaint:new", complaint);
        } catch (e) {}
      }
    }

    for (const cId of touchedClubs) {
      recalculateClubHealth(cId).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Successfully imported ${createdFeedbackCount} feedback review(s) and ${createdComplaintCount} complaint(s).`,
      feedbackCount: createdFeedbackCount,
      complaintCount: createdComplaintCount,
    });
  } catch (err) {
    console.error("Feedback import error:", err);
    res.status(500).json({ message: err.message || "Failed to import feedback & complaints" });
  }
});

/* ================= DELETE FEEDBACK ================= */
router.delete("/:id", permit("admin"), async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    if (feedback.clubId) {
      recalculateClubHealth(feedback.clubId).catch(() => {});
    }
    res.json({ message: "Feedback review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;