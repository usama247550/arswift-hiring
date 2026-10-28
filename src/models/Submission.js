const mongoose = require("mongoose");

// A reply from a candidate with their answers (the filled test PDF, or photos of it).
const fileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    contentType: { type: String, default: "application/octet-stream" },
    size: { type: Number, required: true },
    data: { type: Buffer },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    messageId: { type: String, required: true },
    receivedAt: { type: Date, required: true },
    subject: { type: String, default: "" },
    snippet: { type: String, default: "" },
    files: [fileSchema],
    // Names of attachments that were too big to keep, so the reviewer knows to open the mailbox.
    skipped: [String],
  },
  { timestamps: true }
);

submissionSchema.index({ candidate: 1, messageId: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);
