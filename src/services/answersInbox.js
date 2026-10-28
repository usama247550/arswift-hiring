const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const Candidate = require("../models/Candidate");
const Submission = require("../models/Submission");

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

function imapEnabled() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function dayBefore(date) {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
}

// Turns a parsed email into what we keep: a short text and the real attachments.
function pickContent(parsed) {
  const files = [];
  const skipped = [];
  let total = 0;
  for (const att of parsed.attachments || []) {
    const inline = att.contentDisposition === "inline" || att.related;
    if (inline) continue; // signature logos and pictures inside the text
    const name = att.filename || "attachment";
    if (att.size > MAX_FILE_BYTES || total + att.size > MAX_TOTAL_BYTES) {
      skipped.push(name);
      continue;
    }
    total += att.size;
    files.push({ filename: name, contentType: att.contentType, size: att.size, data: att.content });
  }
  const text = String(parsed.text || "").replace(/\s+/g, " ").trim().slice(0, 600);
  return { files, skipped, snippet: text };
}

// Looks in the HR mailbox for replies from candidates who were sent a test, and saves them.
// Nothing is deleted or marked as read in the mailbox.
async function syncAnswers() {
  if (!imapEnabled()) return { error: "The mailbox is not set up on the server.", status: 503 };

  const pending = await Candidate.find({ status: "arrived", testSentAt: { $exists: true } }).lean();
  if (pending.length === 0) return { checked: 0, added: 0 };

  const client = new ImapFlow({
    host: process.env.IMAP_HOST || "imap.hostinger.com",
    port: parseInt(process.env.IMAP_PORT, 10) || 993,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    logger: false,
    socketTimeout: 25000,
  });
  client.on("error", (err) => console.error("IMAP error:", err.message));

  let added = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      for (const candidate of pending) {
        const sentAt = new Date(candidate.testSentAt);
        const uids = await client.search({ from: candidate.email, since: dayBefore(sentAt) }, { uid: true });
        for (const uid of uids || []) {
          const head = await client.fetchOne(uid, { envelope: true }, { uid: true });
          const env = head?.envelope;
          if (!env?.messageId) continue;
          const receivedAt = env.date ? new Date(env.date) : new Date();
          if (receivedAt.getTime() < sentAt.getTime() - 60 * 1000) continue; // older than our test email
          const fromAddress = String(env.from?.[0]?.address || "").toLowerCase();
          if (fromAddress !== String(candidate.email).toLowerCase()) continue;

          const exists = await Submission.exists({ candidate: candidate._id, messageId: env.messageId });
          if (exists) continue;

          const full = await client.fetchOne(uid, { source: true }, { uid: true });
          const parsed = await simpleParser(full.source);
          const { files, skipped, snippet } = pickContent(parsed);
          try {
            await Submission.create({
              candidate: candidate._id,
              messageId: env.messageId,
              receivedAt,
              subject: String(env.subject || "").slice(0, 200),
              snippet,
              files,
              skipped,
            });
            added++;
          } catch (err) {
            if (err.code !== 11000) throw err; // another check saved it a moment ago
          }
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error("Could not read the mailbox:", err.message);
    return { error: "The mailbox could not be read. Please try again.", status: 502 };
  } finally {
    try {
      await client.logout();
    } catch {
      /* connection already closed */
    }
  }
  return { checked: pending.length, added };
}

module.exports = { syncAnswers, imapEnabled };
