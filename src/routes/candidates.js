const express = require("express");
const Candidate = require("../models/Candidate");
const { emailNewCandidate } = require("../services/emailFlow");
const { sendTest } = require("../services/testFlow");
const { markNoShowsQuietly } = require("../services/noShow");
const { karachiDayRange } = require("../utils/slots");

const { STATUSES } = Candidate;
const router = express.Router();

// GET /api/candidates/stats
router.get("/stats", async (req, res, next) => {
  try {
    await markNoShowsQuietly();
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

// GET /api/candidates/today  (interviews booked for today, Karachi time, earliest first)
router.get("/today", async (req, res, next) => {
  try {
    await markNoShowsQuietly();
    const { start, end } = karachiDayRange(new Date());
    const items = await Candidate.find({
      interviewAt: { $gte: start, $lt: end },
      status: { $in: ["scheduled", "arrived", "no_show"] },
    })
      .sort({ interviewAt: 1 })
      .lean();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/candidates?status=&q=&limit=&page=
router.get("/", async (req, res, next) => {
  try {
    await markNoShowsQuietly();
    const { status, q } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const filter = {};
    if (typeof status === "string" && STATUSES.includes(status)) filter.status = status;
    if (typeof q === "string" && q.trim()) {
      const safe = q.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      filter.$or = [{ name: rx }, { email: rx }, { role: rx }, { city: rx }];
    }

    const [items, total] = await Promise.all([
      Candidate.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Candidate.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
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

// POST /api/candidates/:id/send-test  (the "Send test" button)
router.post("/:id/send-test", async (req, res, next) => {
  try {
    const result = await sendTest(req.params.id);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.json(result.candidate);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
