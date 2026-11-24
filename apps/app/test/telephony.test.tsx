// @vitest-environment happy-dom
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Bar } from "../gen/app__telephony__callBar.effect.vibe";
import { Machine as Contacts } from "../gen/app__telephony__contacts.effect.vibe";
import { Machine as Drafts } from "../gen/app__telephony__drafts.effect.vibe";
import { Machine as Messages } from "../gen/app__telephony__messages.effect.vibe";
import { Machine as Phone } from "../gen/app__telephony__phone.effect.vibe";
import { Machine as Voicemail } from "../gen/app__telephony__voicemail.effect.vibe";
import addressBook from "../src/telephony/addressBook.tsx";
import phoneArea from "../src/telephony/index.tsx";
import { button, closeAll, hardware, open, press, underAct, until } from "./alpha.tsx";
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

/** Type into the text box named `name`, as a person does. */
const write = (name: string, text: string) => act(async () => {
  const found = [...document.querySelectorAll("textarea, input")].find((one) => one.getAttribute("aria-label") === name || one.closest("label")?.textContent?.startsWith(name));
  if (!(found instanceof HTMLTextAreaElement || found instanceof HTMLInputElement)) throw new Error(`no field ${name}`);
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(found) as object, "value")?.set?.call(found, text);
  found.dispatchEvent(new Event("input", { bubbles: true }));
});

describe("Phone on an Alpha image", () => {
  // spec/app/telephony/phone.md, "Story: Read my recent calls while Phone is open"; spec/app/telephony/phone.md, "Story: Call a number myself"
  it("Read my recent calls while Phone is open, and call a number myself (spec/app/telephony/phone.md, \"Story: Read my recent calls while Phone is open\"; spec/app/telephony/phone.md, \"Story: Call a number myself\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);

    // spec/app/telephony/phone.md, "Showing Phone starts a read, and leaving it forgets the rows, the field and the notice"
    await press("Phone");
    await until(alpha, alpha.runtime, Phone, (s) => s.recents.status === "Loaded" && s.rows.length === 2);
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([[], []]);

    // spec/app/telephony/phone.md, "Dial hands one number at a time to Telecom, and only from the showing it started in": only the owner's tap places it.
    await press("Call Maya Chen");
    await until(alpha, alpha.runtime, Phone, (s) => s.call.outcome === "Confirmed");
    expect(world.telephony.placed).toEqual(["+14155550100"]);

    // spec/app/telephony/phone.md, "Dial hands one number at a time to Telecom, and only from the showing it started in": a number that cannot be dialed is refused before the phone.
    await tab("Keypad");
    await until(alpha, alpha.runtime, Phone, (s) => s.tab === "KeypadTab");
    await press("1");
    await press("Call");
    await until(alpha, alpha.runtime, Phone, (s) => s.notice.tag === "InvalidNumber");
    expect(world.telephony.placed).toEqual(["+14155550100"]);

    // spec/app/telephony/common.md, "A call is reported started only when Telecom accepted it, and a lost answer is never "not called"": without the phone role the dial screen opens with the number.
    world.telephony.dialer = false;
    for (const key of ["4", "1", "5", "5", "5", "5", "0", "1", "2", "2"]) await press(key);
    await press("Call");
    await until(alpha, alpha.runtime, Phone, (s) => s.notice.tag === "Placement" && s.notice.outcome === "DialerOpened");
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([["+14155550100"], ["14155550122"]]);

    // spec/app/telephony/phone.md, "Showing Phone starts a read, and leaving it forgets the rows, the field and the notice"
    await hardware("back");
    await until(alpha, alpha.runtime, Phone, (s) => !s.shown);
    expect(await alpha.runtime.runPromise(Effect.flatMap(Phone, (phone) => phone.get()))).toMatchObject({ rows: [], number: "", notice: { tag: "Quiet" } });
  });

  // spec/app/telephony/voicemail.md, "Story: Hear a voicemail"; spec/app/telephony/voicemail.md, "Story: Delete one voicemail I chose"
  it("Hear a voicemail, and delete one I chose (spec/app/telephony/voicemail.md, \"Story: Hear a voicemail\"; spec/app/telephony/voicemail.md, \"Story: Delete one voicemail I chose\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    const voicemail = phoneArea.runtime(alpha);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await press("Phone");

    // spec/app/telephony/phone.md, "The Voicemail tab exists only while the carrier's visual voicemail is ready"
    await until(alpha, alpha.runtime, Phone, (s) => s.voicemailReady);
    await tab("Voicemail");
    await until(alpha, voicemail, Voicemail, (s) => s.rows.length === 1);

    // spec/app/telephony/voicemail.md, "Opening a voicemail asks for its audio once, and a carrier transcript is shown as it is"
    await press("+14155550100");
    await until(alpha, voicemail, Voicemail, (s) => s.opened.audio === "AudioReady");

    // spec/app/telephony/voicemail.md, "Playing marks a voicemail heard, and nothing plays during a call"
    await press("Play");
    await until(alpha, voicemail, Voicemail, (s) => s.opened.playback === "Playing");
    await until(alpha, voicemail, Voicemail, () => world.telephony.voicemails[0]!.heard);

    // spec/app/telephony/voicemail.md, "A transcript is made on this phone or not at all": this phone has no recognizer, and nothing goes to the cloud.
    await press("Transcribe");
    await until(alpha, voicemail, Voicemail, (s) => s.opened.transcript === "TranscriptUnavailable");

    // spec/app/telephony/voicemail.md, "A delete needs the owner's confirmation of the open voicemail, and a refused delete keeps it"
    await press("Delete");
    await until(alpha, voicemail, Voicemail, (s) => s.opened.confirming);
    expect(world.telephony.voicemails[0]!.deleted).toBe(false);
    await confirm("Delete");
    await until(alpha, voicemail, Voicemail, (s) => s.deletion.outcome === "Confirmed" && s.rows.length === 0);
    expect([world.telephony.voicemails[0]!.deleted, world.telephony.staged.map((one) => one.kind)]).toEqual([true, ["voicemail"]]);
  });
});

