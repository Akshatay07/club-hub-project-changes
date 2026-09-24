import express from "express";
import Event from "../models/Event.js";
import Club from "../models/Club.js";
import EventRegistration from "../models/EventRegistration.js";
import auth from "../middleware/auth.js";
import permit from "../middleware/role.js";
import { recalculateClubHealth } from "../services/healthService.js";
import { notifyMany } from "../services/notificationService.js";
import { getIo } from "../socket.js";
import { fileToMeta } from "../utils/files.js";
import { createToken } from "../utils/auth.js";
import upload from "../middleware/upload.js";
import Signature from "../models/Signature.js";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const router = express.Router();

// ACCESS CHECK
async function ensureEventAccess(user, event) {
  if (user.role === "admin") return true;

  if (user.role === "faculty") {
    return (user.assignedClubs || []).some(
      (clubId) => String(clubId) === String(event.clubId)
    );
  }

  return false;
}

// ================= GET EVENTS =================
router.get("/", auth, async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "faculty") {
      query.clubId = { $in: req.user.assignedClubs || [] };
    }

    if (req.user.role === "student") {
      console.log("ROLE:", req.user.role);
console.log("QUERY:", query);
query.status = { $regex: /^approved$/i };
}
    

    const events = await Event.find(query)
      .populate("clubId", "name healthStatus")
      .populate("facultyId", "name email")
      .sort({ date: 1, time: 1 });

    const userId = req.user._id;

const registrations = await EventRegistration.find({
  studentId: userId,
});

    const registrationMap = {};
    registrations.forEach((r) => {
      registrationMap[r.eventId.toString()] = r.status;
    });

    // Auto-sync legacy events in background if needed
    Event.updateMany(
      { status: "approved", approvalStage: { $ne: "Approved" } },
      { $set: { approvalStage: "Approved" } }
    ).catch(() => {});

    Event.updateMany(
      { status: "rejected", approvalStage: { $ne: "Rejected" } },
      { $set: { approvalStage: "Rejected" } }
    ).catch(() => {});

    const globalSignatures = await Signature.find();
    const globalSigMap = {};
    globalSignatures.forEach((s) => {
      if (s.stageKey && s.signatureUrl) {
        globalSigMap[s.stageKey] = s.signatureUrl;
      }
    });

    res.json(
      events.map((event) => {
        const obj = event.toObject();
        let stage = obj.approvalStage || "Event Coordinators";
        if (obj.status === "approved" && stage !== "Approved") {
          stage = "Approved";
        } else if (obj.status === "rejected" && stage !== "Rejected") {
          stage = "Rejected";
        }

        const mergedStageSignatures = {
          ...globalSigMap,
          ...(obj.stageSignatures || {}),
        };

        return {
          ...obj,
          approvalStage: stage,
          stageSignatures: mergedStageSignatures,
          clubName: event.clubId?.name || "",
          facultyName: event.facultyId?.name || "",
          registrationStatus:
            registrationMap[event._id.toString()] || "not_registered",
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ================= CREATE EVENT =================
router.post(
  "/",
  auth,
  permit("admin", "faculty"),
  upload.array("attachments", 10),
  async (req, res) => {
    try {
      let { clubId } = req.body;

      if (req.user.role === "faculty") {
        clubId = req.user.assignedClubs?.[0];
      }

      const club = await Club.findById(clubId);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      const qrCodeToken = createToken();

      // convert form-data → nested object (no logic change)
      if (!req.body.resourcePerson) {
        req.body.resourcePerson = {
          name: req.body["resourcePerson[name]"],
          organization: req.body["resourcePerson[organization]"],
        };

        req.body.facultyParticipants = {
          internal: req.body["facultyParticipants[internal]"],
          external: req.body["facultyParticipants[external]"],
        };

        req.body.studentParticipants = {
          internal: req.body["studentParticipants[internal]"],
          external: req.body["studentParticipants[external]"],
        };
      }

      const event = await Event.create({
        name: req.body.name,
        description: req.body.description || "",
        clubId,
        facultyId: req.user._id,

        date: req.body.date,
        time: req.body.time,
        endTime: req.body.endTime || "",
        location: req.body.location || "",

        type: req.body.type || "",
        department: req.body.department || "",
        venue: req.body.venue || "",

        resourcePerson: {
          name: req.body.resourcePerson?.name || "",
          organization: req.body.resourcePerson?.organization || "",
        },

        topicsCovered: req.body.topicsCovered || "",

        facultyParticipants: {
          internal: Number(req.body.facultyParticipants?.internal || 0),
          external: Number(req.body.facultyParticipants?.external || 0),
        },

        studentParticipants: {
          internal: Number(req.body.studentParticipants?.internal || 0),
          external: Number(req.body.studentParticipants?.external || 0),
        },

        facultyCoordinator: req.body.facultyCoordinator || "",
        studentCoordinator: req.body.studentCoordinator || "",

        agenda: req.body.agenda || "",
        summary: req.body.summary || "",

        certificatesPrinted: req.body.certificatesPrinted === "true",
        feedbackCollected: req.body.feedbackCollected === "true",
        attendanceAttached: req.body.attendanceAttached === "true",

        maxCapacity: Number(req.body.maxCapacity || 100),
        planned: req.body.planned !== "false",
        budgetRequested: Number(req.body.budgetRequested || 0),
        budgetSpent: Number(req.body.budgetSpent || 0),

status: (req.user.role === "admin" ? "approved" : "pending").toLowerCase(),
        qrCodeToken,

        attachments: (req.files || []).map((file, index) => {
          let label = "file";

          if (req.body.brochureLabel && index === req.files.length - 1) {
            label = "brochure";
          }

          return {
            ...fileToMeta(file, req.user._id, "faculty"),
            label,
          };
        }),
      });

      await Club.findByIdAndUpdate(clubId, { $inc: { eventCount: 1 } });
      await recalculateClubHealth(clubId);

      getIo().emit("event:created", event);

      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ================= UPDATE EVENT =================
router.put(
  "/:id",
  auth,
  permit("admin", "faculty"),
  upload.array("attachments", 10), // ✅ IMPORTANT
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);

if (!event || !(await ensureEventAccess(req.user, event))) {
  return res.status(404).json({ message: "Event not found" });
}

// 🔥 FREEZE EDIT AFTER APPROVAL
if (event.status === "approved" && req.user.role !== "admin") {
  return res.status(403).json({
    message: "Approved events cannot be edited",
  });
}



      if (!event || !(await ensureEventAccess(req.user, event))) {
        return res.status(404).json({ message: "Event not found" });
      }

      const oldStatus = event.status;

      // ✅ UPDATE FIELDS MANUALLY (SAFE)
      event.name = req.body.name || event.name;
      event.type = req.body.type || "";
      event.department = req.body.department || "";
      event.venue = req.body.venue || "";

      event.date = req.body.date || event.date;
      event.time = req.body.time || event.time;

      event.topicsCovered = req.body.topicsCovered || "";

      event.resourcePerson = {
        name: req.body["resourcePerson[name]"] || "",
        organization: req.body["resourcePerson[organization]"] || "",
      };

      event.facultyParticipants = {
        internal: Number(req.body["facultyParticipants[internal]"] || 0),
        external: Number(req.body["facultyParticipants[external]"] || 0),
      };

      event.studentParticipants = {
        internal: Number(req.body["studentParticipants[internal]"] || 0),
        external: Number(req.body["studentParticipants[external]"] || 0),
      };

      event.facultyCoordinator = req.body.facultyCoordinator || "";
      event.studentCoordinator = req.body.studentCoordinator || "";

      event.agenda = req.body.agenda || "";
      event.summary = req.body.summary || "";

      event.budgetSpent = Number(req.body.budgetSpent || 0);

      event.certificatesPrinted = req.body.certificatesPrinted === "true";
      event.feedbackCollected = req.body.feedbackCollected === "true";
      event.attendanceAttached = req.body.attendanceAttached === "true";

      // ✅ FILES (OPTIONAL)
      if (req.files && req.files.length > 0) {
        const newFiles = req.files.map((file) =>
          fileToMeta(file, req.user._id, "faculty")
        );
        event.attachments.push(...newFiles);
      }

      await event.save();

      // existing logic stays
      if (oldStatus !== event.status) {
        const registrations = await EventRegistration.find({
          eventId: event._id,
          status: { $ne: "cancelled" },
        }).populate("studentId", "email name");

        const studentIds = registrations.map((r) => r.studentId._id);

        await notifyMany(studentIds, {
          title: "Event status updated",
          message: `${event.name} is now ${event.status}`,
        });
      }

      await recalculateClubHealth(event.clubId);

      getIo().emit("event:updated", event);

      res.json(event);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// ================= DELETE =================
router.delete("/:id", auth, permit("admin", "faculty"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.deleteOne();
    await Club.findByIdAndUpdate(event.clubId, { $inc: { eventCount: -1 } });

    await recalculateClubHealth(event.clubId);

    getIo().emit("eventDeleted", req.params.id);

    res.json({ message: "Deleted successfully" });
  } catch {
    res.status(500).json({ message: "Delete failed" });
  }
});

// ================= SUBMITTED REPORTS =================
router.get(
  "/submitted-reports",
  auth,
  permit("admin"),
  async (req, res) => {
    try {
      const reports = await Event.find({
        reportSubmitted: true,
      })
        .populate("clubId", "name")
        .populate("facultyId", "name email")
        .sort({ updatedAt: -1 });

      res.json(reports);
    } catch (err) {
      console.error("REPORT ERROR:", err);

      res.status(500).json({
        message: err.message,
      });
    }
  }
);

// ================= GET SINGLE EVENT =================
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("clubId", "name")
      .populate("facultyId", "name email");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= REGISTER EVENT =================
router.post("/:id/register", auth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    // check already registered
    const existing = await EventRegistration.findOne({
      eventId,
      studentId: userId,
    });

    if (existing) {
      return res.status(400).json({
        message: "Already registered",
      });
    }

    // create registration
    await EventRegistration.create({
      eventId,
      studentId: userId,
      status: "registered",
    });

    // 🔥 UPDATE COUNT (THIS WAS MISSING)
    await Event.findByIdAndUpdate(eventId, {
      $inc: { registeredCount: 1 },
    });

    // 🔥 REALTIME UPDATE
    getIo().emit("event:updated");

    res.json({ message: "Registered successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/club/:id/stats", async (req, res) => {
  const clubId = req.params.id;

  const members = await User.countDocuments({ clubId });

  const feedbacks = await Feedback.find({ clubId });

  const rating =
    feedbacks.reduce((a, b) => a + b.rating, 0) /
    (feedbacks.length || 1);

  res.json({
    members,
    rating: Number(rating.toFixed(1)),
  });
});

router.patch(
  "/:id/report",
  auth,
  permit("admin", "faculty"),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const updated = await Event.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      ).populate("clubId", "name").populate("facultyId", "name email");

      getIo().emit("event:updated", updated);

      res.json(updated);
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

// ================= UPLOAD EVENT PHOTOS =================
router.post(
  "/:id/photos",
  auth,
  permit("admin", "faculty"),
  upload.array("photos", 10),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No photos uploaded" });
      }

      let captions = [];
      if (req.body.captions) {
        if (Array.isArray(req.body.captions)) {
          captions = req.body.captions;
        } else if (typeof req.body.captions === "string") {
          try {
            const parsed = JSON.parse(req.body.captions);
            if (Array.isArray(parsed)) {
              captions = parsed;
            } else {
              captions = [req.body.captions];
            }
          } catch {
            captions = [req.body.captions];
          }
        }
      }

      const newPhotos = req.files.map((file, idx) => {
        const rawCaption = (captions[idx] || req.body.caption || "").trim();
        const fallbackCaption = file.originalname.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const caption = rawCaption || (fallbackCaption.length > 2 ? fallbackCaption : "Event Photograph");

        return {
          fileName: file.filename,
          originalName: file.originalname,
          url: `/uploads/${file.filename}`,
          caption: caption,
          size: file.size,
          uploadedBy: req.user._id,
          uploadedAt: new Date(),
        };
      });

      if (!event.eventPhotos) {
        event.eventPhotos = [];
      }
      event.eventPhotos.push(...newPhotos);
      event.photographsAttached = "Attached";

      await event.save();
      getIo().emit("event:updated", event);

      res.json({
        message: "Photos uploaded successfully",
        photos: event.eventPhotos,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= UPDATE EVENT PHOTO CAPTION =================
router.patch(
  "/:id/photos/:photoId",
  auth,
  permit("admin", "faculty"),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const photo = (event.eventPhotos || []).find(
        (p) => String(p._id) === String(req.params.photoId)
      );

      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      if (req.body.caption !== undefined) {
        photo.caption = (req.body.caption || "").trim() || "Event Photograph";
      }

      await event.save();
      getIo().emit("event:updated", event);

      res.json({
        message: "Photo caption updated successfully",
        photos: event.eventPhotos,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= DELETE EVENT PHOTO =================
router.delete(
  "/:id/photos/:photoId",
  auth,
  permit("admin", "faculty"),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      event.eventPhotos = (event.eventPhotos || []).filter(
        (p) => String(p._id) !== String(req.params.photoId)
      );

      if (event.eventPhotos.length === 0) {
        event.photographsAttached = "No";
      }

      await event.save();
      getIo().emit("event:updated", event);

      res.json({
        message: "Photo deleted successfully",
        photos: event.eventPhotos,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= UPLOAD/UPDATE BROCHURE =================
router.post(
  "/:id/brochure",
  auth,
  permit("admin", "faculty"),
  upload.single("brochure"),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Brochure file is required" });
      }

      // Mark existing brochure attachments as deleted/replace
      (event.attachments || []).forEach((att) => {
        if (att.label === "brochure") {
          att.isDeleted = true;
        }
      });

      const brochureMeta = {
        ...fileToMeta(req.file, req.user._id, "faculty"),
        label: "brochure",
      };

      if (!event.attachments) event.attachments = [];
      event.attachments.push(brochureMeta);

      await event.save();
      getIo().emit("event:updated", event);

      res.json({
        message: "Brochure uploaded successfully",
        brochure: brochureMeta,
        attachments: event.attachments,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= UPLOAD MISCELLANEOUS ATTACHMENTS =================
router.post(
  "/:id/miscellaneous",
  auth,
  permit("admin", "faculty"),
  upload.array("files", 10),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "At least one file is required" });
      }

      if (!event.attachments) event.attachments = [];

      const newMetas = req.files.map((file) => ({
        ...fileToMeta(file, req.user._id, req.user.role),
        label: "miscellaneous",
      }));

      event.attachments.push(...newMetas);

      await event.save();
      getIo().emit("event:updated", event);

      res.json({
        message: "Miscellaneous attachment(s) uploaded successfully",
        newAttachments: newMetas,
        attachments: event.attachments,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= DELETE ATTACHMENT BY ID (FACULTY/ADMIN) =================
router.delete(
  "/:eventId/attachments/:fileId",
  auth,
  permit("admin", "faculty"),
  async (req, res) => {
    try {
      const { eventId, fileId } = req.params;
      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const fileIndex = (event.attachments || []).findIndex(
        (f) => String(f._id) === String(fileId)
      );

      if (fileIndex === -1) {
        return res.status(404).json({ message: "Attachment file not found" });
      }

      event.attachments[fileIndex].isDeleted = true;
      event.attachments[fileIndex].deletedAt = new Date();
      event.attachments[fileIndex].deletedBy = req.user._id;

      await event.save();
      getIo().emit("event:updated", event);

      res.json({
        message: "Attachment deleted successfully",
        attachments: event.attachments,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ================= DELETE SIGNED ATTENDANCE SHEET =================
router.delete(
  "/:eventId/signed-sheet/:sheetId",
  auth,
  permit("admin", "faculty"),
  async (req, res) => {
    try {
      const { eventId, sheetId } = req.params;
      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      event.signedAttendanceSheets = (event.signedAttendanceSheets || []).filter(
        (s) => String(s._id) !== String(sheetId)
      );

      event.attendanceAttached = (event.signedAttendanceSheets.length > 0) ? "Yes" : "No";

      await event.save();
      getIo().emit("event:updated", event);

      res.json({
        message: "Signed attendance sheet deleted successfully",
        sheets: event.signedAttendanceSheets,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);



router.patch(
  "/:id/submit-report",
  auth,
  permit("admin", "faculty"),
  async (req, res) => {
    try {
      const updated = await Event.findByIdAndUpdate(
        req.params.id,
        {
          reportSubmitted: true,
          reportApproved: false,
          reportRejected: false,
        },
        { new: true }
      ).populate("clubId", "name").populate("facultyId", "name email");

      getIo().emit("event:updated", updated);

      res.json(updated);
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);




router.patch("/:id/approve-report", auth, permit("admin"), async (req, res) => {
  const report = await Event.findByIdAndUpdate(
    req.params.id,
    {
      reportApproved: true,
      reportRejected: false,
    },
    { new: true }
  );

  res.json(report);
});

router.patch("/:id/reject-report", auth, permit("admin"), async (req, res) => {
  const report = await Event.findByIdAndUpdate(
    req.params.id,
    {
      reportApproved: false,
      reportRejected: true,
    },
    { new: true }
  );

  res.json(report);
});


router.get(
  "/admin/media",
  auth,
  permit("admin"),
  async (req, res) => {
    try {
      const events = await Event.find({
        attachments: { $exists: true, $ne: [] }
      })
        .populate("clubId", "name")
        .sort({ updatedAt: -1 });

      res.json(events);

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.get(
  "/admin/trash",
  auth,
  permit("admin"),
  async (req, res) => {
    try {
      const events = await Event.find({})
        .populate("clubId", "name");

      const deletedFiles = [];

      events.forEach((event) => {
        (event.attachments || []).forEach((file) => {
          if (file.isDeleted) {
            deletedFiles.push({
              eventId: event._id,
              eventName: event.name,
              file,
            });
          }
        });
      });

      res.json(deletedFiles);

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);


router.put(
  "/:eventId/file/:fileId/restore",
  auth,
  permit("admin"),
  async (req, res) => {
    try {
      const { eventId, fileId } = req.params;

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          message: "Event not found",
        });
      }

      const file = event.attachments.id(fileId);

      if (!file) {
        return res.status(404).json({
          message: "File not found",
        });
      }

      file.isDeleted = false;
      file.deletedAt = null;
      file.deletedBy = null;

      await event.save();

      res.json({
        message: "File restored successfully",
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);


router.delete(
  "/:eventId/file/:fileId/permanent",
  auth,
  permit("admin"),
  async (req, res) => {
    try {
      const { eventId, fileId } = req.params;

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          message: "Event not found",
        });
      }

      event.attachments = event.attachments.filter(
        (f) => String(f._id) !== String(fileId)
      );

      await event.save();

      res.json({
        message: "File permanently deleted",
      });

    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

router.delete(
  "/:eventId/file/:fileId",
  auth,
  permit("admin"),
  async (req, res) => {
    try {
      const { eventId, fileId } = req.params;

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          message: "Event not found",
        });
      }

      const file = event.attachments.id(fileId);

      if (!file) {
        return res.status(404).json({
          message: "File not found",
        });
      }

      file.isDeleted = true;
      file.deletedAt = new Date();
      file.deletedBy = req.user._id;

      await event.save();

      res.json({
        message: "Moved to trash",
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

// Helper function to generate Student Feedback Form PDF
async function renderStudentFeedbackPdf(event, res) {
  const doc = new PDFDocument({ margin: 28, size: "A4", autoFirstPage: true });

  res.setHeader("Content-Type", "application/pdf");
  const sanitizedName = (event.name || "event").replace(/[^a-zA-Z0-9-_]/g, "_");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=feedback-form-${sanitizedName}.pdf`
  );

  doc.pipe(res);

  const candidatePaths = [
    path.resolve(process.cwd(), "dscasc_logo.png"),
    path.resolve(process.cwd(), "backend", "dscasc_logo.png"),
    path.resolve(process.cwd(), "..", "backend", "dscasc_logo.png"),
    path.resolve(process.cwd(), "public", "dscasc_logo.png")
  ];
  const actualLogo = candidatePaths.find((p) => fs.existsSync(p) && fs.statSync(p).size > 0);

  // Header Section
  let startY = 24;
  if (actualLogo) {
    try {
      doc.image(actualLogo, 35, startY, { width: 44 });
    } catch (e) {
      console.log("Logo load error:", e.message);
    }
  }

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text("DAYANANDA SAGAR COLLEGE OF ARTS, SCIENCE AND COMMERCE", 40, startY + 2, {
      align: "center",
      width: 515,
    });

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#333333")
    .text("College affiliated to Bangalore University (BU),", 40, startY + 16, {
      align: "center",
      width: 515,
    });

  doc
    .fontSize(7.5)
    .font("Helvetica")
    .text("Approved by AICTE and UGC, Accredited by NAAC with 'B+' grade, and ISO 9001-2015 Certified Institution", 40, startY + 26, {
      align: "center",
      width: 515,
    });

  doc
    .fontSize(10.5)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text("Internal Quality Assurance Cell", 40, startY + 37, {
      align: "center",
      width: 515,
    });

  doc
    .fontSize(11.5)
    .font("Helvetica-Bold")
    .text("STUDENT FEEDBACK FORM", 40, startY + 52, {
      align: "center",
      width: 515,
    });

  let curY = startY + 74;

  // Student & Activity Info Fields
  doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#000000");

  doc.text("Name of the Student: ", 40, curY, { continued: true });
  doc.font("Helvetica").text("________________________        ", { continued: true });
  doc.font("Helvetica-Bold").text("UUCMS No. ", { continued: true });
  doc.font("Helvetica").text("_______________________");

  curY += 17;

  doc.font("Helvetica-Bold").text("Courese: ", 40, curY, { continued: true });
  doc.font("Helvetica").text("____________        ", { continued: true });
  doc.font("Helvetica-Bold").text("Sem: ", { continued: true });
  doc.font("Helvetica").text("________        ", { continued: true });
  doc.font("Helvetica-Bold").text("Section: ", { continued: true });
  doc.font("Helvetica").text("________");

  curY += 17;

  const activityName = event.name || "________________________________________________________";
  doc.font("Helvetica-Bold").text("Name of Activity: ", 40, curY, { continued: true });
  doc.font("Helvetica").text(activityName);

  curY += 17;

  const organizedBy = (event.clubId?.name || event.department || "") || "___________________________";
  const eventDate = event.date || "_______________________";
  doc.font("Helvetica-Bold").text("Organized by: ", 40, curY, { continued: true });
  doc.font("Helvetica").text(`${organizedBy}        `, { continued: true });
  doc.font("Helvetica-Bold").text("Date: ", { continued: true });
  doc.font("Helvetica").text(eventDate);

  curY += 17;

  const resourcePerson = event.resourcePerson1?.name || "_____________________________";
  doc.font("Helvetica-Bold").text("Resource Person: ", 40, curY, { continued: true });
  doc.font("Helvetica").text(`${resourcePerson}        `, { continued: true });
  doc.font("Helvetica-Bold").text("Programme/Class: ", { continued: true });
  doc.font("Helvetica").text("____________");

  curY += 21;

  // Rating Scale
  doc
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text("Rating Scale: 5 – Excellent | 4 – Very Good | 3 – Good | 2 – Satisfactory | 1 – Needs Improvement", 40, curY);

  curY += 17;

  // Parameters Table Header
  const colX = { no: 40, param: 65, p5: 380, p4: 415, p3: 450, p2: 485, p1: 520 };

  doc.fontSize(9.5).font("Helvetica-Bold");
  doc.text("No.", colX.no, curY);
  doc.text("Feedback Parameter", colX.param, curY);
  doc.text("5", colX.p5 + 2, curY);
  doc.text("4", colX.p4 + 2, curY);
  doc.text("3", colX.p3 + 2, curY);
  doc.text("2", colX.p2 + 2, curY);
  doc.text("1", colX.p1 + 2, curY);

  curY += 16;

  const parameters = [
    "Relevance of the activity",
    "Quality and clarity of content delivered",
    "Effectiveness of the resource person/facilitator",
    "Interaction and student participation",
    "Achievement of the intended learning outcomes",
    "Improvement in my knowledge/skills through the activity",
    "Ability to apply the learning gained",
    "Organization and coordination of the activity",
    "Overall satisfaction with the activity",
  ];

  doc.font("Helvetica").fontSize(9);
  parameters.forEach((param, idx) => {
    doc.text(`${idx + 1}`, colX.no, curY);
    doc.text(param, colX.param, curY, { width: 300 });

    [colX.p5, colX.p4, colX.p3, colX.p2, colX.p1].forEach((x) => {
      doc.rect(x, curY + 1, 9, 9).lineWidth(0.8).strokeColor("#000000").stroke();
    });

    curY += 18;
  });

  curY += 10;

  // Learning Outcome / Student Response Section
  doc.font("Helvetica-Bold").fontSize(10).text("Learning Outcome / Student Response", 40, curY);
  curY += 16;

  doc.font("Helvetica-Bold").fontSize(9).text("Important learning/skill gained from this activity:", 40, curY);
  curY += 24;
  doc.moveTo(40, curY).lineTo(550, curY).lineWidth(0.5).strokeColor("#aaaaaa").stroke();
  curY += 16;

  doc.font("Helvetica-Bold").fontSize(9).text("Suggestion for improvement / future activity:", 40, curY);
  curY += 24;
  doc.moveTo(40, curY).lineTo(550, curY).lineWidth(0.5).strokeColor("#aaaaaa").stroke();
  curY += 18;

  doc.font("Helvetica-Bold").fontSize(9).text("Would you recommend similar activities in future? ", 40, curY);
  doc.font("Helvetica").fontSize(9).text("[  ] Yes     [  ] No", 270, curY);
  curY += 18;

  doc.font("Helvetica-Bold").fontSize(9).text("Overall Rating: ", 40, curY);
  doc.font("Helvetica").fontSize(9).text("[  ] Excellent   [  ] Very Good   [  ] Good   [  ] Satisfactory   [  ] Needs Improvement", 110, curY);
  curY += 24;

  doc.font("Helvetica-Bold").fontSize(9).text("Signature of the Student: ___________________________", 40, curY);

  // Footer (Well within single page limits)
  const footerY = 755;
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text("Postal Address: 1st Stage, Kumaraswamy Layout, Bengaluru, Karnataka 560111", 40, footerY, { align: "center", width: 515 });

  doc
    .fontSize(8)
    .font("Helvetica")
    .text("Ph: 080-42161767        Email ID: principal-dscasc@dayanandasagar.edu", 40, footerY + 11, { align: "center", width: 515 });

  doc
    .fontSize(8)
    .font("Helvetica")
    .text("Website: www.dscasc.edu.in", 40, footerY + 22, { align: "center", width: 515 });

  doc.end();
}

router.get("/:eventId/feedback-pdf", auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).populate("clubId", "name");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    await renderStudentFeedbackPdf(event, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message });
    }
  }
});

export default router;