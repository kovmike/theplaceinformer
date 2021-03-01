const functions = require("firebase-functions");
const fs = require("fs");
const { google } = require("googleapis");
const SMSru = require("sms_ru");

const CALENDAR_ID = "010e056vkftbth7gcr9e4t0af8@group.calendar.google.com";
const KEYFILE = "configCalendar.json"; // path to JSON with private key been downloaded from Google
const SCOPE_CALENDAR = "https://www.googleapis.com/auth/calendar"; // authorization scopes
const SCOPE_EVENTS = "https://www.googleapis.com/auth/calendar.events";

exports.thePlaceInformer = functions.pubsub.schedule("00 * * * *").onRun(async (context) => {
  try {
    const key = readPrivateKey();
    const auth = await authentificate(key);
    await getList(auth);
  } catch (err) {
    console.log(err);
  }
});

function readPrivateKey() {
  const content = fs.readFileSync(KEYFILE);
  return JSON.parse(content.toString());
}

async function authentificate(key) {
  const jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, [SCOPE_CALENDAR, SCOPE_EVENTS]);
  await jwtClient.authorize();
  return jwtClient;
}

async function getList(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  calendar.events.list(
    { calendarId: CALENDAR_ID, timeMin: new Date().toISOString(), maxResults: 10, singleEvents: true, orderBy: "startTime" },
    (err, res) => {
      if (err) return console.log(err);
      const events = res.data.items;
      if (events.length) {
        const sms = new SMSru("C2288C95-BB2D-97B7-3900-1000BA53715C");
        events.forEach((event) => {
          if (event.description) {
            const start = event.start.dateTime || event.start.date;
            const now = new Date();
            const delta = (new Date(start).getTime() - now.getTime()) / 36e5;
            if (delta < 24 && delta > 23)
              sms.sms_send({ to: event.description, text:  `Вы записаны` }, (e) => {
                console.log(e.description);
              });
          }
        });
      } else {
        console.log("No upcoming events found.");
      }
    }
  );
}