// backend/utils/sendMail.js
const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Preconfigure transporter once
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

/**
 * Send email internally (used by controllers)
 * @param {string|string[]} to
 * @param {string} subject
 * @param {string} html
 * @param {string} [text]
 */
async function sendEmail(to, subject, html, text = "") {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.error("[sendEmail] Missing Gmail credentials in .env");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    console.log("[sendEmail] Sent:", info.messageId, "→", to);
  } catch (err) {
    console.error("[sendEmail] Failed:", err.message);
  }
}

module.exports = { sendEmail };
