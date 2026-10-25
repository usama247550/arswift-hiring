// Every message the system sends to a candidate on WhatsApp lives here.
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Karachi",
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Karachi",
});

const firstName = (candidate) => String(candidate.name || "").trim().split(/\s+/)[0] || "there";

function slotMessage(candidate) {
  const when = new Date(candidate.interviewAt);
  return (
    `Hello ${firstName(candidate)}, thank you for applying for the ${candidate.role} position at AR Swift Private Limited.\n\n` +
    `Your interview is on ${dateFmt.format(when)} at ${timeFmt.format(when).toUpperCase()}.\n\n` +
    `Please arrive 10 minutes early.`
  );
}

function rejectedMessage(candidate) {
  return (
    `Hello ${firstName(candidate)}, thank you for applying for the ${candidate.role} position at AR Swift Private Limited. ` +
    `At this time we are only considering candidates based in Faisalabad, so we are unable to move forward with your application. ` +
    `We wish you the best in your job search.`
  );
}

function notFoundMessage() {
  const form = process.env.FORM_URL ? ` Application form: ${process.env.FORM_URL}` : "";
  return (
    `Hello, thank you for contacting AR Swift Private Limited. We could not find your application. ` +
    `Please fill in the application form using this WhatsApp number, then message us again.${form}`
  );
}

function noSlotsMessage(candidate) {
  return `Hello ${firstName(candidate)}, thank you for applying. Our interview slots are full right now, and our team will contact you with a new time.`;
}

module.exports = { slotMessage, rejectedMessage, notFoundMessage, noSlotsMessage };
