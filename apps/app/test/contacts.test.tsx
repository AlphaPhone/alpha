// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Contacts } from "../gen/app__contacts.effect.vibe";
import { Machine as Agent } from "../gen/app__contacts__agent.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { type Asking, propose, withdrawn } from "../src/contacts/requests.vibe";
import { type Reading, answerReading } from "../src/contacts/reads.vibe";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Composer } from "../gen/app__messages__composer.effect.vibe";
import { closeAll, drawn, later, open, press, underAct, until } from "./alpha.tsx";
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

/** Type into the text box named `name`, as a person does. */
const write = (name: string, text: string) => act(async () => {
  const found = [...document.querySelectorAll("textarea, input")].find((one) => one.getAttribute("aria-label") === name);
  if (!(found instanceof HTMLTextAreaElement || found instanceof HTMLInputElement)) throw new Error(`no field ${name}`);
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(found) as object, "value")?.set?.call(found, text);
  found.dispatchEvent(new Event("input", { bubbles: true }));
});

describe("Contacts on an Alpha image", () => {
  it("Browse my contacts, look at one, change it and delete it (spec/app/contacts/index.md, \"Story: Browse my contacts\"; spec/app/contacts/index.md, \"Story: Give Alpha access to my contacts\"; spec/app/contacts/index.md, \"Story: Know what happened to my change\"; spec/app/contacts/index.md, \"Story: Look at one contact\"; spec/app/contacts/index.md, \"Story: Add or change a contact\"; spec/app/contacts/index.md, \"Story: Delete a contact\")", async () => {
    const world = image();
    world.telephony.contacts = false;
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.contacts);

    // spec/app/contacts/index.md, "Contacts reads the list each time it comes to the front"
    await press("Contacts");
    await until(alpha, alpha.runtime, Contacts, (s) => s.front && s.list.status === "Failed" && s.rows === 0);
    await press("Allow");
    await until(alpha, alpha.runtime, Contacts, (s) => s.list.status === "Loaded" && s.rows === 2);

    await write("Search or ask", "Maya");
    await until(alpha, alpha.runtime, Contacts, (s) => s.list.status === "Loaded" && s.rows === 1);
    expect(document.querySelector('[aria-label="Ben Ortiz"]')).toBeNull();
    await write("Search or ask", "");
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
    await until(alpha, alpha.runtime, Contacts, (s) => s.opened && s.card.status === "Loaded");
    const card = await alpha.runtime.runPromise(answerReading({ type: "contact_read_selected" }));
    expect(card).toMatchObject({ status: "read", contact: { displayName: "Maya Chen-Ortiz" } });

    // spec/app/contacts/index.md, "Confirming deletes the contact that was shown"
    const deletion = Promise.withResolvers<void>();
    world.telephony.holdContactDeletion = deletion.promise;
    await press("Delete");
    await until(alpha, alpha.runtime, Contacts, (s) => s.confirming);
    await confirm("Delete");
    await until(alpha, alpha.runtime, Contacts, (s) => s.write.outcome === "Sent" && s.change === "Remove");
    expect(world.telephony.people.map((one) => one.id)).toEqual(["7", "8"]);
    deletion.resolve();
    await later(alpha, 500);
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

  it("Append the next page to my contacts (spec/app/contacts/index.md, \"Story: Browse my contacts\")", async () => {
    const world = image();
    const first = world.telephony.people[0];
    if (!first) throw new Error("the phone has no starting contact");
    world.telephony.people.push(...Array.from({ length: 51 }, (_, index) =>
      ({ ...first, id: String(index + 10), displayName: `Contact ${index + 1}` })));
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.contacts);
    await press("Contacts");
    await until(alpha, alpha.runtime, Contacts, (s) => s.list.status === "Loaded" && s.rows === 50 && s.more);
    await press("More contacts");
    await until(alpha, alpha.runtime, Contacts, (s) => s.list.status === "Loaded" && s.rows === 53 && !s.more);
    await press("Contact 51");
    await until(alpha, alpha.runtime, Contacts, (s) => s.opened && s.card.status === "Loaded" && s.contact === "60");
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
    await ask({ type: "phone_call", target: { kind: "contact", query: "Ben" } });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Choosing");
    expect(await alpha.runtime.runPromise(withdrawn())).toBe(true);
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Withdrawn");
    expect(document.querySelector("[role=dialog]")).toBeNull();

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

    // spec/app/contacts/agent.md, "Nothing is done but what the owner approved, as it was shown, once": a changed native version invalidates the identified review.
    await ask({ type: "contact_delete", query: "Ben" });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.contact === "8");
    const ben = world.telephony.people.find((one) => one.id === "8");
    if (!ben) throw new Error("the phone has no reviewed contact");
    ben.revision += 1;
    await press("Approve");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "NotDone");
    expect(world.telephony.people).toContain(ben);

    // spec/app/contacts/agent.md, "Only the phone answers the action, and the request ends as that answer says"
    await ask({ type: "contact_delete", query: "Ben" });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.contact === "8");
    await press("Approve");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Done");
    expect(world.telephony.people).not.toContain(ben);
  });

  it("Let the agent read what I have open, and draft a reply that never sends (spec/app/contacts/agent.md, \"Story: Let the agent read what I have open\"; spec/app/messages/composer.md, \"Story: Let Alpha suggest a draft\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    const read = (operation: Reading) => alpha.runtime.runPromise(answerReading(operation));

    // spec/app/contacts/agent.md, "The agent reads only the conversation, voicemail or contact open on screen, as the phone last read it"
    expect([await read({ type: "messages_read_selected" }), await read({ type: "voicemail_read_selected" }), await read({ type: "contact_read_selected" }), await read({ type: "sms_reply_selected", body: "On my way" })]).toEqual([
      { kind: "messages-read", status: "none-selected" }, { kind: "voicemail-read", status: "none-selected" }, { kind: "contact-read", status: "none-selected" }, { kind: "sms-reply", status: "none-selected" },
    ]);

    // spec/app/contacts/agent.md, "The latest text's sender is named by its number alone, and the whole number only where the agent asked for it"
    expect([await read({ type: "sms_latest_sender" }), await read({ type: "sms_latest_sender", includeAddress: true })]).toEqual([
      { kind: "sms-latest-sender", status: "found", numberEnding: "0100" }, { kind: "sms-latest-sender", status: "found", address: "+14155550100", threadId: "thread:1" },
    ]);

    await press("Messages");
    await until(alpha, alpha.runtime, Messages, (s) => s.list.status === "Loaded" && s.threads === 1);
    await press("Maya Chen");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Conversation" && s.page.status === "Loaded");
    await until(alpha, alpha.runtime, Composer, (s) => s.thread > 0);
    expect(await read({ type: "messages_read_selected" })).toEqual({ kind: "messages-read", status: "read", participant: "Maya Chen", messages: [{ direction: "in", date: 1_700_000_050_000, body: "See you at five" }], truncated: false });

    // spec/app/messages/composer.md, "The agent's draft goes into the open conversation's draft only while it is empty, and never sends"
    expect(await read({ type: "sms_reply_selected", body: "On my way" })).toEqual({ kind: "sms-reply", status: "drafted" });
    await until(alpha, alpha.runtime, Composer, (s) => s.slot.author === "AlphaWrote");
    expect([await read({ type: "sms_reply_selected", body: "Running late" }), (document.querySelector("textarea[aria-label=Message]") as HTMLTextAreaElement).value, world.telephony.sent]).toEqual([
      { kind: "sms-reply", status: "occupied" }, "On my way", [],
    ]);

    // spec/app/phone/index.md, "A number handed to Phone opens the keypad with it filled in, and never dials"
    expect(await read({ type: "phone_keypad", number: "+14155550122" })).toEqual({ kind: "phone-keypad", status: "opened" });
    await until(alpha, alpha.runtime, Phone, (s) => s.front && s.tab === "Keypad" && s.digits === 12);
    expect([world.telephony.placed, world.telephony.dialed]).toEqual([[], []]);

    // spec/app/contacts/index.md, "Searching or changing the filter chip starts a new list"
    expect(await read({ type: "contact_show", query: "Ben" })).toEqual({ kind: "contact-show", status: "shown" });
    await until(alpha, alpha.runtime, Contacts, (s) => s.front && s.sought && s.list.status === "Loaded" && s.rows === 1);
    await drawn(() => new Promise((resolve) => setTimeout(resolve, 0)));
    await press("Ben Ortiz");
    await until(alpha, alpha.runtime, Contacts, (s) => s.opened && s.card.status === "Loaded");
    expect(await read({ type: "contact_read_selected" })).toEqual({ kind: "contact-read", status: "read", contact: { displayName: "Ben Ortiz", phoneNumbers: ["+14155550122"], emailAddresses: [] } });
  });
});
