const functions = require("firebase-functions");
const fs = require("fs");
const { google } = require("googleapis");
const SMSru = require("sms_ru");

//const CALENDAR_ID = "010e056vkftbth7e4t0af8@group.calendar.google.com"; - old
const KEYFILE = "configCalendar.json";
const SCOPE_CALENDAR = "https://www.googleapis.com/auth/calendar"; // authorization scopes
const SCOPE_EVENTS = "https://www.googleapis.com/auth/calendar.events";

const readPrivateKey = () => {
  const content = fs.readFileSync(KEYFILE);
  return JSON.parse(content.toString());
};

const authentificate = async (key) => {
  const jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, [SCOPE_CALENDAR, SCOPE_EVENTS]);
  await jwtClient.authorize();
  return jwtClient;
};

const getList = async (auth, smsKey, calendarID) => {
  const calendar = google.calendar({ version: "v3", auth });
  calendar.events.list(
    { calendarId: calendarID, timeMin: new Date().toISOString(), maxResults: 15, singleEvents: true, orderBy: "startTime" },
    (err, res) => {
      if (err) return console.log(err);
      const events = res.data.items;
      if (events.length) {
        const sms = new SMSru(smsKey);
        events.forEach((event) => {
          if (event.description) {
            const start = new Date(event.start.dateTime || event.start.date);
            const day = start.getDate();
            const month = start.getMonth() + 1;
            const hour = start.getHours();
            const minutes = start.getMinutes() < 10 ? "0" + start.getMinutes() : start.getMinutes();
            const now = new Date();
            const delta = (start.getTime() - now.getTime()) / 36e5;
            if (delta < 24 && delta > 23)
              sms.sms_send(
                { to: event.description, text: `Вы записаны на ${day}.${month} в ${hour}:${minutes}`, from: "ThePlace" },
                (e) => {
                  console.log(e.description);
                }
              );
          }
        });
        return 1;
      } else {
        return console.log("No upcoming events found.");
      }
    }
  );
};

exports.thePlaceInformer = functions.pubsub.schedule("00 * * * *").onRun(async (context) => {
  try {
    const key = readPrivateKey();
    const auth = await authentificate(key);
    await getList(auth, key.sms_key, key.calendar_id);
  } catch (err) {
    console.log(err);
  }
});
