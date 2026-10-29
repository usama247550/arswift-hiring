const { emailEnabled, sendMail } = require("../utils/mailer");
const { buildInvite } = require("../utils/ics");

// Sends a calendar invite to the CEO (CEO_EMAIL). Never throws; if CEO_EMAIL is empty nothing happens.
// kind: "interview" (30 min) or "meeting" (60 min).
async function inviteCeo(candidate, start, kind) {
  const to = (process.env.CEO_EMAIL || "").trim();
  if (!to || !emailEnabled() || !start) return false;

  const isMeeting = kind === "meeting";
  const title = isMeeting
    ? `CEO meeting: ${candidate.name} (${candidate.role})`
    : `Interview: ${candidate.name} (${candidate.role})`;
  const description = [
    `Candidate: ${candidate.name}`,
    `Role: ${candidate.role}`,
    candidate.phone ? `Phone: ${candidate.phone}` : "",
    `Email: ${candidate.email}`,
    `City: ${candidate.city || ""}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const content = buildInvite({
      uid: `${kind}-${candidate._id}@arswift.com`,
      title,
      description,
      start,
      minutes: isMeeting ? 60 : 30,
      organizer: process.env.SMTP_USER,
      attendee: to,
    });
    await sendMail({
      to,
      subject: title,
      text: `${title}\n\n${description}`,
      icalEvent: { method: "REQUEST", content },
    });
    return true;
  } catch (err) {
    console.error("Could not send the calendar invite:", err.message);
    return false;
  }
}

module.exports = { inviteCeo };
