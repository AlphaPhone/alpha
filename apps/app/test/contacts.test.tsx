// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Contacts } from "../gen/app__contacts.effect.vibe";
import { Machine as Agent } from "../gen/app__contacts__agent.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import * as Voice from "../gen/app__voice.effect.vibe";
import { together, untimed, whole } from "../src/runtime/reactor.vibe";
import { shell } from "../src/shell/shell.vibe";
import { placeOf, voicing } from "../src/voice/voice.vibe";
import { fakeWorld } from "./fakes/world.vibe";
import { type Asking, propose } from "../src/contacts/requests.vibe";
import { closeAll, later, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** An Alpha image whose host registers eliza's telephony and contacts plugins and Alpha's call plugins. */
const image = () => ({ ...scene(), phone: true, image: true });

/** Press `name` in the open confirmation. */
const confirm = (name: string) => act(async () => {
  const found = [...document.querySelectorAll("[role=alertdialog] button")].find((one) => one.textContent === name);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`no ${name} in the confirmation`);
  found.click();
});

/** Say `text` to Alpha from its message box, as the owner types and sends it. */
async function say(text: string) {
  await write("Message Alpha", text);
  await press("Send");
}

/** Type into the text box named `name`, as a person does. */
const write = (name: string, text: string) => act(async () => {
  const found = [...document.querySelectorAll("textarea, input")].find((one) => one.getAttribute("aria-label") === name);
  if (!(found instanceof HTMLTextAreaElement || found instanceof HTMLInputElement)) throw new Error(`no field ${name}`);
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(found) as object, "value")?.set?.call(found, text);
  found.dispatchEvent(new Event("input", { bubbles: true }));
});

