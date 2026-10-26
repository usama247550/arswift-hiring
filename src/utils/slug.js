// "E-commerce Sales Executive" -> "e-commerce-sales-executive"
// Used to match a candidate's role to the test PDF saved for that role.
function roleSlug(role) {
  return String(role || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

module.exports = { roleSlug };