describe("Messages on an Alpha image", () => {
  // spec/app/telephony/messages.md, "Story: Read my conversations while Messages is open"; spec/app/telephony/drafts.md, "Story: Send only what I reviewed, once"
  it("Read my conversations, and send only what I reviewed, once (spec/app/telephony/messages.md, \"Story: Read my conversations while Messages is open\"; spec/app/telephony/drafts.md, \"Story: Send only what I reviewed, once\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await press("Messages");
    await until(alpha, alpha.runtime, Messages, (s) => s.page.status === "Loaded" && s.threads.length === 1);

    // spec/app/telephony/messages.md, "Only a complete listed conversation opens, with the full identity it was listed with"
    await press("+14155550100");
    await until(alpha, alpha.runtime, Messages, (s) => s.rows.length === 1 && s.view.tag === "InThread");
    // spec/app/telephony/messages.md, "Messages holds the visit, its read and the SMS access, what is on screen, the owner's message menu, a delete and a call": holding the SMS role, what was shown is marked read.
    await until(alpha, alpha.runtime, Messages, () => world.telephony.texts[0]!.read);

    // spec/app/telephony/drafts.md, "Typing makes the draft the owner's text, and editing releases the reviewed operation"
    await write("Message", "On my way");
    await until(alpha, alpha.runtime, Drafts, (s) => s.slots.some((slot) => slot.thread === "thread:1" && slot.text === "On my way"));
    expect(world.telephony.sent).toEqual([]);

    // spec/app/telephony/drafts.md, "Only the owner's Send binds a draft to an operation, and Send again reuses the bound operation"
    await press("Send");
    await until(alpha, alpha.runtime, Drafts, (s) => s.ownerSends === 1 && s.slots.every((slot) => slot.text === ""));
    expect(world.telephony.sent.map(({ recipients, body }) => ({ recipients, body }))).toEqual([{ recipients: ["+14155550100"], body: "On my way" }]);

    // spec/app/telephony/messages.md, "Only the latest read publishes, and a conversation shows only its own messages": the provider's own row replaces the send.
    await until(alpha, alpha.runtime, Messages, (s) => s.rows.some((row) => row.outgoing && row.body === "On my way"));

    // spec/app/telephony/messages.md, "Delete passes the exact listed row after confirmation, and an unconfirmed delete keeps the row and blocks another"
    await press("See you at five");
    await press("Delete");
    await confirm("Delete");
    await until(alpha, alpha.runtime, Messages, (s) => s.deletion.outcome === "Confirmed" && !s.rows.some((row) => row.body === "See you at five"));
    expect(world.telephony.texts.map((one) => one.body)).toEqual(["On my way"]);

    // spec/app/telephony/messages.md, "Back closes Messages' own layers one at a time, innermost first, before it leaves Messages"
    await hardware("back");
    await until(alpha, alpha.runtime, Messages, (s) => s.view.tag === "ThreadList");
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    await until(alpha, alpha.runtime, Messages, (s) => !s.shown && s.threads.length === 0);
  });

  // spec/app/telephony/drafts.md, "When Alpha opens again, a send that was under way reads unconfirmed and keeps its operation"
  it("A send cut off by Alpha stopping reads unconfirmed, and Send again only reads it back (spec/app/telephony/drafts.md, \"When Alpha opens again, a send that was under way reads unconfirmed and keeps its operation\")", async () => {
    const world = image();
    world.telephony.hold = new Promise<void>(() => {});
    const first = await open(world);
    await until(first.alpha, first.alpha.runtime, Shell, (s) => s.image);
    await press("Messages");
    await press("New message");
    await until(first.alpha, first.alpha.runtime, Messages, (s) => s.view.tag === "Composing");
    await write("To", "+14155550133");
    await write("Message", "Running late");
    await press("Send");
    await until(first.alpha, first.alpha.runtime, Drafts, (s) => s.slots.some((slot) => slot.outcome === "Sending"));
    await first.close();

    world.telephony.hold = undefined;
    const second = await open(world);
    await until(second.alpha, second.alpha.runtime, Drafts, (s) => s.slots.some((slot) => slot.thread === "new" && slot.outcome === "Unconfirmed"));
    expect(world.telephony.sent).toEqual([]);

    // spec/app/telephony/drafts.md, "Only the owner's Send binds a draft to an operation, and Send again reuses the bound operation": the phone's journal is asked under the same operation, so the text goes once.
    const kept = (await second.alpha.runtime.runPromise(Effect.flatMap(Drafts, (drafts) => drafts.get()))).slots.find((slot) => slot.thread === "new");
    await second.alpha.runtime.runPromise(Effect.flatMap(Drafts, (drafts) => drafts.send({ type: "sendStarted", thread: "new", kind: "SmsSend", sim: -1 }, "Owner")));
    await until(second.alpha, second.alpha.runtime, Drafts, (s) => s.slots.every((slot) => slot.text === ""));
    expect([world.telephony.sent.map(({ body }) => body), kept?.operation.tag]).toEqual([["Running late"], "BoundOperation"]);
  });
});

