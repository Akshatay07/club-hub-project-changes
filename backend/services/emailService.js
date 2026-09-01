import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
console.log("ENV EMAIL:", process.env.EMAIL);
console.log("ENV PASS:", process.env.EMAIL_PASSWORD);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    console.log("Sending email to:", to);

    // Bypass actual SMTP mail sending for fictitious local test domains
    if (to.endsWith("@clubhub.edu") || to.endsWith("@student.edu")) {
      console.log(`[Email Simulation] Bypassed SMTP delivery for local test email: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text Body: ${text}`);
      return;
    }

    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent to:", to);
  } catch (err) {
    console.log("EMAIL ERROR FULL:", err);
  }
};