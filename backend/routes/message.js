import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/users/:id", async (req, res) => {
  try {
    const currentUser = await User.findById(req.params.id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let allowedRoles = [];

    if (currentUser.role === "admin") {
  allowedRoles = ["faculty", "student", "admin"];

    } else if (currentUser.role === "faculty") {
      allowedRoles = ["faculty", "student", "admin"];
    } else if (currentUser.role === "student") {
      allowedRoles = ["faculty"];
    }

    const users = await User.find({
      role: { $in: allowedRoles },
    }).select("_id name email role profileImage");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:senderId/:receiverId", async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        {
          senderId: req.params.senderId,
          receiverId: req.params.receiverId,
        },
        {
          senderId: req.params.receiverId,
          receiverId: req.params.senderId,
        },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;

    const message = await Message.create({
      senderId,
      receiverId,
      text,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;