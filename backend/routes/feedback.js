import express from "express";
import Feedback from "../models/Feedback.js";
import Event from "../models/Event.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth);

// GET feedback for logged user club (or all)
router.get("/", async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
  .populate("studentId", "name email")
  .populate("eventId", "name date")
  .populate("clubId", "name");

    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE feedback
router.post("/", async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const feedback = await Feedback.create({
      studentId: req.user.id,
      clubId: event.clubId,
      eventId: event._id,
      rating,
      comment,
    });

    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;