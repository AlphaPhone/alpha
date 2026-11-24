// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Contacts } from "../gen/app__contacts.effect.vibe";
import { Machine as Agent } from "../gen/app__contacts__agent.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { type Asking, propose } from "../src/contacts/requests.vibe";
import { closeAll, open, press, underAct, until } from "./alpha.tsx";
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
    await press("Maya Chen");
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
});
