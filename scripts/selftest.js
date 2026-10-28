// Checks the logic that does not need MongoDB or Meta:  npm run selftest
const crypto = require("crypto");
const { isFaisalabad } = require("../src/utils/city");
const { normalizePhone } = require("../src/utils/phone");
const { firstFreeSlot, karachiDayRange } = require("../src/utils/slots");
const { verifySignature } = require("../src/utils/whatsapp");
const messages = require("../src/utils/messages");
const { roleSlug } = require("../src/utils/slug");

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) {
    failed++;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

// ----- phone numbers
for (const raw of ["0342 3039619", "+92 342 3039619", "0092-342-3039619", "3423039619", "92 342 3039619", "03423039619"]) {
  check(`phone ${raw}`, normalizePhone(raw) === "923423039619", normalizePhone(raw));
}
check("phone empty", normalizePhone("") === "" && normalizePhone(undefined) === "");

// ----- city
for (const c of ["Faisalabad", "Faislabad", "FSD", "Lyallpur", "Faisal abad", "Faisalabad, Punjab", "فیصل آباد"]) {
  check(`city yes ${c}`, isFaisalabad(c));
}
for (const c of ["Lahore", "Karachi", "Islamabad", "Multan", "Sargodha", ""]) {
  check(`city no ${c}`, !isFaisalabad(c));
}

// ----- slots (Karachi time = UTC+5)
const karachi = (iso) => new Date(new Date(iso).getTime() - 5 * 3600 * 1000); // "2026-10-26T10:00" Karachi -> real instant
const label = (d) => new Date(d.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 16);

check("Friday noon -> Monday 10:00", label(firstFreeSlot(karachi("2026-10-23T12:00:00Z"), new Set())) === "2026-10-26T10:00");
check("Saturday -> Monday 10:00", label(firstFreeSlot(karachi("2026-10-24T09:00:00Z"), new Set())) === "2026-10-26T10:00");
check("Sunday -> Monday 10:00", label(firstFreeSlot(karachi("2026-10-25T09:00:00Z"), new Set())) === "2026-10-26T10:00");
check("Monday -> Tuesday 10:00", label(firstFreeSlot(karachi("2026-10-26T10:00:00Z"), new Set())) === "2026-10-27T10:00");

const taken = new Set([karachi("2026-10-26T10:00:00Z").getTime(), karachi("2026-10-26T10:30:00Z").getTime()]);
check("skips taken slots", label(firstFreeSlot(karachi("2026-10-23T12:00:00Z"), taken)) === "2026-10-26T11:00");

// fill a whole day: the next candidate must go to the next day
const day = new Set();
const seen = [];
let now = karachi("2026-10-23T12:00:00Z");
for (let i = 0; i < 13; i++) {
  const s = firstFreeSlot(now, day);
  seen.push(label(s));
  day.add(s.getTime());
}
check("12 slots per day", seen.slice(0, 12).every((s) => s.startsWith("2026-10-26")) && seen[12].startsWith("2026-10-27"), seen.join(" "));
check(
  "slot times",
  JSON.stringify(seen.slice(0, 12).map((s) => s.slice(11))) ===
    JSON.stringify(["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "14:30", "15:00", "15:30", "16:00", "16:30"]),
  seen.join(" ")
);
check("month rollover", label(firstFreeSlot(karachi("2026-10-30T12:00:00Z"), new Set())) === "2026-11-02T10:00");

// ----- webhook signature
const body = Buffer.from(JSON.stringify({ hello: "world" }));
const good = "sha256=" + crypto.createHmac("sha256", "secret").update(body).digest("hex");
check("signature ok", verifySignature(body, good, "secret"));
check("signature wrong secret", !verifySignature(body, good, "other"));
check("signature tampered body", !verifySignature(Buffer.from("{}"), good, "secret"));
check("signature missing", !verifySignature(body, undefined, "secret"));

// ----- message text
const slotText = messages.slotMessage({ name: "Ayesha Rauf", role: "MERN Stack Intern", interviewAt: karachi("2026-10-26T14:30:00Z") });
check("slot message", /Hello Ayesha/.test(slotText) && /Monday 26 October/.test(slotText) && /2:30 PM/.test(slotText), slotText);

const slotMail = messages.slotEmail({ name: "Ayesha Rauf", role: "MERN Stack Intern", interviewAt: karachi("2026-10-26T14:30:00Z") });
check("slot email subject", /Monday 26 October/.test(slotMail.subject) && /2:30 PM/.test(slotMail.subject), slotMail.subject);
check("slot email body", /Regards/.test(slotMail.text) && /Hello Ayesha/.test(slotMail.text));
check("reject email", /only considering candidates based in Faisalabad/.test(messages.rejectedEmail({ name: "Ali", role: "X" }).text));

check("slug", roleSlug("E-commerce Sales Executive") === "e-commerce-sales-executive", roleSlug("E-commerce Sales Executive"));
check("slug spaces", roleSlug("  MERN  Stack / Intern ") === "mern-stack-intern");
const testMail = messages.testEmail({ name: "Ayesha Rauf", role: "Online Sales Executive" });
check("test email", /Online Sales Executive/.test(testMail.subject) && /reply to this email/.test(testMail.text));

// today in Karachi: 2026-10-26 02:00 Karachi (= 2026-10-25 21:00 UTC) still belongs to the 26th
const range = karachiDayRange(new Date("2026-10-25T21:00:00Z"));
check("day start", range.start.toISOString() === "2026-10-25T19:00:00.000Z", range.start.toISOString());
check("day end", range.end.toISOString() === "2026-10-26T19:00:00.000Z", range.end.toISOString());
const range2 = karachiDayRange(new Date("2026-10-26T18:59:00Z")); // 23:59 Karachi
check("day end edge", range2.start.toISOString() === "2026-10-25T19:00:00.000Z");

const passMail = messages.passEmail({ name: "Ayesha Rauf", role: "SEO" }, karachi("2026-10-30T14:00:00Z"));
check("pass email", /Friday 30 October/.test(passMail.subject) && /2:00 PM/.test(passMail.text), passMail.subject + passMail.text);
check("day start", karachiDayRange(karachi("2026-10-29T09:30:00Z")).start.getTime() === karachi("2026-10-29T00:00:00Z").getTime());

const { parseKarachi } = require("../src/utils/time");
check("parseKarachi ok", parseKarachi("2026-10-30T14:00").toISOString() === "2026-10-30T09:00:00.000Z");
check("parseKarachi bad", parseKarachi("") === null && parseKarachi("30/10/2026") === null && parseKarachi("2026-13-45T99:00") === null);

if (failed) {
  console.log(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("All checks passed.");
