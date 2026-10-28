const mongoose = require("mongoose");
const { isFaisalabad } = require("../utils/city");
const { normalizePhone } = require("../utils/phone");

// More statuses get added here as the flow grows (test, CEO meeting, hired...).
const STATUSES = ["new", "scheduled", "rejected", "arrived", "no_show", "passed", "failed", "archived"];

const candidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required."], trim: true, maxlength: 120 },
    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      maxlength: 200,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email is not valid."],
    },
    phone: { type: String, trim: true, maxlength: 40 },
    // Digits with country code (923423039619). WhatsApp messages are matched on this.
    phoneNormalized: { type: String, index: true },
    role: { type: String, required: [true, "Role is required."], trim: true, maxlength: 120 },
    city: { type: String, required: [true, "City is required."], trim: true, maxlength: 120 },
    isFaisalabad: { type: Boolean, default: false },
    status: { type: String, enum: STATUSES, default: "new", index: true },
    interviewAt: { type: Date },
    source: { type: String, default: "google-form", trim: true },
    notes: { type: String, trim: true, maxlength: 2000 },
    // Set when the slot or rejection email has gone out.
    emailSentAt: { type: Date },
    // Set when the test PDF has been emailed.
    testSentAt: { type: Date },
    // Final meeting with the CEO, set when the test is marked as passed.
    meetingAt: { type: Date },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

// One application per email per role.
candidateSchema.index({ email: 1, role: 1 }, { unique: true });

// Two candidates can never hold the same interview time.
candidateSchema.index(
  { interviewAt: 1 },
  { unique: true, partialFilterExpression: { interviewAt: { $type: "date" } } }
);

candidateSchema.pre("validate", function (next) {
  this.isFaisalabad = isFaisalabad(this.city);
  this.phoneNormalized = normalizePhone(this.phone);
  next();
});

const Candidate = mongoose.model("Candidate", candidateSchema);
Candidate.STATUSES = STATUSES;

module.exports = Candidate;
