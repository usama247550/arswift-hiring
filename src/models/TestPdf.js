const mongoose = require("mongoose");

// One test PDF per role. The slug "default" is used for roles that have no PDF of their own.
const testPdfSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    role: { type: String, required: true, trim: true },
    filename: { type: String, required: true, trim: true },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestPdf", testPdfSchema);
