// Turns any way of writing a Pakistani number into digits with the country code,
// the same shape WhatsApp uses: 923423039619.
//   "0342 3039619" / "+92 342 3039619" / "0092-342-3039619" / "3423039619"  ->  "923423039619"
function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "92" + d.slice(1);
  else if (d.length === 10 && d.startsWith("3")) d = "92" + d;
  return d;
}

module.exports = { normalizePhone };
