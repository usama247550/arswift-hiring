const mongoose = require("mongoose");
const Candidate = require("../models/Candidate");
const Submission = require("../models/Submission");
const { emailEnabled, sendMail } = require("../utils/mailer");
const messages = require("../utils/messages");
const { parseKarachi } = require("../utils/time");

// Candidates waiting for a decision (test sent), each with the answers they emailed back.
async function reviewList() {
  const candidates = await Candidate.find({ status: "arrived" }).sort({ testSentAt: 1 }).lean();
  const ids = candidates.map((c) => c._id);
  const subs = await Submission.find({ candidate: { $in: ids } })
    .select("-files.data")
    .sort({ receivedAt: 1 })
    .lean();

  const byCandidate = new Map();
  for (const s of subs) {
    const key = String(s.candidate);
    if (!byCandidate.has(key)) byCandidate.set(key, []);
    byCandidate.get(key).push({
      _id: s._id,
      receivedAt: s.receivedAt,
      subject: s.subject,
      snippet: s.snippet,
      skipped: s.skipped || [],
      files: (s.files || []).map((f, index) => ({ index, filename: f.filename, size: f.size, contentType: f.contentType })),
    });
  }
  return candidates.map((c) => ({ ...c, submissions: byCandidate.get(String(c._id)) || [] }));
}

async function getFile(submissionId, index) {
  if (!mongoose.isValidObjectId(submissionId)) return null;
  const sub = await Submission.findById(submissionId).select("files");
  const file = sub?.files?.[Number(index)];
  if (!file?.data) return null;
  return { filename: file.filename, contentType: file.contentType, data: Buffer.from(file.data) };
}

async function loadArrived(id) {
  if (!mongoose.isValidObjectId(id)) return { status: 404, error: "Candidate not found." };
  const candidate = await Candidate.findById(id);
  if (!candidate) return { status: 404, error: "Candidate not found." };
  if (candidate.status !== "arrived") {
    return { status: 409, error: "This candidate is not waiting for a decision." };
  }
  return { candidate };
}

// Pass: needs the CEO meeting date and time. Emails the candidate, then saves the decision.
async function passCandidate(id, meetingText) {
  const found = await loadArrived(id);
  if (found.error) return found;
  const { candidate } = found;

  const meetingAt = parseKarachi(meetingText);
  if (!meetingAt) return { status: 400, error: "Please choose the meeting date and time." };
  if (meetingAt.getTime() < Date.now()) return { status: 400, error: "The meeting time must be in the future." };
  if (!emailEnabled()) return { status: 503, error: "Email is not set up on the server." };

  try {
    await sendMail({ to: candidate.email, ...messages.passEmail(candidate, meetingAt) });
  } catch (err) {
    console.error("Could not send the meeting email:", err.message);
    return { status: 502, error: "The email could not be sent. Nothing was changed, please try again." };
  }

  candidate.status = "passed";
  candidate.meetingAt = meetingAt;
  candidate.decidedAt = new Date();
  await candidate.save();
  return { candidate };
}

// Fail: no email is sent. Only the status changes.
async function failCandidate(id) {
  const found = await loadArrived(id);
  if (found.error) return found;
  const { candidate } = found;
  candidate.status = "failed";
  candidate.decidedAt = new Date();
  await candidate.save();
  return { candidate };
}

module.exports = { reviewList, getFile, passCandidate, failCandidate };
