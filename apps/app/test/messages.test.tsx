// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Messages } from "../gen/app__messages.effect.vibe";
import { Machine as Composer } from "../gen/app__messages__composer.effect.vibe";
import { closeAll, hardware, open, press, underAct, until } from "./alpha.tsx";
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

/** Press the message bubble that says `text`. */
const bubble = (text: string) => act(async () => {
  const found = [...document.querySelectorAll("[role=log] button")].find((one) => one.textContent?.includes(text));
  if (!(found instanceof HTMLButtonElement)) throw new Error(`no message ${text}`);
  found.click();
});

describe("Messages on an Alpha image", () => {
  it("See my conversations, read one, and send a message once (spec/app/messages/index.md, \"Story: See my conversations\"; spec/app/messages/index.md, \"Story: Read a conversation\"; spec/app/messages/composer.md, \"Story: Send a message\"; spec/app/messages/sending.md, \"Story: Send a message once\"; spec/app/messages/sending.md, \"Story: Know whether it arrived\")", async () => {
    const world = image();
    world.telephony.live = [];
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);

    // spec/app/messages/index.md, "Messages reads the conversation list each time it comes to the front"
    await press("Messages");
    await until(alpha, alpha.runtime, Messages, (s) => s.list.status === "Loaded" && s.threads === 1);

    // spec/app/messages/index.md, "Only the newest read of the open conversation is shown, and it marks the shown messages read only where Alpha is the phone's SMS app"
    await press("Maya Chen");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Conversation" && s.page.status === "Loaded" && s.shown.rows === 1);
    await until(alpha, alpha.runtime, Messages, () => world.telephony.texts[0]!.read);

    // spec/app/messages/composer.md, "Typing changes the draft and makes it the owner's; emptying it leaves no draft"
    await until(alpha, alpha.runtime, Composer, (s) => s.thread > 0 && s.recipients === 1);
    await write("Message", "On my way");
    await until(alpha, alpha.runtime, Composer, (s) => s.slot.author === "OwnerWrote");
    expect(world.telephony.sent).toEqual([]);

    // spec/app/messages/composer.md, "Only the owner's Send sends: a draft or a picture, with send access, a SIM where there is a choice, and never during a call that may be an emergency call"
    await press("Send");
    await until(alpha, alpha.runtime, Composer, (s) => s.outgoing.op.outcome === "Confirmed" && s.slot.author === "Nobody");
    expect(world.telephony.sent.map(({ recipients, body }) => ({ recipients, body }))).toEqual([{ recipients: ["+14155550100"], body: "On my way" }]);

    // spec/app/messages/sending.md, "A delivery report counts only for a part reported sent"; spec/app/messages/sending.md, "A finished record is retired by a tombstone"
    world.telephony.deliver(world.telephony.sent[0]!.operationId);
    await until(alpha, alpha.runtime, Composer, (s) => s.outgoing.reported === 1 && s.outgoing.retired === s.outgoing.op.id);

    // spec/app/messages/index.md, "Confirming removes the message under a new number, never during a call that may be an emergency call"
    await bubble("See you at five");
    await press("Delete");
    await until(alpha, alpha.runtime, Messages, (s) => s.confirming);
    await confirm("Delete");
    await until(alpha, alpha.runtime, Messages, (s) => s.removal.outcome === "Confirmed");
    expect(world.telephony.texts.map((one) => one.body)).toEqual(["On my way"]);

    // spec/app/messages/index.md, "Back returns from a conversation or the picker to the list, and reads it again"
    const read = (await alpha.runtime.runPromise(Messages.use((machine) => machine.get()))).list.ticket;
    await hardware("back");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Threads" && s.list.ticket > read && s.list.status === "Loaded");
  });

  it("Start a new message to a number I type (spec/app/messages/index.md, \"Story: Start a new message\")", async () => {
    const world = image();
    const { alpha } = await open(world);
    await until(alpha, alpha.runtime, Shell, (s) => s.image);
    await press("Messages");
    await until(alpha, alpha.runtime, Messages, (s) => s.list.status === "Loaded");

    // spec/app/messages/index.md, "New message opens the picker, which reads the contacts that have a number"
    await press("New message");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Picker" && s.picker.status === "Loaded" && s.choices === 2);

    // spec/app/messages/index.md, "Choosing a contact's number, or typing one, opens that conversation"
    await press("Ben Ortiz");
    await until(alpha, alpha.runtime, Messages, (s) => s.pane === "Conversation" && s.page.status === "Loaded");
    await until(alpha, alpha.runtime, Composer, (s) => s.thread > 0);
  });
});
