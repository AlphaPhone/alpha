// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as View } from "../gen/app__calendar.effect.vibe";
import { Machine as Editor } from "../gen/app__calendar__editor.effect.vibe";
import calendar from "../src/calendar/index.tsx";
import { button, closeAll, drawn, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const options = ["Once", "Daily", "Weekdays", "Weekly", "Video link", "None", "At start", "10 min", "1 hour"];

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  // spec/app/calendar/index.md, "Calendar asks for the phone's calendar only while it lacks it, and only once"; spec/app/calendar/writing.md, "The form offers with the agent's calendar only what it holds, and keeps the calendar chosen"
  it("New event asks for the phone's calendar and draws every option, with no notice asking first (spec/app/calendar/index.md, \"Story: Let Calendar read my phone's calendar\")", async () => {
    const world = { ...scene(), phone };
    world.now = new Date(2026, 10, 24, 9).getTime();
    world.calendar.down = true;
    world.calendar.phoneEvents.push({ id: "p1", calendarId: "local", title: "Gym", begin: new Date(2026, 10, 24, 18).getTime(), end: new Date(2026, 10, 24, 19).getTime(), allDay: false, recurring: false });
    const { alpha } = await open(world, only("view:Calendar"));
    const runtime = calendar.runtime(alpha);
    await drawn(() => alpha.runtime.runPromise(Shell.use((shell) => shell.send({ type: "openView", view: "Calendar" }))));
    await until(alpha, runtime, View, (state) => state.front && state.owner > 0 && !state.connected);
    expect([Boolean(button("Allow")), document.body.textContent?.includes("needs access"), world.calendar.asked]).toEqual([false, false, 0]);

    await press("New event");
    await until(alpha, runtime, Editor, (state) => state.shown && state.form === "NewEvent");
    await until(alpha, runtime, View, (state) => state.access.asked === phone);
    if (phone) await until(alpha, runtime, View, (state) => state.phoneRows === 1);
    expect([world.calendar.asked, options.filter((name) => button(name) === undefined)]).toEqual([phone ? 1 : 0, []]);
  });
});
