const Candidate = require("../models/Candidate");
const { assignSlot } = require("./whatsappFlow");
const { emailEnabled, sendMail } = require("../utils/mailer");
const messages = require("../utils/messages");

// Runs right after the Google Form creates a candidate:
//   Faisalabad  -> first free slot + slot email
//   elsewhere   -> status "rejected" + polite email
// Never throws. If the mail fails the candidate keeps the new status and emailSentAt stays empty.
async function emailNewCandidate(candidate) {
  if (!emailEnabled()) return { state: "off" };

  try {
    let doc = candidate;
    let mail;

    if (!candidate.isFaisalabad) {
      const updated = await Candidate.findOneAndUpdate(
        { _id: candidate._id, status: "new" },
        { status: "rejected" },
        { new: true }
      );
      if (!updated) return { state: "already" };
      doc = updated;
      mail = messages.rejectedEmail(doc);
    } else {
      const result = await assignSlot(candidate);
      if (result.state === "already") return { state: "already" };
      if (result.state === "assigned") {
        doc = result.doc;
        mail = messages.slotEmail(doc);
      } else {
        mail = messages.noSlotsEmail(candidate);
      }
    }

    try {
      await sendMail({ to: doc.email, ...mail });
      doc = (await Candidate.findByIdAndUpdate(doc._id, { emailSentAt: new Date() }, { new: true })) || doc;
      return { state: "sent", doc };
    } catch (err) {
      console.error("Could not send email:", err.message);
      return { state: "failed", doc };
    }
  } catch (err) {
    console.error("Email flow failed:", err.message);
    return { state: "failed" };
  }
}

module.exports = { emailNewCandidate };