describe("Contacts on an Alpha image", () => {
  it("Browse my contacts, look at one, change it and delete it (spec/app/contacts/index.md, \"Story: Browse my contacts\"; spec/app/contacts/index.md, \"Story: Know what happened to my change\"; spec/app/contacts/index.md, \"Story: Look at one contact\"; spec/app/contacts/index.md, \"Story: Add or change a contact\"; spec/app/contacts/index.md, \"Story: Delete a contact\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.contacts);

    // spec/app/contacts/index.md, "Contacts reads the list each time it comes to the front"
    await press("Contacts");
    await until(alpha, alpha.runtime, Contacts, (s) => s.list.status === "Loaded" && s.rows === 2);

    // spec/app/contacts/index.md, "Opening a contact reads it from the phone afresh"
    await press("Maya Chen");
    await until(alpha, alpha.runtime, Contacts, (s) => s.opened && s.card.status === "Loaded" && s.held.phones === 1);

    // spec/app/contacts/index.md, "Save writes a form that was changed and has a name, a number or an address"
    await press("Edit");
    await until(alpha, alpha.runtime, Contacts, (s) => s.form === "Changing");
    await write("Last name", "Chen-Ortiz");
    await press("Save");
    await until(alpha, alpha.runtime, Contacts, (s) => s.write.outcome === "Confirmed" && s.form === "Shut");
    expect(world.telephony.people.find((one) => one.id === "7")).toMatchObject({ familyName: "Chen-Ortiz", revision: 2 });

    // spec/app/contacts/index.md, "Confirming deletes the contact that was shown"
    await press("Delete");
    await until(alpha, alpha.runtime, Contacts, (s) => s.confirming);
    await confirm("Delete");
    await until(alpha, alpha.runtime, Contacts, (s) => s.write.outcome === "Confirmed" && s.change === "Remove" && !s.opened);
    expect(world.telephony.people.map((one) => one.id)).toEqual(["8"]);

    // spec/app/contacts/index.md, "Call and Message open Phone or Messages with the number filled in, and do nothing else"; spec/app/phone/index.md, "A number handed to Phone opens the keypad with it filled in, and never dials"
    await until(alpha, alpha.runtime, Contacts, (s) => s.list.status === "Loaded" && s.rows === 1);
    await press("Ben Ortiz");
    await until(alpha, alpha.runtime, Contacts, (s) => s.card.status === "Loaded");
    await press("Call +14155550122");
    await until(alpha, alpha.runtime, Phone, (s) => s.tab === "Keypad" && s.digits === 12);
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([[], []]);
  });

  it("Add or change a contact in the phone's own editor where Alpha may not write contacts (spec/app/contacts/index.md, \"Story: Add or change a contact\")", async () => {
    const world = image();
    world.telephony.editable = false;
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.contacts);
    await press("Contacts");
    await until(alpha, alpha.runtime, Contacts, (s) => s.list.status === "Loaded" && s.rows === 2 && !s.editable);

    // spec/app/contacts/index.md, "Where the phone does not let Alpha write contacts, New and Edit open the phone's own contact editor instead"
    await press("New contact");
    await press("Maya Chen");
    await until(alpha, alpha.runtime, Contacts, (s) => s.opened && s.card.status === "Loaded");
    await press("Edit");
    await until(alpha, alpha.runtime, Contacts, () => world.telephony.editors.length === 2);
    expect([world.telephony.editors, (await alpha.runtime.runPromise(Contacts.use((machine) => machine.get()))).form, world.telephony.people.map((one) => one.revision)]).toEqual([["new", "7"], "Shut", [1, 1]]);
  });

  it("Approve what the agent asked: a text, a change, a new contact (spec/app/contacts/agent.md, \"Story: Let the agent ask for a call or a contact change\"; spec/app/contacts/agent.md, \"Story: Approve what the agent asked\"; spec/app/contacts/agent.md, \"Story: Learn how the request ended\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Phone, (s) => s.telecom === "NoCall");
    const ask = (operation: Asking, written = false) => alpha.runtime.runPromise(propose(operation, written));

    // spec/app/contacts/agent.md, "A call or a text to a number reaches only a number the owner wrote"
    await ask({ type: "sms_send", recipients: ["+14155550199"], body: "Hi", subscriptionId: 1 });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "NotWritten");

    // spec/app/contacts/agent.md, "The agent never calls an emergency number, and is told why"
    await ask({ type: "phone_call", target: { kind: "number", number: "911" } }, true);
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "EmergencyRefused");
    expect(world.telephony.dialed).toEqual([]);

    // spec/app/contacts/agent.md, "Only the phone answers the newest search, and the request goes on by what it found": a text to a contact lets the owner pick the number, even the only one.
    await ask({ type: "sms_compose", query: "Maya", body: "Running late" });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Choosing" && s.matches === 1);
    expect(world.telephony.sent).toEqual([]);

    // spec/app/contacts/agent.md, "The owner picks the exact number or the one contact, and that one is shown"
    await act(async () => {
      const found = [...document.querySelectorAll("[role=dialog] button")].find((one) => one.querySelector("span > span")?.textContent === "Maya Chen");
      if (!(found instanceof HTMLButtonElement)) throw new Error("no button Maya Chen");
      found.click();
    });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.number === "+14155550100" && !s.addressed);

    // spec/app/contacts/agent.md, "Only the owner approves, only what is shown as it is now, and only when the phone has ruled out an emergency call"
    await press("Send this text");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Done");
    expect(world.telephony.sent.map(({ recipients, body }) => ({ recipients, body }))).toEqual([{ recipients: ["+14155550100"], body: "Running late" }]);

    // spec/app/contacts/agent.md, "The owner can decline, and a review Alpha stops showing is withdrawn"
    await ask({ type: "phone_call", target: { kind: "contact", query: "Ben" } });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Choosing");
    await press("Not now");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Declined");

    // spec/app/contacts/agent.md, "A change that would leave the contact as it is is never offered"
    await ask({ type: "contact_update", query: "Ben", add: { phoneNumbers: ["+14155550122"] } });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Unchanged");

    // spec/app/contacts/agent.md, "A change is shown line by line, and a removed value never reads as kept"
    await ask({ type: "contact_update", query: "Ben", add: { phoneNumbers: ["+14155550123"] } });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.contact === "8");
    await press("Approve");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Done");
    expect(world.telephony.people.find((one) => one.id === "8")).toMatchObject({ displayName: "Ben Ortiz", givenName: "Ben", phoneNumbers: [{ number: "+14155550122", type: "mobile" }, { number: "+14155550123", type: "mobile" }] });

    // spec/app/contacts/agent.md, "Only the phone answers the newest search, and the request goes on by what it found": a new contact whose name is already in Contacts is shown with that contact.
    await ask({ type: "contact_create", contact: { displayName: "Maya Chen", phoneNumbers: ["+14155550177"], emailAddresses: [] } });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.ask === "AddContact" && s.twins === 1);
    await press("Approve");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Done");
    expect(world.telephony.people.filter((one) => one.displayName === "Maya Chen").length).toBe(2);
  });

  it("A text the agent proposes on a turn is shown on its card, a draft too, sent once on the owner's tap, and never asked again (spec/app/contacts/agent.md, \"Story: Let the agent ask for a call or a contact change\"; spec/app/contacts/agent.md, \"Story: Approve what the agent asked\"; spec/app/contacts/agent.md, \"Story: Learn how the request ended\")", async () => {
    const world = image();
    world.slots.add("agent-device");
    const { desk } = world.telephony;
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Phone, (s) => s.telecom === "NoCall");
    await vi.waitFor(() => expect(desk.key).toMatch(/^[a-f0-9]{64}$/));
    expect([desk.capabilities, world.secrets.get("agent-device")]).toEqual(["sms.compose.v1,sms.compose.v2,sms.send.v1", JSON.stringify(desk.key)]);

    // spec/app/contacts/agent.md, "Only the agent asks, and only when no other request is open": a text the agent marks as a draft is shown on the card all the same.
    desk.offers.push({ type: "sms_compose", target: { kind: "number", number: "+14155550133" }, body: "On my way", draft: true });
    await say("Text 415 555 0133 that I'm on my way");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.ask === "Text" && s.number === "+14155550133" && s.addressed);
    expect([world.telephony.sent, desk.proposals.map(({ state }) => state)]).toEqual([[], ["pending"]]);

    // spec/app/contacts/agent.md, "Nothing is done but what the owner approved, as it was shown, once"
    await press("Send this text");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Done");
    await vi.waitFor(() => expect(desk.proposals[0]?.state).toBe("done"));
    expect([world.telephony.sent, desk.proposals[0]?.receipt]).toEqual([
      [{ operationId: "proposal-1", recipients: ["+14155550133"], body: "On my way" }],
      { outcome: "applied", operationId: "proposal-1", result: { kind: "sms-compose", status: "sent" } },
    ]);

    // spec/app/contacts/agent.md, "Story: Learn how the request ended": a text the phone settled is never offered for approval again.
    desk.proposals[0].state = "pending";
    await say("Thanks");
    await vi.waitFor(() => expect(world.ask.said).toEqual(["Text 415 555 0133 that I'm on my way", "Thanks"]));
    await later(alpha, 50);
    expect([(await alpha.runtime.runPromise(Agent.use((machine) => machine.get()))).stage, world.telephony.sent.length]).toEqual(["Ended", 1]);

    // spec/app/contacts/agent.md, "The owner can decline, and a review Alpha stops showing is withdrawn": the agent hears that nothing ran.
    desk.offers.push({ type: "sms_compose", target: { kind: "number", number: "+14155550133" }, body: "Running late" });
    await say("Tell them I'm running late");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.text === "Running late");
    await press("Not now");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Declined");
    await vi.waitFor(() => expect(desk.proposals[1]?.state).toBe("rejected"));
    expect(world.telephony.sent.length).toBe(1);
  });
});

