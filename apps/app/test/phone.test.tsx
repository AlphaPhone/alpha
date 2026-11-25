// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { Machine as Strip } from "../gen/app__phone__call.effect.vibe";
import { Machine as Comms } from "../gen/app__phone__comms.effect.vibe";
import { Machine as Voicemail } from "../gen/app__phone__voicemail.effect.vibe";
import { Machine as Agent } from "../gen/app__contacts__agent.effect.vibe";
import { at } from "../src/areas.ts";
import { propose } from "../src/contacts/requests.vibe";
import home from "../src/home/index.tsx";
import { phoneAction } from "../src/phone/agent.vibe";
import { phoneContactChoices, pickPhoneContact } from "../src/phone/named-review.vibe";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, drawn, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** An Alpha image whose host registers eliza's telephony and contacts plugins and Alpha's call plugins. */
const image = () => ({ ...scene(), phone: true, image: true, now: 1_700_000_400_000 });
const mounts = [
  ...only("home", "assistant", "notice", "phone/stage", "view:Phone", "view:Contacts", "view:Messages"),
  at("overlay", () => import("../src/phone/strip.tsx")),
  at("overlay", () => import("../src/contacts/requestCard.tsx")),
];
const openPhoneWorld = (world = image()) => open(world, mounts);
const phoneTile = () => document.querySelector<HTMLButtonElement>("[data-home-tile='view:Phone']");

async function openPhone(alpha: Alpha) {
  await until(alpha, home.runtime(alpha), Home, (state) => state.tiles.load.status === "Loaded");
  await drawn(() => {
    const tile = phoneTile();
    if (!tile) throw new Error("no Phone tile on Home");
    tile.click();
  });
  await until(alpha, alpha.runtime, Phone, (state) => state.front);
}

const pressPhoneCard = () => drawn(() => {
  const cards = document.querySelectorAll<HTMLButtonElement>("[aria-label='Your day'] button");
  const card = [...cards].find((item) => item.textContent?.startsWith("Phone"));
  if (!card) throw new Error("no call card on Home");
  card.click();
});

const pressVoicemailRow = (expanded = false) => drawn(() => {
  const row = document.querySelector<HTMLButtonElement>(`button[aria-expanded='${expanded}'][aria-label^='Voicemail from']`);
  if (!row) throw new Error(`no ${expanded ? "open" : "closed"} voicemail row`);
  row.click();
});

/** Press a tab, as a finger does: Radix's tabs choose on the press, before the click. */
const tab = (name: string) => act(async () => {
  const found = [...document.querySelectorAll("[role=tab]")].find((one) => one.textContent === name);
  if (!found) throw new Error(`no tab ${name}`);
  found.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
});

/** The button named `name` in the agent's request, if it offers one. */
const inReview = (name: string) => [...document.querySelectorAll("[role=dialog] button")].find((one) => one.textContent === name);

/** Press `name` in the open confirmation. */
const confirm = (name: string) => act(async () => {
  const found = [...document.querySelectorAll("[role=alertdialog] button, [aria-label='Delete voicemail'] button")].find((one) => one.textContent === name);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`no ${name} in the confirmation`);
  found.click();
});

