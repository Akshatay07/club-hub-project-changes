import express from "express";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import EventRegistration from "../models/EventRegistration.js";
import Feedback from "../models/Feedback.js";
import Attendance from "../models/Attendance.js";
import BudgetRequest from "../models/Budget.js";
import ProofSubmission from "../models/ProofSubmission.js";
import auth from "../middleware/auth.js";
import permit from "../middleware/role.js";
import checkFacultyClub from "../middleware/checkFacultyClub.js";
import { sendEmail } from "../services/emailService.js";
import { createNotification } from "../services/notificationService.js";
import { recalculateClubHealth } from "../services/healthService.js";
import User from "../models/User.js";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import upload from "../middleware/upload.js";


const router = express.Router();

router.get("/", auth, permit("admin"), async (req, res) => {
  try {
    const faculty = await User.find({ role: "faculty" })
      .select("_id name email");

    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.use(auth, permit("faculty"), checkFacultyClub);

router.get("/my-club", async (req, res) => {
  try {
    const club = await Club.findById(req.assignedClubIds[0]);

    const feedbacks = await Feedback.find({ clubId: club._id });

    const avgRating =
      feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) /
      (feedbacks.length || 1);

    res.json({
      ...club.toObject(),
      membersCount: club.members?.length || 0,
      rating: Number(avgRating.toFixed(1)),
      feedbackCount: feedbacks.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/events", async (req, res) => {
  try {
    const events = await Event.find({ clubId: { $in: req.assignedClubIds } })
      .populate("clubId", "name")
      .sort({ date: -1, time: -1 });
    res.json(
      events.map((event) => ({
        ...event.toObject(),
        clubName: event.clubId?.name || "",
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



router.get("/registrations", async (req, res) => {
  try {
    const events = await Event.find({ clubId: { $in: req.assignedClubIds } }).select("_id name");
    const eventIds = events.map((event) => event._id);
    const registrations = await EventRegistration.find({ eventId: { $in: eventIds } })
.populate("studentId", "name email regNo")
    .populate("eventId", "name date time location")
      .sort({ createdAt: -1 });
    res.json(
      registrations.map((registration) => ({
        ...registration.toObject(),
        student: registration.studentId,
        event: registration.eventId,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET students for event
router.get("/events/:eventId/registrations", async (req, res) => {
  try {
    const { eventId } = req.params;

    const data = await EventRegistration.find({ eventId })
      .populate("studentId", "name email");

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SUBMIT attendance
router.post("/events/:eventId/attendance", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { presentStudentIds } = req.body;

    // mark present
    await EventRegistration.updateMany(
      { eventId, studentId: { $in: presentStudentIds } },
      { $set: { status: "attended" } }
    );

    // mark absent
    await EventRegistration.updateMany(
      { eventId, studentId: { $nin: presentStudentIds }, status: "registered" },
      { $set: { status: "absent" } }
    );

    res.json({ message: "Attendance saved" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/registrations/:id/attend", async (req, res) => {
  try {
    const registration = await EventRegistration.findById(req.params.id).populate("eventId");
    if (!registration || !req.assignedClubIds.includes(String(registration.eventId.clubId))) {
      return res.status(404).json({ message: "Registration not found" });
    }

    registration.status = req.body.status === "attended" ? "attended" : "registered";
    await registration.save();

    if (req.body.status === "attended") {
      await Attendance.findOneAndUpdate(
        { eventId: registration.eventId._id, studentId: registration.studentId },
        {
          eventId: registration.eventId._id,
          studentId: registration.studentId,
          registrationId: registration._id,
          checkInTime: new Date(),
          status: "present",
          markedBy: "manual",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const event = await Event.findById(registration.eventId._id);
    event.attendanceCount = await Attendance.countDocuments({ eventId: event._id });
    event.attendanceRate = event.registeredCount
      ? Number(((event.attendanceCount / event.registeredCount) * 100).toFixed(1))
      : 0;
    await event.save();
    await recalculateClubHealth(event.clubId);

    res.json(registration);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/events/:id/mark-absent", async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const now = new Date();
    const eventTime = new Date(`${event.date} ${event.time}`);

    if (now < eventTime) {
      return res.status(400).json({
        message: "Event not finished yet",
      });
    }

    // ✅ mark all remaining as absent
    await EventRegistration.updateMany(
      {
        eventId,
        status: "registered",
      },
      {
        $set: { status: "absent" },
      }
    );

    res.json({ message: "Absentees marked" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;

    await user.save();

    res.json({ message: "Password updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/events/:eventId/attendance", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { presentStudentIds } = req.body;

    // mark present
    await EventRegistration.updateMany(
      {
        eventId,
        studentId: { $in: presentStudentIds },
      },
      { $set: { status: "attended" } }
    );

    // remaining → absent
    await EventRegistration.updateMany(
      {
        eventId,
        studentId: { $nin: presentStudentIds },
      },
      { $set: { status: "absent" } }
    );

    res.json({ message: "Attendance updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/attendance/bulk", async (req, res) => {
  try {
    const { ids } = req.body;

    // mark selected as attended
    await EventRegistration.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "attended" } }
    );

    // find eventId from one record
    const sample = await EventRegistration.findById(ids[0]);

    // mark remaining as absent
    await EventRegistration.updateMany(
      {
        eventId: sample.eventId,
        _id: { $nin: ids },
        status: "registered",
      },
      { $set: { status: "absent" } }
    );

    res.json({ message: "Attendance updated", count: ids.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const club = await Club.findById(_req.assignedClubIds[0]);
    const events = await Event.find({ clubId: { $in: _req.assignedClubIds } });
    const eventIds = events.map((event) => event._id);
    const totalRegistrations = await EventRegistration.countDocuments({ eventId: { $in: eventIds } });
    const feedbackCount = await Feedback.countDocuments({ clubId: { $in: _req.assignedClubIds } });

    res.json({
      totalEvents: events.length,
      pendingEvents: events.filter((event) => event.status === "pending").length,
      totalRegistrations,
      feedbackCount,
      clubRating: club?.rating || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/feedback", async (_req, res) => {
  try {
    const feedback = await Feedback.find({ clubId: { $in: _req.assignedClubIds } })
      .populate("studentId", "name email")
      .populate("eventId", "name date")
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/budget-request", async (req, res) => {
  try {
    const request = await BudgetRequest.create({
      clubId: req.body.clubId || req.assignedClubIds[0],
      eventId: req.body.eventId || null,
      facultyId: req.user._id,
      amount: req.body.amount,
      purpose: req.body.purpose,
    });

    await createNotification({
      userId: req.user._id,
      title: "Budget request submitted",
      message: `INR ${request.amount} requested`,
      type: "success",
      metadata: { requestId: String(request._id) },
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/proofs", async (_req, res) => {
  try {
    const proofs = await ProofSubmission.find({ clubId: { $in: _req.assignedClubIds } })
      .populate("eventId", "name date proofStatus")
      .sort({ updatedAt: -1 });
    res.json(proofs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/feedback/respond", async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.body.feedbackId).populate("studentId", "email name");
    if (!feedback || !req.assignedClubIds.includes(String(feedback.clubId))) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    feedback.facultyResponse = req.body.response;
    feedback.facultyRespondedAt = new Date();
    await feedback.save();

    await sendEmail({
      to: feedback.studentId.email,
      subject: "Faculty responded to your feedback",
      template: "feedback-response",
      html: `<p>${req.body.response}</p>`,
      text: req.body.response,
      metadata: { feedbackId: String(feedback._id), studentId: String(feedback.studentId._id) },
    });

    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get("/attendance/:eventId/pdf", async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId).populate("clubId", "name");

    const registrations = await EventRegistration.find({ eventId })
      .populate("studentId", "name email studentId");

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attendance-sheet.pdf"
    );

    doc.pipe(res);

const logoPath = path.join(process.cwd(), "backend", "logo.png");

if (fs.existsSync(logoPath)) {
  doc.image(logoPath, 40, 30, { width: 50 });
}

    // ================= HEADER =================
    doc
      .fontSize(16)
      .text("DSCASC", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .text(`Club: ${event?.clubId?.name || "-"}`, { align: "center" });

    doc.text(`Event: ${event?.name || "-"}`, { align: "center" });
    doc.text(`Date: ${event?.date || "-"}`, { align: "center" });

    doc.moveDown(1.5);

    // ================= TABLE =================
    const startX = 40;
    let y = 140;

    const col = {
  sl: startX,
  reg: startX + 40,
  name: startX + 140,
  sign: startX + 380,
};

    // Header
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("Sl No", col.sl, y);
    doc.text("Reg No", col.reg, y);
    doc.text("Student Name", col.name, y);
doc.text("Signature", col.sign, y);

    y += 15;

    doc.moveTo(startX, y).lineTo(550, y).stroke();

    y += 10;

    doc.font("Helvetica");

    registrations.forEach((r, index) => {
      const student = r.studentId;

      const regNo = student?.regNo || "-";

      doc.text(index + 1, col.sl, y);
      doc.text(regNo, col.reg, y);
      doc.text(student?.name || "-", col.name, y);

      // signature line
      doc.moveTo(col.sign, y + 12).lineTo(550, y + 12).stroke();

      y += 25;

      if (y > 750) {
        doc.addPage();
        y = 60;
      }
    });

    // ================= FOOTER =================
    doc.moveDown(2);

    doc.text("Faculty Signature: ____________________", 40, y + 20);

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message });
    }
  }
});

/* ================= SIGNED ATTENDANCE SHEETS (PDF) ================= */

// UPLOAD signed attendance sheet (scanned PDF)
router.post("/attendance/:eventId/signed-sheet", upload.single("file"), async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);

    if (!event || !req.assignedClubIds.includes(String(event.clubId))) {
      return res.status(404).json({ message: "Event not found or unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    const isPdf =
      req.file.mimetype === "application/pdf" ||
      req.file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return res.status(400).json({ message: "Only PDF files are allowed for scanned signed attendance sheets" });
    }

    const sheetRecord = {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    };

    if (!event.signedAttendanceSheets) {
      event.signedAttendanceSheets = [];
    }

    event.signedAttendanceSheets.push(sheetRecord);
    event.attendanceAttached = true;
    await event.save();

    res.status(201).json({
      message: "Signed attendance sheet uploaded successfully",
      sheet: sheetRecord,
      sheets: event.signedAttendanceSheets,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET signed sheets for an event
router.get("/attendance/:eventId/signed-sheets", async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).select("name signedAttendanceSheets attendanceAttached clubId");

    if (!event || !req.assignedClubIds.includes(String(event.clubId))) {
      return res.status(404).json({ message: "Event not found or unauthorized" });
    }

    res.json(event.signedAttendanceSheets || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE signed sheet
router.delete("/attendance/:eventId/signed-sheet/:sheetId", async (req, res) => {
  try {
    const { eventId, sheetId } = req.params;
    const event = await Event.findById(eventId);

    if (!event || !req.assignedClubIds.includes(String(event.clubId))) {
      return res.status(404).json({ message: "Event not found or unauthorized" });
    }

    const sheet = event.signedAttendanceSheets?.id(sheetId);
    if (sheet) {
      const filePath = path.join(process.cwd(), "uploads", sheet.fileName);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error("File unlink error:", e); }
      }
      sheet.deleteOne();
    } else {
      event.signedAttendanceSheets = (event.signedAttendanceSheets || []).filter(
        (s) => String(s._id) !== sheetId
      );
    }

    event.attendanceAttached = (event.signedAttendanceSheets?.length > 0);
    await event.save();

    res.json({ message: "Signed sheet deleted", sheets: event.signedAttendanceSheets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GOOGLE SHEETS & CSV IMPORT ================= */

function parseCSVHelper(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rawHeaders: [], rows: [] };

  function parseLine(line) {
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
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

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

router.post("/attendance/:eventId/import-google-sheet", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { sheetUrl, csvData, presentStudentIds, absentStudentIds, applyImmediately } = req.body;

    const event = await Event.findById(eventId);
    if (!event || !req.assignedClubIds.includes(String(event.clubId))) {
      return res.status(404).json({ message: "Event not found or unauthorized" });
    }

    // Direct apply from client preview if provided
    if (Array.isArray(presentStudentIds) || Array.isArray(absentStudentIds)) {
      if (Array.isArray(presentStudentIds) && presentStudentIds.length > 0) {
        await EventRegistration.updateMany(
          { eventId, studentId: { $in: presentStudentIds } },
          { $set: { status: "attended" } }
        );
        for (const sId of presentStudentIds) {
          await Attendance.findOneAndUpdate(
            { eventId, studentId: sId },
            { eventId, studentId: sId, checkInTime: new Date() },
            { upsert: true }
          );
        }
      }

      if (Array.isArray(absentStudentIds) && absentStudentIds.length > 0) {
        await EventRegistration.updateMany(
          { eventId, studentId: { $in: absentStudentIds } },
          { $set: { status: "absent" } }
        );
      }

      const attendedCount = await EventRegistration.countDocuments({ eventId, status: "attended" });
      const totalRegs = await EventRegistration.countDocuments({ eventId });
      event.attendanceCount = attendedCount;
      event.attendanceRate = totalRegs > 0 ? Math.round((attendedCount / totalRegs) * 100) : 0;
      await event.save();

      return res.json({
        message: "Attendance applied successfully",
        attendedCount,
        totalRegs,
      });
    }

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
        return res.status(400).json({ message: "Invalid Google Sheets URL format. Please provide a valid share link." });
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

    // Match column headers
    const regHeader = headers.find((h) =>
      h.includes("reg") || h.includes("register") || h.includes("usn") || h.includes("roll") || h.includes("studentreg")
    ) || headers.find((h) => h.includes("id"));

    const emailHeader = headers.find((h) => h.includes("email") || h.includes("mail"));
    const nameHeader = headers.find((h) => h.includes("name") || h.includes("student"));
    const statusHeader = headers.find((h) =>
      h.includes("status") || h.includes("attend") || h.includes("present")
    );

    const registrations = await EventRegistration.find({ eventId }).populate("studentId", "name email regNo studentId");

    const matchedStudents = [];
    const unmatchedRows = [];

    const presentIdsToUpdate = [];
    const absentIdsToUpdate = [];

    rows.forEach((row, idx) => {
      const rowReg = (regHeader ? row[regHeader] : "").trim().toUpperCase();
      const rowEmail = (emailHeader ? row[emailHeader] : "").trim().toLowerCase();
      const rowName = (nameHeader ? row[nameHeader] : "").trim().toLowerCase();

      const matchedReg = registrations.find((r) => {
        const st = r.studentId;
        if (!st) return false;
        if (rowReg && (st.regNo?.toUpperCase() === rowReg || st.studentId?.toUpperCase() === rowReg)) return true;
        if (rowEmail && st.email?.toLowerCase() === rowEmail) return true;
        if (rowName && st.name?.toLowerCase() === rowName) return true;
        return false;
      });

      let isPresent = true;
      if (statusHeader && row[statusHeader]) {
        const val = row[statusHeader].trim().toLowerCase();
        if (["absent", "a", "no", "0", "false", "n"].includes(val)) {
          isPresent = false;
        } else if (["present", "p", "yes", "1", "true", "attended", "y"].includes(val)) {
          isPresent = true;
        }
      }

      if (matchedReg && matchedReg.studentId) {
        matchedStudents.push({
          slNo: idx + 1,
          registrationId: matchedReg._id,
          studentId: matchedReg.studentId._id,
          name: matchedReg.studentId.name,
          regNo: matchedReg.studentId.regNo || matchedReg.studentId.studentId || "—",
          email: matchedReg.studentId.email,
          status: isPresent ? "attended" : "absent",
          previousStatus: matchedReg.status,
        });

        if (isPresent) {
          presentIdsToUpdate.push(matchedReg.studentId._id);
        } else {
          absentIdsToUpdate.push(matchedReg.studentId._id);
        }
      } else {
        unmatchedRows.push({
          slNo: idx + 1,
          rawValues: row._values,
          regNo: rowReg || "—",
          name: rowName || "—",
          email: rowEmail || "—",
        });
      }
    });

    if (applyImmediately !== false) {
      if (presentIdsToUpdate.length > 0) {
        await EventRegistration.updateMany(
          { eventId, studentId: { $in: presentIdsToUpdate } },
          { $set: { status: "attended" } }
        );
        for (const sId of presentIdsToUpdate) {
          await Attendance.findOneAndUpdate(
            { eventId, studentId: sId },
            { eventId, studentId: sId, checkInTime: new Date() },
            { upsert: true }
          );
        }
      }

      if (absentIdsToUpdate.length > 0) {
        await EventRegistration.updateMany(
          { eventId, studentId: { $in: absentIdsToUpdate } },
          { $set: { status: "absent" } }
        );
      }

      const attendedCount = await EventRegistration.countDocuments({ eventId, status: "attended" });
      const totalRegs = await EventRegistration.countDocuments({ eventId });
      event.attendanceCount = attendedCount;
      event.attendanceRate = totalRegs > 0 ? Math.round((attendedCount / totalRegs) * 100) : 0;
      await event.save();
    }

    res.json({
      message: `Processed ${rows.length} sheet rows. Matched ${matchedStudents.length} registered students.`,
      totalInSheet: rows.length,
      matchedCount: matchedStudents.length,
      unmatchedCount: unmatchedRows.length,
      matchedStudents,
      unmatchedRows,
      applied: applyImmediately !== false,
    });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ message: err.message || "Failed to import attendance data" });
  }
});

export default router;
