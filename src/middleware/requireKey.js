const crypto = require("crypto");

// Every /api route needs the shared key in the x-api-key header.
// The Next.js server and (later) the Google Form webhook send it; browsers never do.
module.exports = function requireKey(req, res, next) {
  const expected = process.env.API_KEY;
  if (!expected) {
    return res.status(503).json({ error: "Server is missing API_KEY." });
  }

  const given = Buffer.from(req.get("x-api-key") || "");
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return res.status(401).json({ error: "Invalid API key." });
  }
  next();
};
