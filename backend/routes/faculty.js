import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
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
      .populate("studentId", "name email regNo studentId department");

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
    const requestedRows = req.query.rows ? parseInt(req.query.rows, 10) : null;

    const event = await Event.findById(eventId).populate("clubId", "name");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const totalRows = requestedRows && !isNaN(requestedRows) && requestedRows > 0
      ? requestedRows
      : (event.maxCapacity && event.maxCapacity > 0 ? Math.min(event.maxCapacity, 100) : 30);

    const doc = new PDFDocument({ margin: 36, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    const sanitizedName = (event.name || "event").replace(/[^a-zA-Z0-9-_]/g, "_");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance-${sanitizedName}.pdf`
    );

    doc.pipe(res);

    const logoPath = path.join(process.cwd(), "backend", "logo.png");

    // ================= HEADER =================
    let startY = 35;
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 40, startY, { width: 42 });
      } catch (e) {
        console.log("Logo load error:", e.message);
      }
    }

    // Institution Title
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text("DAYANANDA SAGAR COLLEGE OF ARTS, SCIENCE AND COMMERCE", 40, startY + 2, {
        align: "center",
        width: 515,
      });

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#2563eb")
      .text("EVENT ATTENDANCE RECORD SHEET", 40, startY + 18, {
        align: "center",
        width: 515,
      });

    // Event Info Box
    const infoBoxY = startY + 38;
    const infoBoxHeight = 44;
    doc
      .rect(40, infoBoxY, 515, infoBoxHeight)
      .fillAndStroke("#f8fafc", "#cbd5e1");

    // Row 1 inside Info Box
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#334155");
    doc.text("Event Name:", 50, infoBoxY + 8);
    doc.font("Helvetica").fillColor("#0f172a").text(event.name || "-", 115, infoBoxY + 8, { width: 200 });

    doc.font("Helvetica-Bold").fillColor("#334155");
    doc.text("Date:", 330, infoBoxY + 8);
    doc.font("Helvetica").fillColor("#0f172a").text(event.date || "-", 365, infoBoxY + 8, { width: 180 });

    // Row 2 inside Info Box
    doc.font("Helvetica-Bold").fillColor("#334155");
    doc.text("Club:", 50, infoBoxY + 24);
    doc.font("Helvetica").fillColor("#0f172a").text(event?.clubId?.name || event?.clubName || "-", 115, infoBoxY + 24, { width: 200 });

    doc.font("Helvetica-Bold").fillColor("#334155");
    doc.text("Venue/Time:", 330, infoBoxY + 24);
    doc.font("Helvetica").fillColor("#0f172a").text(`${event.venue || "Campus"} | ${event.time || "-"}`, 400, infoBoxY + 24, { width: 150 });

    // ================= TABLE =================
    const col = {
      sl: { x: 40, w: 45 },
      name: { x: 85, w: 190 },
      reg: { x: 275, w: 130 },
      sign: { x: 405, w: 150 },
    };

    const drawTableHeader = (headerY) => {
      doc.rect(40, headerY, 515, 22).fillAndStroke("#f1f5f9", "#94a3b8");
      doc.moveTo(col.name.x, headerY).lineTo(col.name.x, headerY + 22).stroke("#94a3b8");
      doc.moveTo(col.reg.x, headerY).lineTo(col.reg.x, headerY + 22).stroke("#94a3b8");
      doc.moveTo(col.sign.x, headerY).lineTo(col.sign.x, headerY + 22).stroke("#94a3b8");

      doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#0f172a");
      doc.text("SL NO.", col.sl.x, headerY + 6, { width: col.sl.w, align: "center" });
      doc.text("STUDENT NAME", col.name.x + 8, headerY + 6, { width: col.name.w - 16, align: "left" });
      doc.text("REGISTRATION NUMBER", col.reg.x + 6, headerY + 6, { width: col.reg.w - 12, align: "center" });
      doc.text("SIGNATURE", col.sign.x, headerY + 6, { width: col.sign.w, align: "center" });
    };

    let currentY = infoBoxY + infoBoxHeight + 10;
    const rowHeight = 22;
    const pageBottomLimit = 760;

    drawTableHeader(currentY);
    currentY += 22;

    for (let i = 0; i < totalRows; i++) {
      if (currentY + rowHeight > pageBottomLimit) {
        doc.addPage();
        doc.fontSize(8).font("Helvetica").fillColor("#64748b").text(
          `Event: ${event.name} | Date: ${event.date || "-"} (Attendance Sheet - Page ${doc.bufferedPageRange().count})`,
          40,
          30,
          { width: 515, align: "right" }
        );
        currentY = 45;
        drawTableHeader(currentY);
        currentY += 22;
      }

      if (i % 2 === 1) {
        doc.rect(40, currentY, 515, rowHeight).fill("#f8fafc");
      }

      doc.rect(40, currentY, 515, rowHeight).stroke("#cbd5e1");
      doc.moveTo(col.name.x, currentY).lineTo(col.name.x, currentY + rowHeight).stroke("#cbd5e1");
      doc.moveTo(col.reg.x, currentY).lineTo(col.reg.x, currentY + rowHeight).stroke("#cbd5e1");
      doc.moveTo(col.sign.x, currentY).lineTo(col.sign.x, currentY + rowHeight).stroke("#cbd5e1");

      doc.fontSize(8.5).font("Helvetica").fillColor("#475569").text(
        String(i + 1),
        col.sl.x,
        currentY + 6,
        { width: col.sl.w, align: "center" }
      );

      currentY += rowHeight;
    }

    if (currentY + 50 > 800) {
      doc.addPage();
      currentY = 50;
    } else {
      currentY += 15;
    }

    doc.fontSize(9).font("Helvetica-Bold").fillColor("#1e293b");
    doc.text("Faculty Coordinator Signature: ___________________", 40, currentY);
    doc.text("Club Lead Signature: ___________________", 330, currentY);

    doc.fontSize(8).font("Helvetica").fillColor("#64748b");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, currentY + 20);
    doc.text("Verified Official Copy", 440, currentY + 20, { align: "right" });

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

  const firstLine = lines[0];
  const isTabDelimited = firstLine.includes("\t") && (!firstLine.includes(",") || firstLine.split("\t").length > firstLine.split(",").length);

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
    const {
      sheetUrl,
      csvData,
      studentsToImport,
      presentStudentIds,
      absentStudentIds,
      applyImmediately,
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event || !req.assignedClubIds.includes(String(event.clubId))) {
      return res.status(404).json({ message: "Event not found or unauthorized" });
    }

    // Recalculate event attendance count & rate
    const updateEventCounts = async () => {
      const totalRegs = await EventRegistration.countDocuments({ eventId });
      const attendedCount = await EventRegistration.countDocuments({ eventId, status: "attended" });
      event.registeredCount = totalRegs;
      event.attendanceCount = attendedCount;
      event.attendanceRate = totalRegs > 0 ? Math.round((attendedCount / totalRegs) * 100) : 0;
      await event.save();
      if (typeof recalculateClubHealth === "function") {
        recalculateClubHealth(event.clubId).catch(() => {});
      }
      return { totalRegs, attendedCount, attendanceRate: event.attendanceRate };
    };

    // Helper: auto-create or find student User and EventRegistration
    const recordStudentAttendance = async (studentInfo, status = "attended") => {
      const regNo = (studentInfo.regNo || "").trim().toUpperCase();
      const email = (studentInfo.email || "").trim().toLowerCase();
      const name = (studentInfo.name || "").trim() || regNo || "Student";
      const department = (studentInfo.department || "").trim();

      // Find or create User
      let studentUser = null;
      if (studentInfo.studentId && mongoose.Types.ObjectId.isValid(studentInfo.studentId)) {
        studentUser = await User.findById(studentInfo.studentId);
      }
      if (!studentUser) {
        const query = [];
        if (regNo && regNo !== "—") query.push({ regNo }, { studentId: regNo });
        if (email && email !== "—") query.push({ email });
        if (query.length > 0) {
          studentUser = await User.findOne({ $or: query });
        }
      }

      if (!studentUser) {
        const fallbackId = regNo && regNo !== "—" ? regNo : `student_${crypto.randomBytes(3).toString("hex")}`;
        const studentEmail = (email && email !== "—") ? email : `${fallbackId.toLowerCase()}@student.college.edu`;
        const dummyPassword = crypto.randomBytes(12).toString("hex");

        studentUser = await User.create({
          name,
          email: studentEmail,
          regNo: (regNo && regNo !== "—") ? regNo : undefined,
          password: dummyPassword,
          role: "student",
          department,
          isActive: true,
          isApproved: true,
        });
      } else if (regNo && regNo !== "—" && !studentUser.regNo) {
        studentUser.regNo = regNo;
        await studentUser.save();
      }

      // Find or create EventRegistration
      let reg = await EventRegistration.findOne({ eventId, studentId: studentUser._id });
      if (!reg) {
        reg = await EventRegistration.create({
          eventId,
          studentId: studentUser._id,
          status,
          confirmationCode: `AUTO-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
        });
      } else {
        reg.status = status;
        await reg.save();
      }

      // Record in Attendance collection
      if (status === "attended") {
        await Attendance.findOneAndUpdate(
          { eventId, studentId: studentUser._id },
          { eventId, studentId: studentUser._id, registrationId: reg._id, checkInTime: new Date() },
          { upsert: true }
        );
      }

      return { student: studentUser, registration: reg };
    };

    // Case 1: Applying structured list of students (e.g. from preview confirm)
    if (Array.isArray(studentsToImport) && studentsToImport.length > 0) {
      let savedCount = 0;
      for (const item of studentsToImport) {
        if (!item) continue;
        const stStatus = item.status === "absent" ? "absent" : "attended";
        await recordStudentAttendance(item, stStatus);
        savedCount++;
      }
      const counts = await updateEventCounts();
      return res.json({
        message: `Successfully saved attendance for ${savedCount} students.`,
        ...counts,
      });
    }

    // Case 2: Direct apply by ID arrays
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

      const counts = await updateEventCounts();
      return res.json({
        message: "Attendance applied successfully",
        ...counts,
      });
    }

    // Case 3: Parse Google Sheet URL or CSV Data
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

    // Column header detection
    const regHeader = headers.find((h) =>
      h.includes("reg") || h.includes("register") || h.includes("usn") || h.includes("roll") || h.includes("studentreg") || h.includes("enroll")
    ) || headers.find((h) => h.includes("id"));

    const emailHeader = headers.find((h) => h.includes("email") || h.includes("mail"));
    const nameHeader = headers.find((h) => h.includes("name") || h.includes("student") || h.includes("participant"));
    const statusHeader = headers.find((h) =>
      h.includes("status") || h.includes("attend") || h.includes("present")
    );
    const deptHeader = headers.find((h) => h.includes("dept") || h.includes("branch") || h.includes("department"));

    const existingRegistrations = await EventRegistration.find({ eventId }).populate("studentId", "name email regNo studentId department");

    const matchedStudents = [];
    const unmatchedRows = [];

    // Pre-cache users to avoid N queries
    const rowRegs = rows.map((r) => (regHeader ? r[regHeader] : "").trim().toUpperCase()).filter(Boolean);
    const rowEmails = rows.map((r) => (emailHeader ? r[emailHeader] : "").trim().toLowerCase()).filter(Boolean);

    const existingUsers = await User.find({
      $or: [
        { regNo: { $in: rowRegs } },
        { studentId: { $in: rowRegs } },
        { email: { $in: rowEmails } },
      ],
    });

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rowReg = (regHeader ? row[regHeader] : "").trim().toUpperCase();
      const rowEmail = (emailHeader ? row[emailHeader] : "").trim().toLowerCase();
      const rowName = (nameHeader ? row[nameHeader] : "").trim();
      const rowDept = (deptHeader ? row[deptHeader] : "").trim();

      // Skip row if it has no usable student info
      if (!rowReg && !rowEmail && !rowName) {
        unmatchedRows.push({
          slNo: idx + 1,
          rawValues: row._values,
          reason: "Row has no Name, Register Number, or Email",
        });
        continue;
      }

      // Determine attendance status (default: attended)
      let isPresent = true;
      if (statusHeader && row[statusHeader]) {
        const val = String(row[statusHeader]).trim().toLowerCase();
        if (["absent", "a", "no", "0", "false", "n", "ab"].includes(val)) {
          isPresent = false;
        } else if (["present", "p", "yes", "1", "true", "attended", "y"].includes(val)) {
          isPresent = true;
        }
      }

      // Check if student is already in existing registrations for this event
      const matchedReg = existingRegistrations.find((r) => {
        const st = r.studentId;
        if (!st) return false;
        if (rowReg && (st.regNo?.toUpperCase() === rowReg || st.studentId?.toUpperCase() === rowReg)) return true;
        if (rowEmail && st.email?.toLowerCase() === rowEmail) return true;
        if (rowName && st.name?.toLowerCase() === rowName.toLowerCase()) return true;
        return false;
      });

      if (matchedReg && matchedReg.studentId) {
        matchedStudents.push({
          slNo: idx + 1,
          registrationId: matchedReg._id,
          studentId: matchedReg.studentId._id,
          name: matchedReg.studentId.name,
          regNo: matchedReg.studentId.regNo || matchedReg.studentId.studentId || rowReg || "—",
          email: matchedReg.studentId.email || rowEmail || "—",
          department: matchedReg.studentId.department || rowDept,
          status: isPresent ? "attended" : "absent",
          previousStatus: matchedReg.status,
          isNewRegistration: false,
        });
      } else {
        // Direct attendee (not pre-registered)
        const foundUser = existingUsers.find((u) => {
          if (rowReg && (u.regNo?.toUpperCase() === rowReg || u.studentId?.toUpperCase() === rowReg)) return true;
          if (rowEmail && u.email?.toLowerCase() === rowEmail) return true;
          return false;
        });

        matchedStudents.push({
          slNo: idx + 1,
          studentId: foundUser?._id || null,
          name: foundUser?.name || rowName || rowReg || "Student",
          regNo: foundUser?.regNo || rowReg || "—",
          email: foundUser?.email || rowEmail || `${(rowReg || 'student_' + (idx + 1)).toLowerCase()}@student.college.edu`,
          department: foundUser?.department || rowDept,
          status: isPresent ? "attended" : "absent",
          previousStatus: "not_registered",
          isNewRegistration: true,
        });
      }
    }

    // Direct apply immediately (default when applyImmediately === true or not explicitly false)
    if (applyImmediately !== false) {
      let savedCount = 0;
      for (const item of matchedStudents) {
        await recordStudentAttendance(item, item.status);
        savedCount++;
      }
      const counts = await updateEventCounts();
      return res.json({
        message: `Processed ${rows.length} rows. Recorded attendance for ${savedCount} students.`,
        totalInSheet: rows.length,
        matchedCount: matchedStudents.length,
        preRegisteredCount: matchedStudents.filter((s) => !s.isNewRegistration).length,
        newAttendeesCount: matchedStudents.filter((s) => s.isNewRegistration).length,
        unmatchedCount: unmatchedRows.length,
        matchedStudents,
        unmatchedRows,
        applied: true,
        ...counts,
      });
    }

    // Preview mode
    const preRegisteredCount = matchedStudents.filter((s) => !s.isNewRegistration).length;
    const newAttendeesCount = matchedStudents.filter((s) => s.isNewRegistration).length;

    res.json({
      message: `Parsed ${rows.length} rows. Found ${preRegisteredCount} registered students and ${newAttendeesCount} new attendees ready to add.`,
      totalInSheet: rows.length,
      matchedCount: matchedStudents.length,
      preRegisteredCount,
      newAttendeesCount,
      unmatchedCount: unmatchedRows.length,
      matchedStudents,
      unmatchedRows,
      applied: false,
    });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ message: err.message || "Failed to import attendance data" });
  }
});

export default router;
