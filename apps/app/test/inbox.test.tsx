// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as List } from "../gen/app__inbox.effect.vibe";
import { Machine as Marks } from "../gen/app__inbox__marking.effect.vibe";
import { Machine as Shown } from "../gen/app__inbox__message.effect.vibe";
import { Machine as Changes } from "../gen/app__inbox__sending.effect.vibe";
import { Machine as Writing } from "../gen/app__inbox__drafts.effect.vibe";
import { Machine as Offering } from "../gen/app__inbox__suggestion.effect.vibe";
import { useInEmail } from "../src/inbox/suggestion.vibe";
import inbox from "../src/inbox/index.tsx";
import { button, closeAll, drawn, fill, hardware, later, open, press, underAct, until } from "./alpha.tsx";
import { letter } from "./fakes/inbox.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** The open button of each message row of the list, by its subject. */
const opens = () => [...document.querySelectorAll("li")].map((row) => [...row.querySelectorAll("button")].find((found) => !found.hasAttribute("aria-pressed") && found.children.length === 3)).filter((found) => found !== undefined);
const rows = () => opens().map((found) => found.children[1]?.textContent);
const row = (subject: string) => drawn(() => {
  const found = opens().find((open) => open.children[1]?.textContent === subject);
  if (!found) throw new Error(`no message ${subject}`);
  found.click();
});
const choose = (subject: string) => drawn(() => {
  const found = opens().find((open) => open.children[1]?.textContent === subject)?.parentElement?.querySelector("button[aria-pressed]");
  if (!(found instanceof HTMLElement)) throw new Error(`cannot choose ${subject}`);
  found.click();
});
const confirm = (name: string) => drawn(() => {
  const found = [...document.querySelectorAll("[role=dialog] button, [role=alertdialog] button")].find((one) => one.textContent === name);
  if (!(found instanceof HTMLElement)) throw new Error(`no ${name} in the review`);
  found.click();
});
const menu = (item: string) => drawn(() => {
  button("More actions")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}).then(() => drawn(() => {
  const found = [...document.querySelectorAll("[role=menuitem]")].find((one) => one.textContent === item);
  if (!(found instanceof HTMLElement)) throw new Error(`no ${item} in the menu`);
  found.click();
}));
const write = (name: string, text: string) => drawn(() => {
  const found = [...document.querySelectorAll("textarea, input")].find((field) => field.getAttribute("aria-label") === name);
  if (!(found instanceof HTMLTextAreaElement || found instanceof HTMLInputElement)) throw new Error(`no field ${name}`);
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(found) as object, "value")?.set?.call(found, text);
  found.dispatchEvent(new Event("input", { bubbles: true }));
});
const told = () => document.body.textContent ?? "";
const title = () => document.querySelector("main[aria-label]:not([aria-label=Inbox]), main[aria-label=Inbox]")?.getAttribute("aria-label");
const step = (name: string) => process.stderr.write(`STEP ${name}\n`);
const tile = (view: string) => drawn(() => {
  const found = document.querySelector<HTMLButtonElement>(`[data-home-tile='view:${view}']`);
  if (!found) throw new Error(`no tile ${view}`);
  found.click();
});
const action = (name: string) => drawn(() => {
  const found = document.querySelector<HTMLButtonElement>(`button[aria-label='${name}']`);
  if (!found) throw new Error(`no action ${name}`);
  found.click();
});
const search = (text: string) => fill("Search mail", text).then(() => document.querySelector("form[role=search]")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  it("See my mail (spec/app/inbox/index.md, \"Story: See my mail\")", async () => {
    const world = { ...scene(), phone };
    for (let at = 5; at <= 30; at += 1) world.inbox.mail.push(letter(at, `Newsletter ${at}`, ["INBOX"]));
    const first = await open(world);
    const { alpha } = first;
    const runtime = inbox.runtime(alpha);

    // spec/app/inbox/index.md, "Opening Inbox, and every change to Google access, checks the accounts again, even while a check is out"
    await tile("Inbox");
    await until(alpha, runtime, List, (s) => s.list.status === "Loaded" && s.pages === 1);
    step("1");
    expect([rows().slice(0, 2), rows().length]).toEqual([["Lunch on Friday", "Your tax return"], 25]);

    // spec/app/inbox/index.md, "More messages are read with the page cursor, which is given up as its page is asked"
    await press("Load more");
    await until(alpha, runtime, List, (s) => s.pages === 2);
    step("2");
    expect([rows().length, Boolean(button("Load more"))]).toEqual([28, false]);

    // spec/app/inbox/index.md, "Choosing a folder or a search reads its first page"
    await search("tax");
    await until(alpha, runtime, List, (s) => s.selected.query === "tax" && s.list.status === "Loaded");
    step("3");
    expect(rows()).toEqual(["Your tax return"]);

    // spec/app/inbox/index.md, "Back from a search shows its folder without the search, before Back leaves Inbox"
    await hardware("back");
    await until(alpha, runtime, List, (s) => s.selected.query === "" && s.list.status === "Loaded");
    expect([rows().length, (document.querySelector("input[aria-label='Search mail']") as HTMLInputElement | null)?.value]).toEqual([25, ""]);
    await press("Spam");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Spam" && s.list.status === "Loaded");
    step("4");
    expect(rows()).toEqual(["Win a prize"]);
    await press("Inbox");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Incoming" && s.list.status === "Loaded");
    step("5");

    // spec/app/inbox/message.md, "A message opens at its newest place in the thread, only while the grant of its account allows reading"; spec/app/inbox/marking.md, "Opening an unread message marks it read once in a session, silently, and never again, even when it is not known to have worked"
    await row("Lunch on Friday");
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded");
    step("6");
    await later(alpha, 1000);
    await until(alpha, runtime, Marks, (s) => s.attempt.outcome === "Confirmed");
    step("7");
    expect([title(), world.inbox.changes]).toEqual(["Lunch on Friday", ["mark-read g1"]]);

    // spec/app/inbox/message.md, "Only an https link without credentials in it can be reviewed and opened; any other link stays text"
    const visited = vi.spyOn(window, "open").mockReturnValue(null);
    await press("https://cafe.test/menu");
    await until(alpha, runtime, Shown, (s) => s.link === 1);
    step("8");
    await confirm("Open");
    await until(alpha, runtime, Shown, (s) => s.link === 0);
    step("9");
    expect(visited).toHaveBeenCalledWith("https://cafe.test/menu", "_blank", "noopener,noreferrer");

    // spec/app/inbox/marking.md, "The owner marks a message read or unread; while another mark is in flight the owner is told it is still in progress, and a message whose last mark was unconfirmed is marked again only after the list was read afresh"
    await menu("Mark as unread");
    await until(alpha, runtime, Marks, (s) => s.told === "Marked");
    step("10");
    expect(world.inbox.changes).toEqual(["mark-read g1", "mark-unread g1"]);
    await press("Back to the list");
    await until(alpha, runtime, Shown, (s) => s.message === 0);
    step("11");

    // spec/app/inbox/sending.md, "Archive and Trash are held for the undo window, and only the owner's Undo before it ends sends nothing"
    await choose("Your tax return");
    await action("Archive");
    await confirm("Archive");
    await until(alpha, runtime, Changes, (s) => s.undo.holding === "Held");
    step("12");
    expect([rows().includes("Your tax return"), (await alpha.runtime.runPromise(List.use((list) => list.get()))).chosen]).toEqual([false, []]);
    await later(alpha, 4_000);
    await press("Undo");
    await until(alpha, runtime, Changes, (s) => s.undo.holding === "Undone");
    step("13");
    expect([rows().includes("Your tax return"), world.inbox.changes]).toEqual([true, ["mark-read g1", "mark-unread g1"]]);

    // spec/app/inbox/sending.md, "A recorded operation sends its one request, for its own account under that account's grant now, exactly as reviewed: a draft while it is at the revision shown and its hand-over is written to the phone, archive and Trash once the undo window has passed"
    await choose("Your tax return");
    await action("Archive");
    await confirm("Archive");
    await later(alpha, 10_000);
    await until(alpha, runtime, Changes, (s) => s.attempt.outcome === "Confirmed");
    step("14");
    await until(alpha, runtime, List, (s) => s.list.status === "Loaded");
    step("15");
    expect([rows().includes("Your tax return"), world.inbox.changes.at(-1)]).toEqual([false, "archive g2"]);

    // spec/app/inbox/sending.md, "A restore is reviewed for messages chosen in Archived or Trash, or right after the change went out, bound to the message's history revision; Gmail refuses it as out of date when the message changed since"
    await drawn(() => [...document.querySelectorAll("[role=toolbar] button, nav button, button")].find((found) => found.textContent === "Archive" && !found.hasAttribute("aria-label"))?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await until(alpha, runtime, List, (s) => s.selected.folder === "Archived" && s.list.status === "Loaded");
    await choose("Your tax return");
    await press("Move back");
    await confirm("Move back");
    await until(alpha, runtime, Changes, (s) => s.kind === "Unarchive" && s.attempt.outcome === "Confirmed");
    expect(world.inbox.changes.at(-1)).toBe("unarchive g2");
    await press("Inbox");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Incoming" && s.list.status === "Loaded");
    expect(rows().includes("Your tax return")).toBe(true);

    // spec/app/inbox/index.md, "A read that fails offline or for another reason keeps what was on screen and the count, and says why"
    world.inbox.offline = true;
    await press("Refresh");
    await until(alpha, runtime, List, (s) => s.list.status === "Failed");
    step("16");
    expect([rows().length, told()]).toEqual([25, expect.stringContaining("You are offline")]);
    await first.close();

    // spec/app/inbox/index.md, "A restart keeps the selection, the list kept for it and its credential, whether Spam and Trash can be searched, and the count as no longer fresh, and forgets the rest"; spec/app/inbox/index.md, "The saved list can be on screen while Gmail cannot be reached"
    const second = await open(world);
    const again = inbox.runtime(second.alpha);
    await until(second.alpha, again, List, (s) => s.saved && s.accounts.status === "Failed");
    step("17");
    expect([rows().length, told()]).toEqual([25, expect.stringContaining("Saved list")]);

    // spec/app/inbox/index.md, "Only the newest read's answer is shown, and only while reading is allowed": a read Google refuses as withdrawn empties the screen and asks to reconnect.
    world.inbox.offline = false;
    world.inbox.revoked = true;
    await press("Refresh");
    await until(second.alpha, again, List, (s) => s.failure === "Revoked");
    step("18");
    expect([rows(), told()]).toEqual([[], expect.stringContaining("Gmail access was withdrawn")]);
  });
});

