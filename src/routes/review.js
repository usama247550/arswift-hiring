const express = require("express");
const { syncAnswers } = require("../services/answersInbox");
const { reviewList, getFile, passCandidate, failCandidate } = require("../services/reviewFlow");

const router = express.Router();

// GET /api/review  (candidates waiting for a decision, with their answers)
router.get("/", async (req, res, next) => {
  try {
    res.json({ items: await reviewList() });
  } catch (err) {
    next(err);
  }
});

// POST /api/review/sync  (look for new answers in the HR mailbox)
router.post("/sync", async (req, res, next) => {
  try {
    const result = await syncAnswers();
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/review/files/:submissionId/:index  (opens one attachment)
router.get("/files/:submissionId/:index", async (req, res, next) => {
  try {
    const file = await getFile(req.params.submissionId, req.params.index);
    if (!file) return res.status(404).json({ error: "File not found." });
    const safeName = String(file.filename).replace(/[^\w.\- ]+/g, "_");
    res.set({
      "Content-Type": file.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Content-Length": String(file.data.length),
      "X-Content-Type-Options": "nosniff",
    });
    res.send(file.data);
  } catch (err) {
    next(err);
  }
});

// POST /api/review/:id/pass  { meetingAt: "2026-10-30T14:00" }
router.post("/:id/pass", async (req, res, next) => {
  try {
    const result = await passCandidate(req.params.id, req.body?.meetingAt);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.candidate);
  } catch (err) {
    next(err);
  }
});

// POST /api/review/:id/fail
router.post("/:id/fail", async (req, res, next) => {
  try {
    const result = await failCandidate(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.candidate);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