// spec/app/voice/index.md, "Story: Go where the conversation takes me"; spec/app/voice/index.md, "Voice keeps talking after a navigation only when it is the one the conversation asked for; any other ends it"
describe("Talk on an Alpha image", () => {
  it("Talk keeps listening as the agent opens the keypad, Contacts and Messages, and stops when the owner opens one himself", async () => {
    localStorage.clear();
    const world = image();
    const layer = Layer.provideMerge(whole(together(shell, voicing)), fakeWorld(world)) as unknown as Layer.Layer<Voice.Machine | Shell>;
    const runtime = ManagedRuntime.make(layer);
    try {
      const voice = (event: Voice.Event) => runtime.runPromise(Effect.flatMap(Voice.Machine, (machine) => machine.send(event)));
      const reached = (ok: (state: Voice.Voice) => boolean) => runtime.runPromise(Effect.flatMap(Voice.Machine, (machine) => Stream.runHead(Stream.filter(machine.changes, ok))));
      const trail = () => runtime.runPromise(Effect.flatMap(Shell, (machine) => machine.get())).then((state) => state.trail);
      await reached((s) => s.warmed);
      await voice({ type: "permissionChanged", grant: "Granted" });
      await voice({ type: "startTalking", now: untimed });
      await reached((s) => s.phase === "Listening" && s.mic === "On");
      for (const [turn, view] of [[1, "Phone"], [2, "Contacts"], [3, "Messages"]] as const) {
        world.ask.nextReplyChunks = [`[NAVIGATE:${view}] Opening ${view}.`];
        world.voice.emitLocal?.("liveCaptureTranscript", { text: `Open ${view}`, final: false });
        await reached((s) => s.heard);
        world.voice.emitLocal?.("liveCaptureTranscript", { text: `Open ${view}`, final: true });
        await reached((s) => s.sent === turn && s.phase === "Listening" && s.mic === "On" && s.followed === placeOf(view) && s.claim === 0);
        expect((await trail()).at(-1)).toBe(view);
      }
      await runtime.runPromise(Effect.flatMap(Shell, (machine) => machine.send({ type: "openView", view: "Phone" })));
      await reached((s) => s.phase === "Idle" && s.mic === "Off");
    } finally {
      await runtime.dispose();
      localStorage.clear();
    }
  });
});
