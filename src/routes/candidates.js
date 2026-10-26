const express = require("express");
const Candidate = require("../models/Candidate");
const { emailNewCandidate } = require("../services/emailFlow");

const { STATUSES } = Candidate;
const router = express.Router();

// GET /api/candidates/stats
router.get("/stats", async (req, res, next) => {
  try {
    const rows = await Candidate.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    rows.forEach((r) => {
      byStatus[r._id] = r.count;
    });
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const faisalabad = await Candidate.countDocuments({ isFaisalabad: true });
    res.json({ total, faisalabad, byStatus });
  } catch (err) {
    next(err);
  }
});

// GET /api/candidates?status=&q=&limit=
router.get("/", async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

    const filter = {};
    if (typeof status === "string" && STATUSES.includes(status)) filter.status = status;
    if (typeof q === "string" && q.trim()) {
      const safe = q.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      filter.$or = [{ name: rx }, { email: rx }, { role: rx }, { city: rx }];
    }

    const items = await Candidate.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// POST /api/candidates  (the Google Form webhook will call this)
router.post("/", async (req, res, next) => {
  const { name, email, phone, role, city, notes } = req.body || {};
  try {
    // Only these fields are accepted, so status and the Faisalabad flag can't be forced from outside.
    const candidate = await Candidate.create({ name, email, phone, role, city, notes });
    // Sends the slot or rejection email. A mail problem never loses the application.
    const result = await emailNewCandidate(candidate);
    res.status(201).json(result.doc || candidate);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "This email has already applied for this role." });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(" ") });
    }
    next(err);
  }
});

module.exports = router;
