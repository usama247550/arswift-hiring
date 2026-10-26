// Saves a test PDF for a role.
//   npm run add-test -- "E-commerce Sales Executive" C:\path\to\test.pdf
//   npm run add-test -- default C:\path\to\general-test.pdf     (used when a role has no PDF of its own)
//   npm run add-test -- --list
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const TestPdf = require("../src/models/TestPdf");
const { roleSlug } = require("../src/utils/slug");

const MAX_BYTES = 5 * 1024 * 1024;

async function main() {
  const args = process.argv.slice(2);
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing in backend/.env");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

  if (args[0] === "--list") {
    const rows = await TestPdf.find().select("slug role filename size updatedAt").lean();
    if (!rows.length) console.log("No test PDFs saved yet.");
    rows.forEach((r) => console.log(`${r.slug}  |  ${r.role}  |  ${r.filename}  |  ${Math.round(r.size / 1024)} KB`));
    return;
  }

  const [role, file] = args;
  if (!role || !file) {
    console.log('Use:  npm run add-test -- "Role name" path\\to\\file.pdf');
    process.exitCode = 1;
    return;
  }

  const data = fs.readFileSync(file);
  if (data.length > MAX_BYTES) throw new Error("The PDF is bigger than 5 MB.");
  if (data.subarray(0, 5).toString() !== "%PDF-") throw new Error("This file is not a PDF.");

  const isDefault = role.toLowerCase() === "default";
  const slug = isDefault ? "default" : roleSlug(role);
  if (!slug) throw new Error("The role name is not valid.");

  await TestPdf.findOneAndUpdate(
    { slug },
    { slug, role: isDefault ? "Any role" : role, filename: path.basename(file), data, size: data.length },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`Saved "${path.basename(file)}" for ${isDefault ? "all roles without their own PDF" : `"${role}"`}.`);
}

main()
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
