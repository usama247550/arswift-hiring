const nodemailer = require("nodemailer");

let transporter = null;

// Automatic emails are on only when the mailbox settings are filled in.
function emailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT, 10) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text, attachments }) {
  const from = process.env.MAIL_FROM || `"AR Swift HR" <${process.env.SMTP_USER}>`;
  await getTransporter().sendMail({ from, to, subject, text, attachments });
}

module.exports = { emailEnabled, sendMail };