describe("Phone on an Alpha image", () => {
  it("See my recent calls, and call a number (spec/app/phone/index.md, \"Story: See my recent calls\"; spec/app/phone/index.md, \"Story: Call a number\")", async () => {
    const world = image();
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);

    // spec/app/phone/index.md, "Phone reads the call log whenever Recents comes to the front"
    await openPhone(alpha);
    await until(alpha, alpha.runtime, Phone, (s) => s.carrier === "CarrierReady" && s.telecom === "NoCall" && s.recents.status === "Loaded" && s.rows === 2);
    expect(world.telephony.dialed).toEqual([]);

    // spec/app/phone/index.md, "Tapping a recent call hands its number to the dialer"; spec/app/phone/index.md, "With the dialer role a call is placed through Telecom, and counts as started only when Telecom accepted it"
    await press("Call Maya Chen");
    await until(alpha, alpha.runtime, Phone, (s) => s.dialled && s.dial.status === "Loaded");
    expect([world.telephony.dialed, world.telephony.placed]).toEqual([[], ["+14155550100"]]);

    // spec/app/phone/index.md, "The filter and "Retry call history" read the log again"
    await press("Missed");
    await until(alpha, alpha.runtime, Phone, (s) => s.chip === "MissedCalls" && s.recents.status === "Loaded" && s.rows === 1);
  });

  it("Type a number, and call it only when the phone can dial it (spec/app/phone/index.md, \"Story: Type a number\"; spec/app/phone/index.md, \"Story: Call a number\")", async () => {
    const world = image();
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await openPhone(alpha);
    await tab("Keypad");
    await until(alpha, alpha.runtime, Phone, (s) => s.tab === "Keypad");

    // spec/app/phone/index.md, "With the dialer role a call is placed through Telecom, and counts as started only when Telecom accepted it": without the role the dial screen opens with the number.
    world.telephony.dialer = false;

    // spec/app/phone/index.md, "Call hands the typed number to the dialer, only if the phone says it is a number it can dial": a partial number is never handed over.
    await press("1");
    await until(alpha, alpha.runtime, Phone, (s) => s.digits === 1 && s.typed === "Partial");
    expect(button("Call")?.disabled).toBe(true);

    // spec/app/phone/index.md, "Each digit, or each digit taken back, is judged by the phone and looked up among the contacts on the phone"
    for (const key of ["4", "1", "5", "5", "5", "5", "0", "1", "0", "0"]) await press(key);
    await until(alpha, alpha.runtime, Phone, (s) => s.typed === "Dialable" && s.matched && s.carrier === "CarrierReady" && s.telecom === "NoCall");
    await press("Call");
    await until(alpha, alpha.runtime, Phone, (s) => s.dialled && s.dial.status === "Loaded");
    expect([world.telephony.dialed, world.telephony.placed]).toEqual([["14155550100"], []]);

    // spec/app/phone/index.md, "Leaving Phone, or leaving Recents, forgets the rows"
    await tab("Recents");
    await until(alpha, alpha.runtime, Phone, (s) => s.tab === "Recents" && s.recents.status === "Loaded" && s.rows === 2);
    await hardware("home");
    await until(alpha, alpha.runtime, Phone, (s) => !s.front && s.rows === 0);
  });

  it(`Opens the reviewed keypad without dialing (spec/app/phone/index.md, "A number handed to Phone opens the keypad with it filled in, and never dials")`, async () => {
    const world = image();
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    const operation = { type: "phone_keypad", number: "+14155550100" } as const;
    await act(async () => {
      expect(await alpha.runtime.runPromise(phoneAction(operation, () => Promise.resolve(true)))).toEqual({
        kind: "applied", result: { kind: "phone-keypad", status: "opened" },
      });
    });
    await until(alpha, alpha.runtime, Phone, (s) => s.front && s.tab === "Keypad" && s.digits === 12);
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([[], []]);
  });

  it(`Does not dispatch an expired call approval (spec/app/contacts/agent.md, "Only the owner approves, only what is shown as it is now, and only when the phone has ruled out an emergency call")`, async () => {
    const world = image();
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    const operation = { type: "phone_call", target: { kind: "number", number: "+14155550100" } } as const;
    await act(async () => {
      expect(await alpha.runtime.runPromise(phoneAction(operation, () => Promise.resolve(false)))).toMatchObject({ kind: "refused" });
    });
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([[], []]);
  });

  it(`Calls the chosen current contact number once (spec/app/contacts/agent.md, "The owner picks the exact number or the one contact, and that one is shown"; spec/app/contacts/agent.md, "Nothing is done but what the owner approved, as it was shown, once")`, async () => {
    const world = image();
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (state) => state.image);
    await until(alpha, alpha.runtime, Phone, (state) => state.telecom === "NoCall" && state.carrier === "CarrierReady");
    const query = "Maya Chen";
    const operation = { type: "phone_call", target: { kind: "contact", query } } as const;
    const current = () => Promise.resolve(true);

    const choices = await alpha.runtime.runPromise(phoneContactChoices(query));
    if (choices.tag !== "Choices" || choices.options.length !== 1) throw new Error("expected one exact choice");
    expect(choices.options[0]?.number).toBe("+14155550100");
    expect(await alpha.runtime.runPromise(phoneAction(operation, current))).toMatchObject({ kind: "refused" });
    const reviewed = await alpha.runtime.runPromise(pickPhoneContact(query, choices.options[0]!));
    if (reviewed.tag !== "Exact") throw new Error("expected the chosen number's review");
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([[], []]);

    const provider = world.telephony.people.find((person) => person.id === reviewed.selected.contact);
    if (!provider) throw new Error("expected the native contact");
    provider.phoneNumbers[0]!.number = "+14155550122";
    provider.revision += 1;
    expect(await alpha.runtime.runPromise(phoneAction(operation, current, reviewed.selected))).toMatchObject({ kind: "refused" });
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([[], []]);

    const revised = await alpha.runtime.runPromise(phoneContactChoices(query));
    if (revised.tag !== "Choices" || !revised.options[0]) throw new Error("expected the replacement number as a fresh choice");
    const exact = await alpha.runtime.runPromise(pickPhoneContact(query, revised.options[0]));
    if (exact.tag !== "Exact") throw new Error("expected a fresh number review");
    expect(await alpha.runtime.runPromise(phoneAction(operation, current, exact.selected))).toEqual({
      kind: "applied", result: { kind: "phone-call", status: "placed", contact: true },
    });
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([["+14155550122"], []]);
  });

  it("Gates ordinary calls on Android's carrier and emergency readings (spec/app/phone/index.md, \"Story: Know when a call is live\")", async () => {
    const world = image();
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await openPhone(alpha);
    await until(alpha, alpha.runtime, Phone, (s) => s.carrier === "CarrierReady" && s.recents.status === "Loaded");
    expect(button("Call Maya Chen")?.disabled).toBe(false);

    world.telephony.mobileService = false;
    act(() => world.telephony.report());
    await until(alpha, alpha.runtime, Phone, (s) => s.carrier === "CarrierUnavailable");
    expect(button("Call Maya Chen")?.disabled).toBe(true);

    world.telephony.mobileService = true;
    world.telephony.live = [{ id: "possible-emergency", state: "active", connectedAt: world.now }];
    world.telephony.emergency = null;
    act(() => world.telephony.report());
    await until(alpha, alpha.runtime, Phone, (s) => s.carrier === "CarrierReady" && s.telecom === "MaybeEmergencyCall");
    expect(button("Call Maya Chen")?.disabled).toBe(true);
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([[], []]);
  });

  it("Hands off to the system dialer when cell service or call state is unknown (spec/app/phone/index.md, \"Story: Call a number\")", async () => {
    const world = image();
    world.telephony.mobileService = undefined;
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await openPhone(alpha);
    await until(alpha, alpha.runtime, Phone, (s) => s.carrier === "CarrierUnknown" && s.telecom === "NoCall" && s.recents.status === "Loaded");
    await press("Call Maya Chen");
    await until(alpha, alpha.runtime, Phone, (s) => s.dial.status === "Loaded");
    expect([world.telephony.dialed, world.telephony.placed]).toEqual([["+14155550100"], []]);

    await hardware("home");
    await until(alpha, alpha.runtime, Phone, (s) => !s.front);
    world.telephony.mobileService = true;
    world.telephony.callStateKnown = false;
    act(() => world.telephony.report());
    await openPhone(alpha);
    await until(alpha, alpha.runtime, Phone, (s) => s.carrier === "CarrierReady" && s.telecom === "CallUnknown" && s.recents.status === "Loaded");
    const operation = { type: "phone_call", target: { kind: "number", number: "+14155550100" } } as const;
    await act(async () => {
      expect(await alpha.runtime.runPromise(phoneAction(operation, () => Promise.resolve(true)))).toMatchObject({ kind: "refused" });
    });
    await press("Call Maya Chen");
    await until(alpha, alpha.runtime, Phone, (s) => s.dial.status === "Loaded");
    expect([world.telephony.dialed, world.telephony.placed]).toEqual([["+14155550100", "+14155550100"], []]);
  });

  it("Lets Android determine which emergency numbers can open the dialer without service (spec/app/phone/index.md, \"Story: Call a number\")", async () => {
    const world = image();
    world.telephony.mobileService = false;
    world.telephony.emergencyNumbers.add("09");
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await openPhone(alpha);
    await tab("Keypad");
    await until(alpha, alpha.runtime, Phone, (s) => s.tab === "Keypad" && s.carrier === "CarrierUnavailable");
    await press("0");
    await press("9");
    await until(alpha, alpha.runtime, Phone, (s) => s.numberKind === "EmergencyNumber");
    await press("Call");
    await until(alpha, alpha.runtime, Phone, (s) => s.dial.status === "Loaded");
    expect([world.telephony.dialed, world.telephony.placed]).toEqual([["09"], []]);
  });

  it("See missed calls on Home, then unheard voicemail (spec/app/phone/index.md, \"Story: See missed calls on Home\"; spec/app/phone/voicemail.md, \"Story: See my voicemail\")", async () => {
    const world = image();
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);

    // spec/app/phone/index.md, "Home shows the missed-calls card while there are missed calls not yet seen"; spec/app/phone/index.md, "One tap on the card opens Recents with the missed calls, and otherwise the Voicemail tab while a voicemail is unheard"
    await until(alpha, alpha.runtime, Phone, (s) => s.missed === 1 && s.voicemail);
    await pressPhoneCard();
    await until(alpha, alpha.runtime, Phone, (s) => s.front && s.tab === "Recents" && s.chip === "MissedCalls" && s.recents.status === "Loaded" && s.rows === 1 && s.missed === 0);

    // spec/app/phone/voicemail.md, "The phone reports how many voicemails are unheard, for Home and the tab"
    world.telephony.calls = world.telephony.calls.filter((one) => one.type !== "missed");
    await hardware("home");
    await until(alpha, alpha.runtime, Phone, (s) => !s.front && s.missed === 0);
    await until(alpha, alpha.runtime, Voicemail, (s) => s.unheard === 1);
    await pressPhoneCard();
    await until(alpha, alpha.runtime, Voicemail, (s) => s.front && s.list.status === "Loaded" && s.items === 1);

    // spec/app/phone/comms.md, "A subject is briefed once, only with the conversation open, and never from fixtures"
    await press("Open Alpha");
    await until(alpha, alpha.runtime, Comms, (state) => state.height === "SheetOpen" && state.briefed === state.key);
    const briefing = [...document.querySelectorAll('[aria-label="Ask Alpha"] article')].filter((row) => row.textContent?.includes("You have 1 new voicemail."));
    expect(briefing).toHaveLength(1);

    // spec/app/phone/index.md, "The Voicemail tab is offered only while the carrier's visual voicemail is ready"
    world.telephony.carrier = "unconfigured";
    await hardware("home");
    await until(alpha, alpha.runtime, Phone, (s) => !s.voicemail && s.tab === "Recents");
    await openPhone(alpha);
    await until(alpha, alpha.runtime, Phone, (s) => s.front && s.recents.status === "Loaded");
    const tabs = [...document.querySelectorAll("[role=tab]")].map((one) => one.textContent);
    expect(tabs).toContain("Recents");
    expect(tabs).toContain("Keypad");
    expect(tabs).not.toContain("Voicemail");
  });

  it("See my voicemail, listen to one, and delete it (spec/app/phone/voicemail.md, \"Story: See my voicemail\"; spec/app/phone/voicemail.md, \"Story: Listen to a voicemail\"; spec/app/phone/voicemail.md, \"Story: Delete a voicemail\")", async () => {
    const world = image();
    world.voice.onDevice = false;
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await openPhone(alpha);
    await until(alpha, alpha.runtime, Phone, (s) => s.voicemail);
    await tab("Voicemail");

    // spec/app/phone/voicemail.md, "Voicemail reads the list each time its tab comes to the front"
    await until(alpha, alpha.runtime, Voicemail, (s) => s.list.status === "Loaded" && s.items === 1 && s.unheard === 1);

    // spec/app/phone/voicemail.md, "Opening a voicemail asks for its audio under a new ticket"
    await pressVoicemailRow();
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

  it(`Shows only the transcript of the current opening (spec/app/phone/voicemail.md, "Only the open voicemail's newest transcript is shown")`, async () => {
    const world = image();
    const first = Promise.withResolvers<string>();
    const reopened = Promise.withResolvers<string>();
    const requests: { id: string; requestId: string }[] = [];
    world.voice.voicemailTranscription = (id, requestId) => {
      requests.push({ id, requestId });
      return requests.length === 1 ? first.promise : reopened.promise;
    };
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await openPhone(alpha);
    await until(alpha, alpha.runtime, Phone, (s) => s.voicemail);
    await tab("Voicemail");
    await until(alpha, alpha.runtime, Voicemail, (s) => s.list.status === "Loaded" && s.items === 1);

    await pressVoicemailRow();
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    await pressVoicemailRow(true);
    await vi.waitFor(() => expect(world.voice.canceledVoicemailTranscriptions).toEqual([requests[0]?.requestId]));

    await pressVoicemailRow();
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests.map(({ id }) => id)).toEqual(["11", "11"]);
    expect(requests[0]?.requestId).not.toBe(requests[1]?.requestId);
    await drawn(() => first.resolve("A late transcript"));
    expect(document.querySelector("[data-alpha-phone-transcript]")).toBeNull();

    await drawn(() => reopened.resolve("The current transcript"));
    await until(alpha, alpha.runtime, Voicemail, (s) => s.transcript.status === "Loaded");
    expect(document.querySelector("[data-alpha-phone-transcript]")?.textContent).toBe("The current transcript");
  });

  it(`Keeps a voicemail only when Android confirms Undo (spec/app/phone/voicemail.md, "Undo can keep a voicemail while Android's deletion window is open")`, async () => {
    const world = image();
    world.telephony.holdVoicemailDeletion = true;
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await openPhone(alpha);
    await until(alpha, alpha.runtime, Phone, (s) => s.front && s.voicemail);
    await tab("Voicemail");
    await until(alpha, alpha.runtime, Voicemail, (s) => s.list.status === "Loaded" && s.items === 1);
    await pressVoicemailRow();
    await until(alpha, alpha.runtime, Voicemail, (s) => s.open);
    await press("Delete");
    await until(alpha, alpha.runtime, Voicemail, (s) => s.confirming);
    await confirm("Delete");
    await until(alpha, alpha.runtime, Voicemail, (s) => s.undo === "CanUndo" && s.removal.outcome === "Sent");
    expect(world.telephony.voicemails[0]!.deleted).toBe(false);
    await press("Undo");
    await until(alpha, alpha.runtime, Voicemail, (s) => s.undo === "Kept" && s.list.status === "Loaded" && s.items === 1);
    expect(world.telephony.staged[0]?.phase).toBe("undone");
    expect(world.telephony.voicemails[0]!.deleted).toBe(false);
  });
});

