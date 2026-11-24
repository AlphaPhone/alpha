// spec/voice/speech.md, "Story: Hear dates and times the way a person says them"; spec/voice/speech.md, "A spoken reply refuses only a likely password, key or card; everything else it cannot say becomes a pause"
import { expect, it } from "vitest";
import { planReading, planReply } from "../../src/voice/spoken-text.ts";

const said = (text: string) => {
  const plan = planReply(text);
  return plan.kind === "speak" ? plan.pieces.join(" ") : plan.reason;
};
const read = (text: string) => {
  const plan = planReading(text);
  return plan.kind === "speak" ? plan.pieces.join(" ") : plan.reason;
};

// spec/voice/speech.md, "A spoken reply or reading says a written date, clock time, range and percentage in words"
it("a written date and clock time are said in words, twelve is noon or midnight, and a range joins with to", () => {
  expect({
    date: said("Your dentist is Mon, Nov 23 at 3:30 pm."),
    abbreviated: said("Sun Microsystems. Deadline: Sept. 1 at 9:05 a.m."),
    noon: said("Availability: Sun, Nov 22, 12:00 PM - 12:30 PM."),
    midnight: said("The sale ends at 12 am, and the store opens at 0:00."),
    clocks: said("Lunch at 7:00 then 9:05, and the call is at 14:30."),
    ranges: said("Times: 2-3 p.m., 09:05–10:00, 18:30 to 19:00. It takes 5-10 minutes."),
    percent: said("Battery is at 45%."),
  }).toEqual({
    date: "Your dentist is Monday, November twenty third at three thirty P M.",
    abbreviated: "Sun Microsystems. Deadline, September first at nine oh five A M.",
    noon: "Availability, Sunday, November twenty second, noon to twelve thirty P M.",
    midnight: "The sale ends at midnight, and the store opens at midnight.",
    clocks: "Lunch at seven o'clock then nine oh five, and the call is at two thirty P M.",
    ranges: "Times, two to three P M, nine oh five to ten o'clock, six thirty P M to seven P M. It takes 5 to 10 minutes.",
    percent: "Battery is at 45 percent.",
  });
});

// spec/voice/speech.md, "A spoken reply or reading says a written date, clock time, range and percentage in words"
it("a Calendar heading's colon is a pause after its date, and a reading says dates the same way", () => {
  expect({
    heading: said("Here are three 30-minute options for tomorrow, Sun, Nov 22:"),
    slots: said("Sun, Nov 22: 1. 12:00-12:30 PM"),
    reading: read("Dinner with Ann on Fri, Dec 4 at 7:30 pm."),
  }).toEqual({
    heading: "Here are three 30 minute options for tomorrow, Sunday, November twenty second.",
    slots: "Sunday, November twenty second, 1. twelve o'clock to twelve thirty P M",
    reading: "Dinner with Ann on Friday, December fourth at seven thirty P M.",
  });
});

// spec/voice/speech.md, "A spoken reply or reading says a written date, clock time, range and percentage in words"
it("phone numbers, ISO dates, offsets, money and a lower-case month word keep how they were said before", () => {
  expect({
    phone: said("Call 555-123-4567 later."),
    iso: said("Due on 2026-11-06 at 10:30."),
    offset: said("UTC+01:00 applies."),
    money: said("It costs $12.50, or $1,299 in all."),
    verb: said("You may 3 times."),
    timestamp: said("See Nov 22:30 in the transcript."),
  }).toEqual({
    phone: "Call 555, 123, 4567 later.",
    iso: "Due on 2026, 11, 06 at ten thirty.",
    offset: "UTC plus 01 colon 00 applies.",
    money: "It costs 12 dollars 50, or 1299 dollars in all.",
    verb: "You may 3 times.",
    timestamp: "See Nov ten thirty P M in the transcript.",
  });
});

// spec/voice/speech.md, "A spoken reply refuses only a likely password, key or card; everything else it cannot say becomes a pause"
it("a likely secret is still refused before any date or time is said", () => {
  expect({ reply: said("Your wifi password is: 12:30 pm"), reading: read("The secret: Mon, Nov 23") }).toEqual({ reply: "secret", reading: "secret" });
});
