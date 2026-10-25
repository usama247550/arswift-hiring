const mongoose = require("mongoose");

// Remembers WhatsApp message ids we already handled, so a repeated delivery does nothing twice.
const processedMessageSchema = new mongoose.Schema({
  wamid: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 },
});

module.exports = mongoose.model("ProcessedMessage", processedMessageSchema);
