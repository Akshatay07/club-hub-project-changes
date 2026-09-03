import express from "express";
import User from "../models/User.js";
import { signToken, randomNumericCode, createToken } from "../utils/auth.js";
import { sendEmail } from "../services/emailService.js";

const router = express.Router();

function safeUser(user) {
  return user.toSafeObject ? user.toSafeObject() : user;
}

router.post("/set-password", async (req, res) => {
  try {
    const { token, password, regNo } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = password;   // ADD THIS
    user.regNo = regNo;

    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    user.mustChangePassword = false;

    await user.save();

    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const bcrypt = require("bcrypt");
    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    res.json({ message: "Password updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate("assignedClubs", "name");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Disallow student login
    if (user.role === "student") {
      return res.status(403).json({
        message: "Student login is disabled. Only Admin and Faculty accounts can log in.",
      });
    }

    // Role verification if specific role is targeted
    if (role && user.role !== role) {
      const correctOption = user.role === "admin" ? "Admin" : "Faculty";
      return res.status(403).json({
        message: `This account is registered as ${user.role}, not ${role}. Please use the "${correctOption}" login option.`,
      });
    }

    console.log("LOGIN EMAIL:", email, "ROLE:", user.role);

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      token: signToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/register", async (req, res) => {
  return res.status(403).json({ message: "Student registration has been disabled. Only administrators can onboard users." });
});


router.post("/signup", async (req, res) => {
  return res.status(403).json({ message: "Student registration has been disabled. Only administrators can onboard users." });
});



router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.otp = null;
    user.otpExpiry = null;
    user.emailVerified = true;
    await user.save();

    res.json({
      message: "Email verified successfully",
      token: signToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword, token } = req.body;
    const user = token
      ? await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } })
      : await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User not found or token expired" });
    }

    if (!token) {
      const valid = await user.comparePassword(currentPassword || "");
      if (!valid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({
      message: "Password changed successfully",
      token: signToken(user),
      user: safeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return res.json({ message: "If that account exists, a reset email has been sent." });
    }

    if (user.role === "faculty" && !user.emailVerified) {
      return res.status(403).json({ message: "Faculty reset is blocked until email verification is complete" });
    }

    const resetToken = createToken();
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:8080"}/set-password/${resetToken}`;

await sendEmail({
  to: user.email,
  subject: "Reset your Club Hub password",
  template: "forgot-password",
  html: `<p>Hello ${user.name},</p>
         <p>Reset your password here: <a href="${resetUrl}">${resetUrl}</a></p>`,
  text: `Reset your password: ${resetUrl}`,
  metadata: { userId: String(user._id), resetUrl },
});

    res.json({ message: "Password reset email sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