it("Connect Gmail and keep to its grant (spec/app/inbox/index.md, \"Story: Connect Gmail and keep to its grant\")", async () => {
  const world = { ...scene(), phone: true };
  world.inbox.google = undefined;
  const { alpha } = await open(world);
  const runtime = inbox.runtime(alpha);

  // spec/app/inbox/index.md, "The owner can be signed out, have no account connected, have several to choose from, lack read access, be asked to reconnect Gmail, and a check can be asked again before the last answers"
  await press("Inbox");
  await until(alpha, runtime, List, (s) => s.accounts.status === "Loaded" && s.connected.length === 0);
  expect(told()).toContain("Connect Gmail");

  // spec/app/inbox/index.md, "Mail is read only while signed in, for a selected account whose grant allows reading, and not once Google refused it as withdrawn"
  world.inbox.google = { email: "owner@gmail.test", connection: "grant-2", capabilities: ["google.basic_identity"] };
  await alpha.back();
  await press("Inbox");
  await until(alpha, runtime, List, (s) => s.accounts.status === "Loaded" && s.connected.length === 1);
  await drawn(() => [...document.querySelectorAll("button")].find((one) => one.textContent?.includes("owner@gmail.test"))?.click());
  await until(alpha, runtime, List, (s) => s.selected.account !== 0);
  expect([rows(), told()]).toEqual([[], expect.stringContaining("Alpha cannot read this mail")]);
});

