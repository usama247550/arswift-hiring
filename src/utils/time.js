// "2026-10-30T14:00" typed in the dashboard is Karachi time (UTC+5). Returns a Date, or null if the text is not valid.
function parseKarachi(text) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(text || ""))) return null;
  const date = new Date(`${text}:00+05:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = { parseKarachi };
