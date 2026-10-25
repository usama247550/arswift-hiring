// Adds demo candidates so the dashboard has something to show.
//   npm run seed         add demo data
//   npm run seed:clear   remove demo data again
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Candidate = require("../src/models/Candidate");

// Pakistan is UTC+5, so 11:00 in Karachi is 06:00 UTC.
function daysFromNow(days, karachiHour = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(karachiHour - 5, 0, 0, 0);
  return d;
}

const demo = [
  { name: "Ayesha Rauf", email: "ayesha.rauf@example.com", role: "MERN Stack Intern", city: "Faisalabad", status: "scheduled", interviewAt: daysFromNow(1, 11), createdAt: daysFromNow(-1, 15) },
  { name: "Hamza Siddique", email: "hamza.siddique@example.com", role: "Junior UI/UX Designer", city: "faislabad", status: "scheduled", interviewAt: daysFromNow(1, 15), createdAt: daysFromNow(-1, 12) },
  { name: "Mahnoor Tariq", email: "mahnoor.tariq@example.com", role: "React Native Developer", city: "Lahore", status: "rejected", createdAt: daysFromNow(-2, 17) },
  { name: "Bilal Ahmad", email: "bilal.ahmad@example.com", role: "Full Stack Developer (MERN)", city: "FSD", status: "new", createdAt: daysFromNow(0, 9) },
  { name: "Sana Iqbal", email: "sana.iqbal@example.com", role: "Frontend Developer", city: "Karachi", status: "rejected", createdAt: daysFromNow(-3, 10) },
  { name: "Usman Ghani", email: "usman.ghani@example.com", role: "Graphic Designer", city: "Faisalabad", status: "arrived", createdAt: daysFromNow(-4, 14) },
  { name: "Hira Nadeem", email: "hira.nadeem@example.com", role: "WordPress Developer", city: "Faisalabad", status: "no_show", createdAt: daysFromNow(-5, 16) },
  { name: "Zain Abbas", email: "zain.abbas@example.com", role: "MERN Stack Intern", city: "Islamabad", status: "rejected", createdAt: daysFromNow(-2, 11) },
].map((c) => ({ ...c, source: "demo" }));

async function main() {
  await connectDB();
  const removed = await Candidate.deleteMany({ source: "demo" });
  if (process.argv.includes("--clear")) {
    console.log(`Removed ${removed.deletedCount} demo candidates.`);
  } else {
    await Candidate.create(demo);
    console.log(`Added ${demo.length} demo candidates.`);
  }
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect();
  process.exit(1);
});
