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

// ----- Emails (same wording as WhatsApp, with a subject and a sign-off)
const signOff = "\n\nRegards,\nAR Swift HR Team\nAR Swift Private Limited";

function slotEmail(candidate) {
  const when = new Date(candidate.interviewAt);
  return {
    subject: `Your interview at AR Swift: ${dateFmt.format(when)}, ${timeFmt.format(when).toUpperCase()}`,
    text: slotMessage(candidate) + signOff,
  };
}

function rejectedEmail(candidate) {
  return {
    subject: "Your application at AR Swift Private Limited",
    text: rejectedMessage(candidate) + signOff,
  };
}

function noSlotsEmail(candidate) {
  return {
    subject: "Your application at AR Swift Private Limited",
    text: noSlotsMessage(candidate) + signOff,
  };
}

function testEmail(candidate) {
  return {
    subject: `Your test at AR Swift: ${candidate.role}`,
    text:
      `Hello ${firstName(candidate)}, thank you for coming to AR Swift Private Limited.\n\n` +
      `Your test for the ${candidate.role} position is attached as a PDF. ` +
      `Please open the PDF on a laptop or computer, type your answers inside it, save it, and reply to this email with the file attached. ` +
      `The PDF may not be editable on a phone.` +
      signOff,
  };
}

function passEmail(candidate, meetingAt) {
  const when = new Date(meetingAt);
  return {
    subject: `Next step at AR Swift: meeting with our CEO on ${dateFmt.format(when)}`,
    text:
      `Hello ${firstName(candidate)}, congratulations! You have passed the test for the ${candidate.role} position at AR Swift Private Limited.\n\n` +
      `The final step is a meeting with our CEO on ${dateFmt.format(when)} at ${timeFmt.format(when).toUpperCase()}.\n\n` +
      `Please arrive 10 minutes early.` +
      signOff,
  };
}

module.exports = {
  slotMessage,
  passEmail,
  testEmail,
  rejectedMessage,
  notFoundMessage,
  noSlotsMessage,
  slotEmail,
  rejectedEmail,
  noSlotsEmail,
};