describe("Contacts on an Alpha image", () => {
  // spec/app/telephony/contacts.md, "Story: Read my contacts only while I am looking at them"; spec/app/telephony/contacts.md, "Story: Change only the contact I reviewed"
  it("Read my contacts while I look at them, and change only the contact I reviewed (spec/app/telephony/contacts.md, \"Story: Read my contacts only while I am looking at them\"; spec/app/telephony/contacts.md, \"Story: Change only the contact I reviewed\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    const contacts = addressBook.runtime(alpha);
    await until(alpha, alpha.runtime, Shell, (s) => s.contacts);
    await press("Contacts");
    await until(alpha, contacts, Contacts, (s) => s.list.status === "Loaded" && s.rows.length === 2);

    // spec/app/telephony/contacts.md, "An open contact shows the fields the phone holds now, read under its own ticket"
    await press("Maya Chen");
    await until(alpha, contacts, Contacts, (s) => s.detail.tag === "DetailRead");

    // spec/app/telephony/contacts.md, "A save names the version shown, and a changed contact keeps the editor and writes nothing"
    await press("Edit");
    await until(alpha, contacts, Contacts, (s) => s.editor.tag === "EditorOpen");
    await write("Last name", "Chen-Ortiz");
    await press("Save");
    await until(alpha, contacts, Contacts, (s) => s.lastWrite.tag === "Wrote" && s.lastWrite.outcome === "WriteSaved" && s.detail.tag === "DetailRead");
    expect(world.telephony.people.find((one) => one.id === "7")).toMatchObject({ familyName: "Chen-Ortiz", revision: 2 });

    // spec/app/telephony/contacts.md, "A removal needs the owner's confirmation of the contact read whole, at its version"
    await press("Delete");
    await confirm("Delete");
    await until(alpha, contacts, Contacts, (s) => s.lastWrite.tag === "Wrote" && s.lastWrite.outcome === "WriteDeleted" && s.openId === "");
    expect(world.telephony.people.map((one) => one.id)).toEqual(["8"]);

    // spec/app/telephony/phone.md, "A number handed to Phone fills the keypad once it is idle, and never dials": a contact's Call opens Phone with the number, and nothing is dialed.
    await until(alpha, contacts, Contacts, (s) => s.list.status === "Loaded" && s.rows.length === 1);
    await press("Ben Ortiz");
    await until(alpha, contacts, Contacts, (s) => s.detail.tag === "DetailRead");
    await press("Call +14155550122");
    await until(alpha, alpha.runtime, Phone, (s) => s.shown && s.tab === "KeypadTab" && s.number === "+14155550122");
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([[], []]);
  });
});

