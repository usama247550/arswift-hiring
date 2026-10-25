// Decides whether a free-text city answer means Faisalabad.
// Handles spelling mistakes ("Faislabad"), short forms ("FSD"),
// the old name ("Lyallpur") and the Urdu spelling.

const TARGET = "faisalabad";
const ALIASES = new Set(["fsd", "lyallpur", "layallpur", "lyalpur"]);
const URDU = /فیصل\s*آباد/;

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[rows - 1][cols - 1];
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isFaisalabad(city) {
  if (URDU.test(String(city || ""))) return true;

  const text = normalize(city);
  if (!text) return false;

  const words = text.split(" ");
  const options = new Set(words);
  // "Faisal abad" typed as two words
  for (let i = 0; i < words.length - 1; i++) options.add(words[i] + words[i + 1]);

  for (const option of options) {
    if (ALIASES.has(option)) return true;
    if (option.length >= 7 && levenshtein(option, TARGET) <= 2) return true;
  }
  return false;
}

module.exports = { isFaisalabad };
