import express from "express";
import Complaint from "../models/Complaint.js";
import auth from "../middleware/auth.js";
import permit from "../middleware/role.js";
import { createNotification } from "../services/notificationService.js";
import { getIo } from "../socket.js";

const router = express.Router();

router.get("/", auth, permit("admin", "faculty"), async (req, res) => {
  try {
    const filter =
      req.user.role === "faculty"
        ? { clubId: { $in: req.user.assignedClubs || [] } }
        : {};
    const complaints = await Complaint.find(filter)
      .populate("studentId", "name email studentId")
      .populate("clubId", "name")
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", auth, permit("student"), async (req, res) => {
  try {
    const complaint = await Complaint.create({
      studentId: req.user._id,
      clubId: req.body.clubId || null,
      eventId: req.body.eventId || null,
      content: req.body.content,
      severity: req.body.severity || "medium",
    });

    await createNotification({
      userId: req.user._id,
      title: "Complaint submitted",
      message: "Your complaint has been sent to administrators",
      type: "success",
      metadata: { complaintId: String(complaint._id) },
    });

    getIo().to("admin").emit("complaint:new", complaint);
    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id/status", auth, permit("admin", "faculty"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "reviewing", "resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("studentId", "name email studentId")
      .populate("clubId", "name");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    getIo().emit("complaint:updated", complaint);
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", auth, permit("admin"), async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    getIo().emit("complaint:deleted", req.params.id);
    res.json({ message: "Complaint deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
