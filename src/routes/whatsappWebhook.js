const express = require("express");
const { verifySignature, safeEqual } = require("../utils/whatsapp");
const { processPayload } = require("../services/whatsappFlow");

const router = express.Router();

// Meta calls this once, when you press "Verify and save" in the dashboard.
router.get("/", (req, res) => {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  const token = String(req.query["hub.verify_token"] || "");
  if (req.query["hub.mode"] === "subscribe" && expected && safeEqual(token, expected)) {
    return res.status(200).type("text/plain").send(String(req.query["hub.challenge"] || ""));
  }
  res.sendStatus(403);
});

// Meta calls this for every incoming WhatsApp message.
router.post("/", async (req, res) => {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return res.status(503).json({ error: "Server is missing META_APP_SECRET." });
  if (!verifySignature(req.rawBody, req.get("x-hub-signature-256"), secret)) {
    return res.sendStatus(401);
  }

  // The work is finished before answering Meta. On Vercel a function can be paused
  // right after it responds, so work left for later might never run.
  try {
    await processPayload(req.body);
  } catch (err) {
    console.error("WhatsApp webhook error:", err.message);
  }
  res.sendStatus(200);
});

module.exports = router;
