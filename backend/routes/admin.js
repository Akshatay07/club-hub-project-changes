import express from "express";
import User from "../models/User.js";
import Club from "../models/Club.js";
import Event from "../models/Event.js";
import ProofSubmission from "../models/ProofSubmission.js";
import BudgetRequest from "../models/Budget.js";

import auth from "../middleware/auth.js";
import permit from "../middleware/role.js";
import bcrypt from "bcrypt";
import { randomPassword, createToken } from "../utils/auth.js";
import { sendEmail } from "../services/emailService.js";
import { createNotification } from "../services/notificationService.js";
import { recalculateClubHealth } from "../services/healthService.js";

export const assignFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { clubId } = req.body;

    const user = await User.findById(id);

    user.assignedClub = clubId;
    await user.save();

    await sendEmail(
      user.email,
      "Club Assignment",
      `You have been assigned to a club.`
    );

    res.json({ message: "Assigned successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error" });
  }
};

const router = express.Router();
router.use(auth, permit("admin"));

function createFacultyEmail(username, tempPassword, clubName, resetUrl) {
  return {
    html: `<p>Welcome to Club Hub.</p>
           <p>You have been assigned to <strong>${clubName}</strong>.</p>
           <p>Login: ${username}<br/>Temporary password: ${tempPassword}</p>
           <p>Reset password: <a href="${resetUrl}">${resetUrl}</a></p>`,
    text: `Login: ${username}, Temp password: ${tempPassword}, Reset: ${resetUrl}`,
  };
}

router.put("/faculty/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { clubId } = req.body;

    const faculty = await User.findById(id);
    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    await Club.updateMany(
      { facultyIds: faculty._id },
      { $pull: { facultyIds: faculty._id } }
    );

    faculty.assignedClubs = clubId ? [clubId] : [];
    await faculty.save();

    let clubName = "Unassigned";

    if (clubId) {
      const club = await Club.findByIdAndUpdate(
        clubId,
        { $addToSet: { facultyIds: faculty._id } },
        { new: true }
      );

      clubName = club.name;
    }

    // 🔥 TOKEN LOGIC ADDED (no logic removed)
    const resetToken = createToken();
    faculty.resetToken = resetToken;
    faculty.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await faculty.save();

    const resetUrl = `http://localhost:8080/set-password/${resetToken}`;

    console.log("Preparing email...");
    await sendEmail({
      to: faculty.email,
      subject: "Club Assignment Updated",
      text: `
Hello ${faculty.name},

You have been assigned to: ${clubName}

Login credentials:
Email: ${faculty.email}

If you are a new user, please reset your password using the link below:
${resetUrl}

Regards,
Club Management System
`,
    });

    console.log("Email sent to:", faculty.email);

    const io = req.app.get("io");
    if (io) io.emit("clubUpdated");

    res.json({ message: "Assignment updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.put("/events/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("event:updated", event);
    }

    res.json({ message: "Status updated", event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/create-club", async (req, res) => {
  try {
    const club = await Club.create({
      name: req.body.name,
      description: req.body.description || "",
      category: req.body.category || "other",
      plannedEvents: Number(req.body.plannedEvents || 0),
      budgetAllocated: Number(req.body.budgetAllocated || 0),
    });

    await createNotification({
      userId: req.user._id,
      title: "Club created",
      message: `${club.name} created`,
      type: "success",
    });

    res.status(201).json(club);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/assign-faculty", async (req, res) => {
  try {
    const { name, email, clubId } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email exists" });
    }

    const tempPassword = Math.random().toString(36).slice(-8);

const user = await User.create({
  name,
  email,
  password: tempPassword,
  role: "faculty",
  assignedClubs: clubId ? [clubId] : [],
});

    if (clubId) {
      await Club.findByIdAndUpdate(clubId, {
        $addToSet: { facultyIds: user._id },
      });
    }

    // 🔥 TOKEN LOGIC ADDED HERE ALSO
    const resetToken = createToken();
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `http://localhost:8080/set-password/${resetToken}`;

    await sendEmail({
  to: email,
  subject: "Faculty Account Created",
  html: `
    <h2>Faculty Account Created</h2>

    <p>Hello ${name}</p>

    <p><b>Email:</b> ${email}</p>

    <p><b>Temporary Password:</b> ${tempPassword}</p>

    <p>
      <a href="${resetUrl}">
        Reset Password
      </a>
    </p>
  `,
});

    res.json({ message: "Faculty created" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/faculty/:id", async (req, res) => {
  try {
    const faculty = await User.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: "Not found" });
    }

    await faculty.deleteOne();

    res.json({ message: "Faculty deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/clubs/:id/events", async (req, res) => {
  try {
    const events = await Event.find({ clubId: req.params.id });
    const proofs = await ProofSubmission.find({ clubId: req.params.id });
    res.json({ events, proofs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/budget/allocate", async (req, res) => {
  try {
    const { clubId, amount } = req.body;

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });

    club.budgetAllocated = Number(amount);
    await club.save();

    await recalculateClubHealth(club._id);

    res.json(club);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/faculty", async (req, res) => {
  try {
    const faculty = await User.find({ role: "faculty" })
      .populate("assignedClubs", "name")
      .select("name email assignedClubs");

    res.json(faculty);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch faculty" });
  }
});

router.put("/faculty/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { clubId } = req.body;

    const faculty = await User.findById(id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    if (faculty.assignedClubs?.length > 0) {
      const oldClubId = faculty.assignedClubs[0];

      await Club.findByIdAndUpdate(oldClubId, {
        $pull: { facultyIds: faculty._id },
      });
    }

    faculty.assignedClubs = clubId ? [clubId] : [];
    await faculty.save();

    if (clubId) {
      await Club.findByIdAndUpdate(clubId, {
        $addToSet: { facultyIds: faculty._id },
      });
    }

    const updatedClub = await Club.findById(clubId)
      .populate("facultyIds", "name email");

    const io = req.app.get("io");
    if (io) {
      io.emit("clubUpdated");
    }

    res.json(updatedClub);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;