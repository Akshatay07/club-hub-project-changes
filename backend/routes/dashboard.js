import express from "express";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import Complaint from "../models/Complaint.js";
import ProofSubmission from "../models/ProofSubmission.js";
import EventRegistration from "../models/EventRegistration.js";
import Feedback from "../models/Feedback.js";
import auth from "../middleware/auth.js";
import permit from "../middleware/role.js";

const router = express.Router();

function clubFilterForUser(user) {
  return user.role === "faculty" ? { _id: { $in: user.assignedClubs || [] } } : {};
}

function scopedClubIds(user, clubs) {
  if (user.role === "faculty") {
    return clubs.map((club) => club._id);
  }
  return clubs.map((club) => club._id);
}

router.get("/metrics", async (req, res) => {
  try {
    const totalClubs = await Club.countDocuments();
    const eventsThisMonth = await Event.countDocuments();
    const pendingApprovals = await Event.countDocuments({
      status: "pending",
    });

    const feedbacks = await Feedback.find();

    const avgRating =
      feedbacks.length > 0
        ? (
            feedbacks.reduce(
              (sum, item) => sum + item.rating,
              0
            ) / feedbacks.length
          ).toFixed(1)
        : "0.0";

    res.json({
      totalClubs,
      eventsThisMonth,
      pendingApprovals,
      avgRating,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});


router.get("/quick-stats", auth, async (req, res) => {
  try {
    const clubs = await Club.find(clubFilterForUser(req.user));
    const clubIds = scopedClubIds(req.user, clubs);
    const events = await Event.find(req.user.role === "faculty" ? { clubId: { $in: clubIds } } : {});
    const eventIds = events.map((event) => event._id);
    const reportsPending = await ProofSubmission.countDocuments({
      ...(req.user.role === "faculty" ? { clubId: { $in: clubIds } } : {}),
      status: "submitted",
    });

    res.json({
      upcomingEvents: events.filter((event) => ["approved", "postponed"].includes(event.status)).length,
      reportsPending,
      totalParticipants: await EventRegistration.countDocuments(eventIds.length ? { eventId: { $in: eventIds } } : { _id: null }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/monthly-events", auth, async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const clubs = await Club.find(clubFilterForUser(req.user));
    const clubIds = scopedClubIds(req.user, clubs);
    const filter = req.user.role === "faculty" ? { clubId: { $in: clubIds } } : {};
    const events = await Event.find(filter);

    const result = months.map((month, index) => {
      const monthEvents = events.filter((event) => {
        const eventDate = new Date(event.date);
        return !Number.isNaN(eventDate.getTime()) && eventDate.getFullYear() === year && eventDate.getMonth() === index;
      });

      return {
        month,
        all: monthEvents.length,
        pending: monthEvents.filter((event) => event.status === "pending").length,
        confirmed: monthEvents.filter((event) => event.status === "approved").length,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/calendar/:date", auth, async (req, res) => {
  try {
    const clubs = await Club.find(clubFilterForUser(req.user));
    const clubIds = scopedClubIds(req.user, clubs);
    const events = await Event.find({
      ...(req.user.role === "faculty" ? { clubId: { $in: clubIds } } : {}),
      date: req.params.date,
    }).populate("clubId", "name");

    res.json({
      date: req.params.date,
      events: events.map((event) => ({
        _id: event._id,
        time: event.time,
        title: event.name,
        club: event.clubId?.name || "",
        status: event.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/media-stats", auth, permit("admin"), async (_req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });

    let totalFiles = 0;
    let recentFiles = [];

    events.forEach((event) => {
      if (!event.attachments) return;

      totalFiles += event.attachments.length;

      event.attachments.forEach((file) => {
        recentFiles.push({
          name: file.originalName,
          url: file.url,
          uploadedAt: file.uploadedAt,
        });
      });
    });

    // sort latest first + limit 5
    recentFiles = recentFiles
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, 5);

    res.json({
      totalFiles,
      recentFiles,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/budget", auth, async (req, res) => {
  try {
    const clubs = await Club.find(clubFilterForUser(req.user));
    res.json({
      budgetTotal: clubs.reduce((sum, club) => sum + club.budgetAllocated, 0),
      budgetUsed: clubs.reduce((sum, club) => sum + club.budgetUsed, 0),
      photosUploaded: 0,
      reportsPending: await ProofSubmission.countDocuments({ status: "submitted" }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/faculty-budget", auth, async (req, res) => {
  try {
    const filter = req.user.role === "faculty" ? { _id: { $in: req.user.assignedClubs || [] } } : {};
    const clubs = await Club.find(filter).populate("facultyIds", "name");
    const result = clubs.flatMap((club) =>
      club.facultyIds.map((faculty) => ({
        _id: faculty._id,
        name: faculty.name,
        totalBudget: club.budgetUsed,
        totalEvents: club.eventCount,
      }))
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/health", auth, async (req, res) => {
  try {
    const clubs = await Club.find(clubFilterForUser(req.user));
    res.json(clubs.map((club) => club.toDashboardCard()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/complaints-feed", auth, async (req, res) => {
  try {
    const filter =
      req.user.role === "faculty"
        ? { clubId: { $in: req.user.assignedClubs || [] } }
        : {};
    const complaints = await Complaint.find(filter).sort({ createdAt: -1 }).limit(20);
const feedbacks = await Feedback.find()
  .populate("clubId", "name")
  .sort({ createdAt: -1 })
  .limit(10);

    res.json([
      ...complaints.map((item) => ({
        _id: item._id,
        type: "complaint",
        message: item.content,
        createdAt: item.createdAt,
      })),
      ...feedbacks.map((item) => ({
  _id: item._id,
  type: "rating",
  message: `${item.clubId?.name || "Club"} received ${item.rating}/5 rating. ${item.comment || ""}`,
  createdAt: item.createdAt,
})),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