describe("The call strip on an Alpha image", () => {
  it("See my live call over every view, and end it (spec/app/phone/call.md, \"Story: See my live call over every view\"; spec/app/phone/index.md, \"Story: Know when a call is live\")", async () => {
    const world = image();
    const { alpha } = await openPhoneWorld(world);
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
    await act(async () => {
      const bar = document.querySelector("[role=region][aria-label='Ongoing call'] button");
      if (!(bar instanceof HTMLButtonElement)) throw new Error("no call bar");
      bar.click();
    });
    await until(alpha, alpha.runtime, Strip, () => world.telephony.returned.length === 1);
    expect(world.telephony.returned).toEqual(["c1"]);
    await press("End call");
    await until(alpha, alpha.runtime, Strip, (s) => !s.shown);
    expect(world.telephony.ended).toEqual(["c1"]);

    // spec/app/phone/index.md, "Alpha acts outside only when the phone has ruled out an emergency call"
    world.telephony.live = [{ id: "c2", state: "active", connectedAt: world.now }];
    world.telephony.emergency = null;
    world.telephony.report();
    await until(alpha, alpha.runtime, Phone, (s) => s.telecom === "MaybeEmergencyCall");
    await alpha.runtime.runPromise(propose({ type: "phone_call", target: { kind: "number", number: "+14155550122" } }, true));
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.ask === "Dial");
    expect([inReview("Call"), world.telephony.dialed]).toEqual([undefined, []]);
  });

  it("Off an Alpha image there is no call strip and no Phone, Messages or Contacts (spec/app/shell/index.md, \"Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await openPhoneWorld(world);
    await until(alpha, alpha.runtime, Strip, (s) => s.eligible);
    await until(alpha, home.runtime(alpha), Home, (state) => state.tiles.load.status === "Loaded");
    expect(document.querySelector("[data-home-tile='view:Phone'], [data-home-tile='view:Messages'], [data-home-tile='view:Contacts']")).toBeNull();
    expect(button("End call")).toBeUndefined();
  });
});
