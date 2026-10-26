const mongoose = require("mongoose");
const Candidate = require("../models/Candidate");
const TestPdf = require("../models/TestPdf");
const { emailEnabled, sendMail } = require("../utils/mailer");
const { roleSlug } = require("../utils/slug");
const messages = require("../utils/messages");

// Emails the test PDF for the candidate's role and marks the candidate as arrived.
// Returns { candidate } or { status, error } (never throws for expected problems).
async function sendTest(id) {
  if (!mongoose.isValidObjectId(id)) return { status: 404, error: "Candidate not found." };
  const candidate = await Candidate.findById(id);
  if (!candidate) return { status: 404, error: "Candidate not found." };

  if (!["scheduled", "arrived"].includes(candidate.status)) {
    return { status: 409, error: "The test can only be sent to a candidate with a booked interview." };
  }
  if (!emailEnabled()) return { status: 503, error: "Email is not set up on the server." };

  const pdf =
    (await TestPdf.findOne({ slug: roleSlug(candidate.role) })) || (await TestPdf.findOne({ slug: "default" }));
  if (!pdf) return { status: 422, error: `No test PDF is saved for "${candidate.role}" yet.` };

  try {
    await sendMail({
      to: candidate.email,
      ...messages.testEmail(candidate),
      attachments: [{ filename: pdf.filename, content: pdf.data, contentType: "application/pdf" }],
    });
  } catch (err) {
    console.error("Could not send the test:", err.message);
    return { status: 502, error: "The email could not be sent. Please try again." };
  }

  candidate.status = "arrived";
  candidate.testSentAt = new Date();
  await candidate.save();
  return { candidate };
}

module.exports = { sendTest };
