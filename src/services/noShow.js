const Candidate = require("../models/Candidate");
const { karachiDayRange } = require("../utils/slots");

// A booked candidate who never arrived is moved to "no_show" (shown as "Not interested") once the
// whole interview day is over, so an interview on the 28th changes on the 29th. No second slot is given.
async function markNoShows(now = new Date()) {
  const { start } = karachiDayRange(now); // 00:00 Karachi time today
  const result = await Candidate.updateMany(
    { status: "scheduled", interviewAt: { $lt: start } },
    { status: "no_show" }
  );
  return result.modifiedCount || 0;
}

// Never lets a problem here break the page that called it.
async function markNoShowsQuietly() {
  try {
    await markNoShows();
  } catch (err) {
    console.error("Could not update no-shows:", err.message);
  }
}

module.exports = { markNoShows, markNoShowsQuietly };
