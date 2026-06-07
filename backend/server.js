import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import clubRoutes from "./routes/clubs.js";
import eventRoutes from "./routes/events.js";
import complaintRoutes from "./routes/complaints.js";
import dashboardRoutes from "./routes/dashboard.js";
import studentRoutes from "./routes/student.js";
import facultyRoutes from "./routes/faculty.js";
import adminRoutes from "./routes/admin.js";
import notificationRoutes from "./routes/notifications.js";
import attendanceRoutes from "./routes/attendance.js";
import proofRoutes from "./routes/proofs.js";
import feedbackRoutes from "./routes/feedback.js";
import { initSocket, registerSocketUser, unregisterSocket } from "./socket.js";
import cron from "node-cron";
import Event from "./models/Event.js";
import EventRegistration from "./models/EventRegistration.js";
import userRoutes from "./routes/user.js";
import messageRoutes from "./routes/message.js";


import path from "path";

dotenv.config();
console.log("JWT SECRET:", process.env.JWT_SECRET);
console.log("EMAIL FROM SERVER:", process.env.EMAIL);
console.log("PASS FROM SERVER:", process.env.EMAIL_PASSWORD);
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:8080",
  "http://127.0.0.1:8080",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

initSocket(io);
app.set("io", io);
cron.schedule("*/5 * * * *", async () => {
  console.log("Running auto attendance check...");

  try {
    const now = new Date();

    const events = await Event.find();

    for (const event of events) {
      const eventTime = new Date(`${event.date} ${event.time}`);

      if (now > eventTime) {
        await EventRegistration.updateMany(
          {
            eventId: event._id,
            status: "registered",
          },
          {
            $set: { status: "absent" },
          }
        );
      }
    }
  } catch (err) {
    console.error("Cron error:", err.message);
  }
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
  })
);

app.use(express.json());
app.use("/uploads", express.static("uploads"));


app.use("/api/messages", messageRoutes);
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/proofs", proofRoutes);
app.use("/api/feedback", feedbackRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

io.on("connection", (socket) => {
  socket.on("sendMessage", (message) => {
  io.to(String(message.receiverId)).emit(
    "newMessage",
    message
  );
});
  socket.on("register", ({ userId, role, clubIds = [] }) => {
    if (!userId) {
      return;
    }

    registerSocketUser(userId, socket.id);
    socket.join(String(userId));
    socket.join(role);
    clubIds.forEach((clubId) => socket.join(`club:${clubId}`));
  });

  socket.on("disconnect", () => {
    unregisterSocket(socket.id);
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });
