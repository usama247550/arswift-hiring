const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const requireKey = require("./middleware/requireKey");

const app = express();

app.disable("x-powered-by");
app.use(helmet());
// rawBody is kept because Meta's webhook signature is checked against the exact bytes it sent.
app.use(
  express.json({
    limit: "100kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Connects to MongoDB on the first request (needed on Vercel) and reuses the connection after that.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection failed:", err.message);
    res.status(503).json({ error: "Database is not reachable." });
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? "connected" : "not connected" });
});

// Meta signs these calls itself, so they do not use the x-api-key header.
app.use("/webhook/whatsapp", require("./routes/whatsappWebhook"));

app.use("/api", requireKey);
app.use("/api/candidates", require("./routes/candidates"));
app.use("/api/review", require("./routes/review"));

app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

module.exports = app;