describe("The ongoing-call bar on an Alpha image", () => {
  // spec/app/telephony/callBar.md, "Story: See my live call over every view"
  it("See my live call over every view, and end it (spec/app/telephony/callBar.md, \"Story: See my live call over every view\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);

    // spec/app/telephony/callBar.md, "While a call rings, Android's incoming alert is the only call bar"
    world.telephony.live = [{ id: "c1", state: "ringing", connectedAt: null }];
    world.telephony.report();
    await until(alpha, alpha.runtime, Bar, (s) => s.calls.length === 1);
    expect(button("End call")).toBeUndefined();

    // spec/app/telephony/callBar.md, "The bar shows only on a trusted reading, while the page shows, while a call is live"
    world.telephony.live = [{ id: "c1", state: "active", connectedAt: world.now }];
    world.telephony.report();
    await until(alpha, alpha.runtime, Bar, (s) => s.shown && s.calls[0]?.phase === "Active");
    expect(Boolean(button("End call"))).toBe(true);

    // spec/app/telephony/callBar.md, "Return and End act only on the call the bar shows, and End is asked once"
    await press("End call");
    await until(alpha, alpha.runtime, Bar, (s) => !s.shown);
    expect(world.telephony.ended).toEqual(["c1"]);

    // spec/app/telephony/callBar.md, "The bar shows only on a trusted reading, while the page shows, while a call is live": a report that does not parse removes the bar.
    world.telephony.live = [{ id: "", state: "active", connectedAt: null }];
    world.telephony.report();
    await until(alpha, alpha.runtime, Bar, (s) => !s.trusted && s.calls.length === 0);
  });

  // spec/app/shell/index.md, "Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it"
  it("Off an Alpha image there is no call bar and no telephony (spec/app/shell/index.md, \"Phone and Messages exist only on an Alpha image, and Contacts only where that image admits it\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Bar, (s) => s.eligible);
    expect([button("Phone"), button("Messages"), button("Contacts"), button("End call")]).toEqual([undefined, undefined, undefined, undefined]);
  });
});
