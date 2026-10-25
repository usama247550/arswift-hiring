// Interview slots: Monday to Friday, 1 hour each, Karachi time (UTC+5, no daylight saving).
// Office hours are 10:00-17:00 and lunch is 13:30-14:30, so a day has 5 slots:
//   10:00, 11:00, 12:00, 14:30, 15:30
const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;
const SLOT_STARTS = [
  [10, 0],
  [11, 0],
  [12, 0],
  [14, 30],
  [15, 30],
];

// `taken` is a Set of slot times in milliseconds. Returns the first free slot
// starting from the next working day, or null if nothing is free for `maxDays` days.
function firstFreeSlot(now = new Date(), taken = new Set(), maxDays = 60) {
  const karachiNow = new Date(now.getTime() + KARACHI_OFFSET_MS);
  for (let i = 1; i <= maxDays; i++) {
    const day = new Date(
      Date.UTC(karachiNow.getUTCFullYear(), karachiNow.getUTCMonth(), karachiNow.getUTCDate() + i)
    );
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    for (const [hour, minute] of SLOT_STARTS) {
      const slot = new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute) -
          KARACHI_OFFSET_MS
      );
      if (!taken.has(slot.getTime())) return slot;
    }
  }
  return null;
}

module.exports = { firstFreeSlot, SLOT_STARTS };
