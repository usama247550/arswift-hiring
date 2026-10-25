const Candidate = require("../models/Candidate");
const ProcessedMessage = require("../models/ProcessedMessage");
const { normalizePhone } = require("../utils/phone");
const { firstFreeSlot } = require("../utils/slots");
const { sendText } = require("../utils/whatsapp");
const messages = require("../utils/messages");

// Gives a "new" candidate the first free slot. Returns { state, doc }.
//   assigned  the candidate is now "scheduled" with doc.interviewAt
//   already   someone else handled this candidate a moment ago, do nothing
//   full      no slot is free
async function assignSlot(candidate) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const booked = await Candidate.find({ interviewAt: { $gte: new Date() } })
      .select("interviewAt")
      .lean();
    const taken = new Set(booked.map((c) => c.interviewAt.getTime()));
    const slot = firstFreeSlot(new Date(), taken);
    if (!slot) return { state: "full" };

    try {
      const doc = await Candidate.findOneAndUpdate(
        { _id: candidate._id, status: "new" },
        { status: "scheduled", interviewAt: slot },
        { new: true }
      );
      return doc ? { state: "assigned", doc } : { state: "already" };
    } catch (err) {
      if (err.code === 11000) continue; // the slot was just taken by someone else, try the next one
      throw err;
    }
  }
  return { state: "full" };
}

async function handleMessage(message) {
  const from = normalizePhone(message.from);
  if (!from) return;

  const matches = await Candidate.find({ phoneNormalized: from }).sort({ createdAt: -1 });
  if (matches.length === 0) {
    await sendText(message.from, messages.notFoundMessage());
    return;
  }

  // Prefer an application that is still waiting, otherwise the latest one.
  const candidate = matches.find((c) => c.status === "new") || matches[0];

  if (candidate.status === "new") {
    if (!candidate.isFaisalabad) {
      const updated = await Candidate.findOneAndUpdate(
        { _id: candidate._id, status: "new" },
        { status: "rejected" }
      );
      if (updated) await sendText(message.from, messages.rejectedMessage(candidate));
      return;
    }

    const result = await assignSlot(candidate);
    if (result.state === "assigned") {
      await sendText(message.from, messages.slotMessage(result.doc));
    } else if (result.state === "full") {
      await sendText(message.from, messages.noSlotsMessage(candidate));
    }
    return;
  }

  // Already booked and writes again (or the first reply failed to send): repeat the slot.
  if (candidate.status === "scheduled" && candidate.interviewAt) {
    await sendText(message.from, messages.slotMessage(candidate));
  }
  // Any other status: stay quiet.
}

// Walks through the payload Meta sends and handles each new message once.
async function processPayload(payload) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      for (const message of change.value?.messages || []) {
        if (!message?.from || !message?.id || message.type === "reaction") continue;
        try {
          await ProcessedMessage.create({ wamid: message.id });
        } catch (err) {
          if (err.code === 11000) continue; // already handled
          throw err;
        }
        try {
          await handleMessage(message);
        } catch (err) {
          console.error("Could not handle a WhatsApp message:", err.message);
        }
      }
    }
  }
}

module.exports = { processPayload };
