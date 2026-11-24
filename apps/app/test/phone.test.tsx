// @vitest-environment happy-dom
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { Machine as Strip } from "../gen/app__phone__call.effect.vibe";
import { Machine as Voicemail } from "../gen/app__phone__voicemail.effect.vibe";
import { Dialer } from "../src/phone/phone.vibe";
import { button, closeAll, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** An Alpha image whose host registers eliza's telephony and contacts plugins and Alpha's call plugins. */
const image = () => ({ ...scene(), phone: true, image: true });

/** Press a tab, as a finger does: Radix's tabs choose on the press, before the click. */
const tab = (name: string) => act(async () => {
  const found = [...document.querySelectorAll("[role=tab]")].find((one) => one.textContent === name);
  if (!found) throw new Error(`no tab ${name}`);
  found.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
});

/** Press `name` in the open confirmation. */
const confirm = (name: string) => act(async () => {
  const found = [...document.querySelectorAll("[role=alertdialog] button")].find((one) => one.textContent === name);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`no ${name} in the confirmation`);
  found.click();
});

describe("Phone on an Alpha image", () => {
  it("See my recent calls, and call a number (spec/app/phone/index.md, \"Story: See my recent calls\"; spec/app/phone/index.md, \"Story: Call a number\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);

    // spec/app/phone/index.md, "Phone reads the call log whenever Recents comes to the front"
    await press("Phone");
    await until(alpha, alpha.runtime, Phone, (s) => s.recents.status === "Loaded" && s.rows === 2);
    expect(world.telephony.dialed).toEqual([]);

    // spec/app/phone/index.md, "Tapping a recent call hands its number to the dialer"
    await press("Call Maya Chen");
    await until(alpha, alpha.runtime, Phone, (s) => s.dialled && s.dial.status === "Loaded");
    expect([world.telephony.dialed, world.telephony.placed]).toEqual([["+14155550100"], []]);

    // spec/app/phone/index.md, "The filter and "Retry call history" read the log again"
    await press("Missed");
    await until(alpha, alpha.runtime, Phone, (s) => s.chip === "MissedCalls" && s.recents.status === "Loaded" && s.rows === 1);
  });

  it("Type a number, and call it only when the phone can dial it (spec/app/phone/index.md, \"Story: Type a number\"; spec/app/phone/index.md, \"Story: Call a number\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await press("Phone");
    await tab("Keypad");
    await until(alpha, alpha.runtime, Phone, (s) => s.tab === "Keypad");

    // spec/app/phone/index.md, "Call hands the typed number to the dialer, only if the phone says it is a number it can dial": a partial number is never handed over.
    await press("1");
    await until(alpha, alpha.runtime, Phone, (s) => s.digits === 1 && s.typed === "Partial");
    expect(button("Call")?.disabled).toBe(true);

    // spec/app/phone/index.md, "Each digit, or each digit taken back, is judged by the phone and looked up among the contacts on the phone"
    for (const key of ["4", "1", "5", "5", "5", "5", "0", "1", "0", "0"]) await press(key);
    await until(alpha, alpha.runtime, Phone, (s) => s.typed === "Dialable" && s.matched);
    await press("Call");
    await until(alpha, alpha.runtime, Phone, (s) => s.dialled && s.dial.status === "Loaded");
    expect(world.telephony.dialed).toEqual(["14155550100"]);

    // spec/app/phone/index.md, "Leaving Phone, or leaving Recents, forgets the rows"
    const digits = await alpha.runtime.runPromise(Effect.flatMap(Dialer, (dialer) => dialer.get()));
    expect(digits.digits).toBe("14155550100");
  });

  it("Listen to a voicemail, and delete it (spec/app/phone/voicemail.md, \"Story: Listen to a voicemail\"; spec/app/phone/voicemail.md, \"Story: Delete a voicemail\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await press("Phone");
    await tab("Voicemail");

    // spec/app/phone/voicemail.md, "Voicemail reads the list each time its tab comes to the front"
    await until(alpha, alpha.runtime, Voicemail, (s) => s.list.status === "Loaded" && s.items === 1 && s.unheard === 1);

    // spec/app/phone/voicemail.md, "Opening a voicemail asks for its audio under a new ticket"
    await press("+14155550100");
    await until(alpha, alpha.runtime, Voicemail, (s) => s.open && s.audio.status === "Loaded");

    // spec/app/phone/voicemail.md, "Only the open voicemail's newest audio is taken, and with it a transcript is asked of the phone's own recognizer": this phone has no recognizer, and nothing else is asked.
    await until(alpha, alpha.runtime, Voicemail, (s) => s.noRecognizer);

    // spec/app/phone/voicemail.md, "Play needs the audio, and never plays during a call"
    await press("Play");
    await until(alpha, alpha.runtime, Voicemail, (s) => s.playback === "Playing" && s.heard);
    await until(alpha, alpha.runtime, Voicemail, () => world.telephony.voicemails[0]!.heard);

    // spec/app/phone/voicemail.md, "Delete asks first, stops playback, and Keep closes the question"
    await press("Delete");
    await until(alpha, alpha.runtime, Voicemail, (s) => s.confirming && s.playback === "Stopped");
    expect(world.telephony.voicemails[0]!.deleted).toBe(false);

    // spec/app/phone/voicemail.md, "Confirming removes the open voicemail under a new number"
    await confirm("Delete");
    await until(alpha, alpha.runtime, Voicemail, (s) => s.removal.outcome === "Confirmed" && s.list.status === "Loaded" && s.items === 0);
    expect(world.telephony.voicemails[0]!.deleted).toBe(true);
  });
});

describe("The call strip on an Alpha image", () => {
  it("See my live call over every view, and end it (spec/app/phone/call.md, \"Story: See my live call over every view\"; spec/app/phone/index.md, \"Story: Know when a call is live\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);

    // spec/app/phone/call.md, "While a call rings, Android's incoming alert is the only call bar"
    world.telephony.live = [{ id: "c1", state: "ringing", connectedAt: null }];
    world.telephony.report();
    await until(alpha, alpha.runtime, Strip, (s) => s.calls.length === 1);
    expect(button("End call")).toBeUndefined();

    // spec/app/phone/index.md, "The phone says whether a call is live, whether it may be an emergency call, and whether the carrier is ready"
    world.telephony.live = [{ id: "c1", state: "active", connectedAt: world.now }];
    world.telephony.report();
    await until(alpha, alpha.runtime, Phone, (s) => s.telecom === "OrdinaryCall");
    await until(alpha, alpha.runtime, Strip, (s) => s.shown && s.calls[0]?.phase === "Active");

    // spec/app/phone/call.md, "Return and End act only on the call the bar shows, and End is asked once"
    await press("End call");
    await until(alpha, alpha.runtime, Strip, (s) => !s.shown);
    expect(world.telephony.ended).toEqual(["c1"]);

    // spec/app/phone/index.md, "Alpha acts outside only when the phone has ruled out an emergency call"
    world.telephony.live = [{ id: "c2", state: "active", connectedAt: world.now }];
    world.telephony.emergency = null;
    world.telephony.report();
    await until(alpha, alpha.runtime, Phone, (s) => s.telecom === "MaybeEmergencyCall");
  });

  it("Off an Alpha image there is no call strip and no Phone, Messages or Contacts (spec/app/shell/index.md, \"Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Strip, (s) => s.eligible);
    expect([button("Phone"), button("Messages"), button("Contacts"), button("End call")]).toEqual([undefined, undefined, undefined, undefined]);
  });
});
