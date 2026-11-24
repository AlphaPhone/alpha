// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Contacts } from "../gen/app__contacts.effect.vibe";
import { Machine as Agent } from "../gen/app__contacts__agent.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { Requested } from "../src/contacts/requests.vibe";
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
  it("Look at one contact, change it and delete it (spec/app/contacts/index.md, \"Story: Look at one contact\"; spec/app/contacts/index.md, \"Story: Add or change a contact\"; spec/app/contacts/index.md, \"Story: Delete a contact\")", async () => {
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

  it("Approve a text the agent asked to send (spec/app/contacts/agent.md, \"Story: Let the agent ask for a call or a contact change\"; spec/app/contacts/agent.md, \"Story: Approve what the agent asked\"; spec/app/contacts/agent.md, \"Story: Learn how the request ended\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Phone, (s) => s.telecom === "NoCall");
    const ask = (event: Parameters<Agent["send"]>[0]) => alpha.runtime.runPromise(Agent.use((agent) => agent.send(event, "Agent")));
    const name = (text: string, search: string) => alpha.runtime.runPromise(Requested.use((requested) => requested.set({ ask: "Text", number: "", search, text })));

    // spec/app/contacts/agent.md, "A call or a text to a number reaches only a number the owner wrote"
    await alpha.runtime.runPromise(Requested.use((requested) => requested.set({ ask: "Text", number: "+14155550199", text: "Hi" })));
    await ask({ type: "asked", ask: "Text", byName: false, emergency: false, written: false, pictures: false });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "NotWritten");

    // spec/app/contacts/agent.md, "Only the phone answers the newest search, and the request goes on by how many contacts it found"
    await name("Running late", "Maya");
    await ask({ type: "asked", ask: "Text", byName: true, emergency: false, written: false, pictures: false });
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Shown" && s.matches === 1);
    expect(world.telephony.sent).toEqual([]);

    // spec/app/contacts/agent.md, "Only the owner approves, only what is shown as it is now, and only when the phone has ruled out an emergency call"
    await press("Send this text");
    await until(alpha, alpha.runtime, Agent, (s) => s.stage === "Ended" && s.ending === "Done");
    expect(world.telephony.sent.map(({ recipients, body }) => ({ recipients, body }))).toEqual([{ recipients: ["+14155550100"], body: "Running late" }]);
  });
});