it("Send a draft I reviewed (spec/app/inbox/sending.md, \"Story: Send a draft I reviewed\"; spec/app/inbox/drafts.md, \"Story: Write a message\"; spec/app/inbox/drafts.md, \"Story: Set a draft aside or discard it\"; spec/app/inbox/adding.md, \"Story: Add files and people to my draft\"; spec/app/inbox/suggestion.md, \"Story: Review what is offered into my email\"; spec/app/inbox/sending.md, \"Story: Save my draft to Gmail, or delete it there, knowingly\")", async () => {
  const world = { ...scene(), phone: false };
  const { alpha, close } = await open(world);
  const runtime = inbox.runtime(alpha);
  await tile("Inbox");
  await until(alpha, runtime, List, (s) => s.list.status === "Loaded" && s.pages === 1);

  // spec/app/inbox/drafts.md, "A new message, a reply, a reply to all or a forward begins as [one draft](./letter.md) says; a reply to a message with no usable address is refused and the owner told"
  await row("Your tax return");
  await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded");
  await menu("Reply");
  await until(alpha, runtime, Writing, (s) => s.open && s.letter.kind === "Reply" && s.letter.recipients === 1);

  // spec/app/inbox/drafts.md, "Every change to the text, recipients or attachments is an edit, counted at once"; spec/app/inbox/drafts.md, "Edits are written to the phone once typing pauses, and no later than the longest wait after a burst began, one write at a time under its own ticket"
  await write("Message", "Thanks, it is all in order.");
  await later(alpha, 10);
  await until(alpha, runtime, Writing, (s) => s.stored && !s.pending && s.write.status === "Loaded" && s.letter.revision >= 2);

  // spec/app/inbox/suggestion.md, "Only the owner puts it in, once, as it was last shown, into the draft as it still is, adding or replacing as the owner chooses; text that does not fit is refused whole and the offer stays"
  await runtime.runPromise(useInEmail("See you on Friday.", "Notes", { target: "NewEmail", account: 1, message: 0 }));
  await press("Review email suggestion");
  await until(alpha, runtime, Offering, (s) => s.review.showing && s.target === "ToDraft");
  await confirm("Add");
  await until(alpha, runtime, Offering, (s) => s.used === 1 && s.text === 0);
  await later(alpha, 10);
  await until(alpha, runtime, Writing, (s) => s.stored && !s.pending && s.write.status === "Loaded");
  expect((document.querySelector("textarea[aria-label=Message]") as HTMLTextAreaElement | null)?.value).toBe("Thanks, it is all in order.\n\nSee you on Friday.");

  // spec/app/inbox/sending.md, "Story: Save my draft to Gmail, or delete it there, knowingly"
  await menu("Save to Gmail");
  await until(alpha, runtime, Changes, (s) => s.review.showing && s.kind === "SaveDraft");
  await confirm("Save");
  await until(alpha, runtime, Changes, (s) => s.kind === "SaveDraft" && s.attempt.outcome === "Confirmed");
  await until(alpha, runtime, Writing, (s) => s.letter.gmail !== 0);
  expect(world.inbox.changes).toEqual(["draft-create Re: Your tax return"]);

  // spec/app/inbox/adding.md, "A file is attached to the draft open only once the picker gives one that fits within the room its account leaves; one too large, unreadable or without room is refused and said so"
  await press("Attach a file");
  await drawn(() => {
    const picker = document.querySelector("input[type=file]");
    if (!(picker instanceof HTMLInputElement)) throw new Error("no file picker");
    Object.defineProperty(picker, "files", { value: [new File(["the receipt"], "receipt.txt", { type: "text/plain" })] });
    picker.dispatchEvent(new Event("change"));
  });
  await until(alpha, runtime, Writing, (s) => s.letter.attachments === 1);
  expect(told()).toContain("receipt.txt");
  await later(alpha, 10);
  await until(alpha, runtime, Writing, (s) => s.stored && !s.pending && s.write.status === "Loaded");

  // spec/app/inbox/sending.md, "Only the owner confirms, only the review of the thing as it is now, while the account's grant allows it and, for a send, it has a valid recipient"
  await press("Send");
  await until(alpha, runtime, Changes, (s) => s.review.showing && s.kind === "Send");
  expect(document.querySelector('[role=dialog] [aria-label="Message"]')?.textContent).toBe("Thanks, it is all in order.\n\nSee you on Friday.");
  expect(world.inbox.changes).toEqual(["draft-create Re: Your tax return"]);
  await confirm("Send");
  await until(alpha, runtime, Changes, (s) => s.attempt.outcome === "Confirmed");
  expect([world.inbox.changes.at(-1), world.inbox.attached]).toEqual(["send s2@mail.test Re: Your tax return", ["receipt.txt"]]);

  // spec/app/inbox/drafts.md, "Once its send is confirmed, a draft unchanged since the revision sent is forgotten; one edited after it, or whose write is in flight, is kept and marked as sent"
  await until(alpha, runtime, Writing, (s) => !s.open && s.shelf.shelved.length === 0);

  // spec/app/inbox/drafts.md, "A draft is set aside only once it is wholly kept on the phone, and comes back exactly as it was set aside"
  await press("Back to the list");
  await until(alpha, runtime, Shown, (s) => s.message === 0);
  await press("Compose");
  await until(alpha, runtime, Writing, (s) => s.open);
  await fill("Add to To", "unfinished@");
  await write("Message", "Keep these words.");
  await hardware("back");
  await until(alpha, runtime, Writing, (s) => !s.open && s.shelf.shelved.length === 1);
  await close();

  const again = await open(world);
  const restored = inbox.runtime(again.alpha);
  await until(again.alpha, restored, Writing, (s) => !s.open && s.shelf.shelved.length === 1);
  await press("1 drafts set aside");
  await press("Keep these words.No recipient");
  await until(again.alpha, restored, Writing, (s) => s.open);
  expect([
    document.querySelector<HTMLInputElement>('input[aria-label="Add to To"]')?.value,
    document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.value,
    world.inbox.changes.length,
  ]).toEqual(["unfinished@", "Keep these words.", 2]);
});
