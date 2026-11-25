// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as List } from "../gen/app__inbox.effect.vibe";
import { Machine as Marks } from "../gen/app__inbox__marking.effect.vibe";
import { Machine as Shown } from "../gen/app__inbox__message.effect.vibe";
import { Machine as Changes } from "../gen/app__inbox__sending.effect.vibe";
import { Machine as Writing } from "../gen/app__inbox__drafts.effect.vibe";
import { Machine as Offering } from "../gen/app__inbox__suggestion.effect.vibe";
import { Machine as Shell, showing } from "../gen/app__shell.effect.vibe";
import home from "../src/home/index.tsx";
import type { Alpha } from "../src/runtime/area.tsx";
import { useInEmail } from "../src/inbox/suggestion.vibe";
import inbox from "../src/inbox/index.tsx";
import { button, closeAll, drawn, fill, hardware, later, only, open, press, underAct, until } from "./alpha.tsx";
import { Effect } from "effect";
import { Letters, nothing } from "../src/inbox/composer.vibe";
import { Mail } from "../src/inbox/gmail.vibe";
import { letter } from "./fakes/inbox.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const opens = () => [...document.querySelectorAll<HTMLButtonElement>("ul[aria-label='Email messages'] button")];
const subjectOf = (button: HTMLButtonElement) => button.querySelector("[data-inbox-subject]")?.textContent;
const rows = () => opens().map(subjectOf);
const row = (subject: string) => drawn(() => {
  const found = opens().find((open) => subjectOf(open) === subject);
  if (!found) throw new Error(`no message ${subject}`);
  found.click();
});
const choose = async (subject: string) => {
  if (!opens().some((open) => open.getAttribute("role") === "checkbox")) await menu("Select emails", "Mail options");
  await row(subject);
};
const confirm = (name: string) => drawn(() => {
  const found = [...document.querySelectorAll("[role=dialog] button, [role=alertdialog] button")].find((one) => one.textContent === name);
  if (!(found instanceof HTMLElement)) throw new Error(`no ${name} in the review`);
  found.click();
});
const menu = (item: string, label = "More actions") => drawn(() => {
  button(label)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
}).then(() => drawn(() => {
  const found = [...document.querySelectorAll("[role=menuitem],[role=menuitemradio]")].find((one) => one.textContent === item);
  if (!(found instanceof HTMLElement)) throw new Error(`no ${item} in the menu`);
  found.click();
}));
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
    const attachmentText = '<strong data-attachment-fixture>Review agenda</strong>';
    for (let at = 10; at <= 30; at += 1) world.inbox.mail.push(letter(at, `Newsletter ${at}`, ["INBOX"]));
    const termSheet = world.inbox.mail.find(({ card }) => card.id === "g1");
    if (!termSheet) throw new Error("Missing term sheet fixture");
    termSheet.body += "\n\nThe data room is at https://northpoint.test/room";
    termSheet.files = [...termSheet.files, {
      partId: "2", name: "agenda.txt", mimeType: "text/plain", size: new TextEncoder().encode(attachmentText).byteLength, supported: true,
    }];
    termSheet.attachmentText = { "2": attachmentText };
    const earlierLunch = letter(0, "Earlier lunch plan", ["SENT"], "Could you make it Friday?", undefined, Date.parse(termSheet.card.receivedAt) - 3_600_000);
    world.inbox.mail.push({ ...earlierLunch, card: { ...earlierLunch.card, threadId: "t1" } });
    const first = await open(world);
    const { alpha } = first;
    const runtime = inbox.runtime(alpha);

    // spec/app/inbox/index.md, "Opening Inbox, and every change to Google access, checks the accounts again, even while a check is out"
    await tile("Inbox");
    await until(alpha, runtime, List, (s) => s.list.status === "Loaded" && s.pages === 1);
    step("1");
    expect([rows().slice(0, 2), rows().length]).toEqual([["Revised term sheet", "Notes for the 3:00 review"], 25]);

    // spec/app/inbox/index.md, "More messages are read with the page cursor, which is given up as its page is asked"
    await press("Load more");
    await until(alpha, runtime, List, (s) => s.pages === 2);
    step("2");
    expect([rows().length, Boolean(button("Load more"))]).toEqual([28, false]);

    // spec/app/inbox/index.md, "Choosing a folder or a search reads its first page"
    await press("Search email");
    await search("tacos");
    await until(alpha, runtime, List, (s) => s.selected.query === "tacos" && s.list.status === "Loaded");
    step("3");
    expect(rows()).toEqual(["Dinner Friday?"]);

    // spec/app/inbox/index.md, "Back from a search shows its folder without the search, before Back leaves Inbox"
    await hardware("back");
    await until(alpha, runtime, List, (s) => s.selected.query === "" && s.list.status === "Loaded");
    expect([rows().length, Boolean(button("Search email")), document.querySelector("input[aria-label='Search mail']")]).toEqual([25, true, null]);
    await menu("Spam", "More folders");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Spam" && s.list.status === "Loaded");
    step("4");
    expect(rows()).toEqual(["Win a prize"]);
    await press("Inbox");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Incoming" && s.list.status === "Loaded");
    step("5");

    // spec/app/inbox/message.md, "A message opens at its newest place in the thread, only while the grant of its account allows reading"; spec/app/inbox/marking.md, "Opening an unread message marks it read once in a session, silently, and never again, even when it is not known to have worked"
    await row("Revised term sheet");
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded");
    step("6");
    await later(alpha, 1000);
    await until(alpha, runtime, Marks, (s) => s.attempt.outcome === "Confirmed");
    step("7");
    expect([title(), world.inbox.changes]).toEqual(["Revised term sheet", ["mark-read g1"]]);

    // spec/app/inbox/message.md, "Previous and next move one place through the thread"
    await action("Earlier messages");
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded" && s.position === 0);
    expect([title(), told()]).toEqual(["Earlier lunch plan", expect.stringContaining("Could you make it Friday?")]);
    await action("More messages");
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded" && s.position === 1);
    expect(title()).toBe("Revised term sheet");

    // spec/app/inbox/message.md, "Only an https link without credentials in it can be reviewed and opened; any other link stays text"
    const visited = vi.spyOn(window, "open").mockReturnValue(null);
    await press("https://northpoint.test/room");
    await until(alpha, runtime, Shown, (s) => s.link === 1);
    step("8");
    await confirm("Open link");
    await until(alpha, runtime, Shown, (s) => s.link === 0);
    step("9");
    expect(visited).toHaveBeenCalledWith("https://northpoint.test/room", "_blank", "noopener,noreferrer");

    // spec/app/inbox/message.md, "An attachment is reviewed before it is opened or saved, and one use is in flight at a time"
    await action("Open agenda.txt");
    await until(alpha, runtime, Shown, (s) => s.attachment === 2);
    expect([world.inbox.attachmentReads, document.querySelector("[aria-label='Attachment contents']")]).toEqual([[], null]);
    await confirm("Open");
    await until(alpha, runtime, Shown, (s) => s.file.outcome === "Confirmed");
    const preview = document.querySelector("[aria-label='Attachment contents']");
    expect([world.inbox.attachmentReads, preview?.textContent, preview?.querySelector("strong")]).toEqual([["g1/2"], attachmentText, null]);
    await confirm("Close");
    await until(alpha, runtime, Shown, (s) => s.attachment === 0);

    // spec/app/inbox/marking.md, "The owner marks a message read or unread; while another mark is in flight the owner is told it is still in progress, and a message whose last mark was unconfirmed is marked again only after the list was read afresh"
    await menu("Mark unread");
    await until(alpha, runtime, Marks, (s) => s.told === "Marked");
    step("10");
    expect(world.inbox.changes).toEqual(["mark-read g1", "mark-unread g1"]);
    await press("Back to the list");
    await until(alpha, runtime, Shown, (s) => s.message === 0);
    step("11");

    // spec/app/inbox/sending.md, "Archive and Trash are held for the undo window, and only the owner's Undo before it ends sends nothing"
    await choose("Standup notes");
    await menu("Archive", "Mail options");
    await confirm("Yes");
    await until(alpha, runtime, Changes, (s) => s.undo.holding === "Held");
    step("12");
    expect([rows().includes("Standup notes"), (await alpha.runtime.runPromise(List.use((list) => list.get()))).chosen]).toEqual([false, []]);
    await later(alpha, 4_000);
    await press("Undo");
    await until(alpha, runtime, Changes, (s) => s.undo.holding === "Undone");
    step("13");
    expect([rows().includes("Standup notes"), world.inbox.changes]).toEqual([true, ["mark-read g1", "mark-unread g1"]]);

    // spec/app/inbox/sending.md, "A recorded operation sends its one request, for its own account under that account's grant now, exactly as reviewed: a draft while it is at the revision shown and its hand-over is written to the phone, archive and Trash once the undo window has passed"
    await choose("Standup notes");
    await menu("Archive", "Mail options");
    await confirm("Yes");
    await later(alpha, 10_000);
    await until(alpha, runtime, Changes, (s) => s.attempt.outcome === "Confirmed");
    step("14");
    await until(alpha, runtime, List, (s) => s.list.status === "Loaded");
    step("15");
    expect([rows().includes("Standup notes"), world.inbox.changes.at(-1)]).toEqual([false, "archive g4"]);

    // spec/app/inbox/sending.md, "A restore is reviewed for messages chosen in Archived or Trash, or right after the change went out, bound to the message's history revision; Gmail refuses it as out of date when the message changed since"
    await drawn(() => [...document.querySelectorAll("[role=toolbar] button, nav button, button")].find((found) => found.textContent === "Archive" && !found.hasAttribute("aria-label"))?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await until(alpha, runtime, List, (s) => s.selected.folder === "Archived" && s.list.status === "Loaded");
    await choose("Standup notes");
    await menu("Restore to Inbox", "Mail options");
    await confirm("Yes");
    await until(alpha, runtime, Changes, (s) => s.kind === "Unarchive" && s.attempt.outcome === "Confirmed");
    expect(world.inbox.changes.at(-1)).toBe("unarchive g4");
    await press("Inbox");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Incoming" && s.list.status === "Loaded");
    expect(rows().includes("Standup notes")).toBe(true);

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
  world.inbox.offline = true;
  const { alpha } = await open(world);
  const runtime = inbox.runtime(alpha);

  // spec/app/platform/index.md, "The owner's tap on a mail sign-in control starts the phone's one more sign-in for mail where the phone wants it, then reads again once": signed out, the phone wants no mail sign-in and Connect Eliza Cloud opens Settings as it always did.
  world.signedIn = false;
  await press("Inbox");
  await until(alpha, runtime, List, (s) => !s.signedIn);
  await press("Connect Eliza Cloud");
  await until(alpha, alpha.runtime, Shell, (s) => showing(s, "Settings"));
  expect(world.mailLease.asked).toBe(0);
  world.signedIn = true;
  await hardware("home");

  // spec/app/inbox/index.md, "The answer names the connected accounts, their credentials and grants; the account chosen stays selected while it is connected, else the one account that may be read, else none and the owner chooses": a failed check changes nothing, and with nothing listed the list says mail could not be read and offers to check again
  await press("Inbox");
  await until(alpha, runtime, List, (s) => s.accounts.status === "Failed");
  expect([rows(), told()]).toEqual([[], expect.stringContaining("Mail could not be read")]);
  world.inbox.offline = false;

  // spec/app/inbox/index.md, "The owner can be signed out, have no account connected, have several to choose from, lack read access, be asked to reconnect Gmail, and a check can be asked again before the last answers"
  await press("Try again");
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

  // spec/app/platform/index.md, "A mail or calendar request the phone holds back for want of its mail lease reads as the cloud's own refusal of the device key there, never as a sign-out"; spec/app/inbox/index.md, "A check the phone holds back for want of the mail lease keeps the session and everything kept, and asks for one more sign-in": on a phone signed in before mail leases existed, opening Inbox, twice, keeps the draft, the accounts and the owner's session, and asks to sign in.
  const draft = { ...nothing, subject: "Kept through the lease" };
  await alpha.runtime.runPromise(Letters.use((letters) => Effect.andThen(Effect.sync(() => letters.set(9, draft)), letters.keep(9))));
  const generation = () => alpha.runtime.runPromise(Mail.use((mail) => Effect.sync(() => mail.generation())));
  const kept = await generation();
  const before = await runtime.runPromise(List.use((list) => list.get()));
  world.mailLease.held = false;
  for (const opening of [1, 2]) {
    await alpha.back();
    await press("Inbox");
    await until(alpha, runtime, List, (s) => s.failure === "LeaseNeeded" && s.accounts.status === "Failed" && s.accounts.ticket >= before.accounts.ticket + opening);
  }
  const after = await runtime.runPromise(List.use((list) => list.get()));
  const words = await alpha.runtime.runPromise(Letters.use((letters) => Effect.sync(() => letters.words(9))));
  expect([after.signedIn, after.connected, after.selected, after.revision, await generation(), words, told().includes("Connect Eliza Cloud")])
    .toEqual([true, before.connected, before.selected, before.revision, kept, draft, true]);

  // spec/app/platform/index.md, "The owner's tap on a mail sign-in control starts the phone's one more sign-in for mail where the phone wants it, then reads again once": the owner cancels that sign-in, and Inbox stays as it was, reading nothing and opening nothing.
  world.mailLease.answer = "Cancels";
  const heldBack = world.mailLease.heldBack;
  await press("Connect Eliza Cloud");
  await vi.waitFor(() => expect(world.mailLease.asked).toBe(1));
  await drawn(() => {});
  const cancelled = await runtime.runPromise(List.use((list) => list.get()));
  expect([world.mailLease.held, world.mailLease.heldBack, cancelled.accounts.ticket, showing(await alpha.runtime.runPromise(Shell.use((shell) => shell.get())), "Settings"), told().includes("Connect Eliza Cloud")])
    .toEqual([false, heldBack, after.accounts.ticket, false, true]);

  // spec/app/platform/index.md, "The owner's tap on a mail sign-in control starts the phone's one more sign-in for mail where the phone wants it, then reads again once"; spec/app/inbox/index.md, "The answer names the connected accounts, their credentials and grants; the account chosen stays selected while it is connected, else the one account that may be read, else none and the owner chooses": the owner signs in for mail, and Inbox checks the accounts again, once, with the lease, which ends the wait.
  world.mailLease.answer = "SignsIn";
  await press("Connect Eliza Cloud");
  await until(alpha, runtime, List, (s) => s.failure === "Fine" && s.accounts.status === "Loaded" && s.connected.length === 1);
  const signedIn = await runtime.runPromise(List.use((list) => list.get()));
  expect([world.mailLease.held, world.mailLease.asked, world.mailLease.heldBack, signedIn.accounts.ticket, signedIn.signedIn, await generation()])
    .toEqual([true, 2, heldBack, after.accounts.ticket + 1, true, kept]);

  // spec/app/inbox/index.md, "A check the phone holds back for want of the mail lease keeps the session and everything kept, and asks for one more sign-in": with mail on screen, the list keeps its saved rows and asks to Reconnect above them.
  world.inbox.google = { email: "owner@gmail.test", connection: "grant-2", capabilities: ["google.basic_identity", "google.gmail.triage", "google.gmail.send", "google.gmail.manage"] };
  await hardware("home");
  await tile("Inbox");
  await until(alpha, runtime, List, (s) => s.list.status === "Loaded" && s.pages >= 1);
  const shown = rows();
  expect(shown.length).toBeGreaterThan(0);
  world.mailLease.held = false;
  await hardware("home");
  await tile("Inbox");
  await until(alpha, runtime, List, (s) => s.failure === "LeaseNeeded");
  expect([rows(), Boolean(button("Reconnect Gmail")), told().includes("Connect Eliza Cloud")]).toEqual([shown, true, false]);

  // spec/app/inbox/message.md, "Only the newest read's answer is shown, while its account may still be read; a read that fails says why": a message the phone cannot read for want of the lease closes, back to the list and its Reconnect, never a Retry that cannot work.
  await row(shown[0] ?? "");
  await until(alpha, runtime, Shown, (s) => s.message === 0 && s.fault === "Revoked");
  await until(alpha, runtime, List, (s) => s.failure === "LeaseNeeded" && s.accounts.status === "Failed");
  expect([Boolean(button("Retry")), Boolean(button("Reconnect Gmail")), rows()]).toEqual([false, true, shown]);

  // spec/app/platform/index.md, "The owner's tap on a mail sign-in control starts the phone's one more sign-in for mail where the phone wants it, then reads again once": Reconnect over the saved rows starts the sign-in for mail, and the list is read again with the lease.
  await press("Reconnect Gmail");
  await until(alpha, runtime, List, (s) => s.failure === "Fine" && s.accounts.status === "Loaded" && s.list.status === "Loaded");
  expect([world.mailLease.held, world.mailLease.asked, Boolean(button("Reconnect Gmail")), rows()]).toEqual([true, 3, false, shown]);
});

it("Send a draft I reviewed (spec/app/inbox/sending.md, \"Story: Send a draft I reviewed\"; spec/app/inbox/drafts.md, \"Story: Write a message\"; spec/app/inbox/drafts.md, \"Story: Set a draft aside or discard it\"; spec/app/inbox/adding.md, \"Story: Add files and people to my draft\"; spec/app/inbox/suggestion.md, \"Story: Review what is offered into my email\"; spec/app/inbox/sending.md, \"Story: Save my draft to Gmail, or delete it there, knowingly\")", async () => {
  const world = { ...scene(), phone: false };
  const { alpha, close } = await open(world);
  const runtime = inbox.runtime(alpha);
  await tile("Inbox");
  await until(alpha, runtime, List, (s) => s.list.status === "Loaded" && s.pages === 1);

  // spec/app/inbox/drafts.md, "A new message, a reply, a reply to all or a forward begins as [one draft](./letter.md) says; a reply to a message with no usable address is refused and the owner told"
  await row("Standup notes");
  await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded");
  await menu("Reply");
  await until(alpha, runtime, Writing, (s) => s.open && s.letter.kind === "Reply" && s.letter.recipients === 1);

  // spec/app/inbox/drafts.md, "Every change to the text, recipients or attachments is an edit, counted at once"; spec/app/inbox/drafts.md, "Edits are written to the phone once typing pauses, and no later than the longest wait after a burst began, one write at a time under its own ticket"
  await fill("Message", "Thanks, it is all in order.");
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
  await menu("Save to Gmail", "Draft actions");
  await until(alpha, runtime, Changes, (s) => s.review.showing && s.kind === "SaveDraft");
  await confirm("Save");
  await until(alpha, runtime, Changes, (s) => s.kind === "SaveDraft" && s.attempt.outcome === "Confirmed");
  await until(alpha, runtime, Writing, (s) => s.letter.gmail !== 0);
  expect(world.inbox.changes).toEqual(["draft-create Re: Standup notes"]);

  // spec/app/inbox/adding.md, "A file is attached to the draft open only once the picker gives one that fits within the room its account leaves; one too large, unreadable or without room is refused and said so"
  await press("Attach file");
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

  // spec/app/inbox/drafts.md, "Before a draft with a Gmail copy is saved over it, and whenever the draft is unsure of that copy, Gmail's copy is read, one read at a time, while its account may be read"
  await menu("Check Gmail copy", "Draft actions");
  await until(alpha, runtime, Writing, (s) => s.lookup.status === "Loaded" && s.letter.verified === s.letter.revision && !s.pending && s.write.status === "Loaded");
  await menu("Save to Gmail", "Draft actions");
  await until(alpha, runtime, Changes, (s) => s.review.showing && s.kind === "ReplaceDraft");
  await confirm("Cancel");
  await until(alpha, runtime, Changes, (s) => !s.review.showing);

  // spec/app/inbox/sending.md, "Only the owner confirms, only the review of the thing as it is now, while the account's grant allows it and, for a send, it has a valid recipient"
  await press("Send email");
  await until(alpha, runtime, Changes, (s) => s.review.showing && s.kind === "Send");
  expect(document.querySelector('[role=dialog] [aria-label="Message"]')?.textContent).toBe("Thanks, it is all in order.\n\nSee you on Friday.");
  expect(world.inbox.changes).toEqual(["draft-create Re: Standup notes"]);
  await confirm("Send");
  await until(alpha, runtime, Changes, (s) => s.attempt.outcome === "Confirmed");
  expect([world.inbox.changes.at(-1), world.inbox.attached]).toEqual(["send sam@okafor.example Re: Standup notes", ["receipt.txt"]]);

  // spec/app/inbox/drafts.md, "Once its send is confirmed, a draft unchanged since the revision sent is forgotten; one edited after it, or whose write is in flight, is kept and marked as sent"
  await until(alpha, runtime, Writing, (s) => !s.open && s.shelf.shelved.length === 0);

  // spec/app/inbox/drafts.md, "A draft is set aside only once it is wholly kept on the phone, and comes back exactly as it was set aside"
  await press("Back to the list");
  await until(alpha, runtime, Shown, (s) => s.message === 0);
  // spec/app/inbox/drafts.md, "A draft from Gmail's Drafts opens only with no draft open and none set aside that holds it, and only when Alpha can open it whole; otherwise the owner is offered Open in Gmail"
  world.inbox.drafts.set("plain-remote", {
    id: "plain-remote", messageId: "remote-message", providerDigest: "a".repeat(64),
    content: { to: ["guest@example.test"], cc: [], bcc: [], subject: "A remote draft", bodyText: "Already in Gmail.", plainText: true, threaded: false, attachmentCount: 0 },
  });
  await menu("Drafts", "More folders");
  await until(alpha, runtime, List, (s) => s.selected.folder === "DraftsFolder" && s.list.status === "Loaded");
  await row("A remote draft");
  await until(alpha, runtime, Writing, (s) => s.open && s.letter.kind === "Saved" && s.letter.recipients === 1 && s.stored);
  expect(document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.value).toBe("Already in Gmail.");
  await menu("Discard", "Draft actions");
  await confirm("Discard");
  await until(alpha, runtime, Writing, (s) => !s.open);
  expect(world.inbox.drafts.has("plain-remote")).toBe(true);
  await press("Inbox");
  await until(alpha, runtime, List, (s) => s.selected.folder === "Incoming" && s.list.status === "Loaded");

  await press("Compose");
  await until(alpha, runtime, Writing, (s) => s.open);
  await fill("To", "unfinished@");
  await fill("Message", "Keep these words.");
  await hardware("back");
  await until(alpha, runtime, Writing, (s) => !s.open && s.shelf.shelved.length === 1);
  await close();

  const again = await open(world);
  const restored = inbox.runtime(again.alpha);
  await until(again.alpha, restored, Writing, (s) => !s.open && s.shelf.shelved.length === 1);
  await menu("Drafts", "More folders");
  await press("Draft, (No subject)");
  await until(again.alpha, restored, Writing, (s) => s.open);
  expect([
    document.querySelector<HTMLInputElement>('input[aria-label="To"]')?.value,
    document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.value,
    world.inbox.changes.length,
  ]).toEqual(["unfinished@", "Keep these words.", 2]);
});

// spec/app/home/cards.md, "The mail card shows the unread count, senders and subjects only, never a message body; marked not up to date when Inbox's page is not, and not drawn without an account or a row"
it("shows the authorized first page of unread Inbox mail on Home", async () => {
  const world = scene();
  world.inbox.mail.splice(0, world.inbox.mail.length, letter(1, "A private subject", ["INBOX", "UNREAD"], "A private message body"));
  for (let id = 2; id <= 27; id++) world.inbox.mail.push(letter(id, `Read mail ${id}`, ["INBOX"], "", "Sender", Date.UTC(2026, 9, 31, 0, id)));
  const { alpha } = await open(world, only("home", "view:Inbox"));
  const inboxState = inbox.runtime(alpha);
  async function homeIsReady(app: Alpha) {
    await until(app, home.runtime(app), Home, (state) => state.tiles.load.status === "Loaded");
  }
  await homeIsReady(alpha);
  await tile("Inbox");
  await until(alpha, inboxState, List, (state) => state.list.status === "Loaded" && state.pages === 1);
  expect(document.querySelectorAll("h1")).toHaveLength(1);
  await press("Back to apps");
  await until(alpha, alpha.runtime, Shell, (state) => state.trail.length === 0);
  await homeIsReady(alpha);
  const card = button("Open Inbox, 1+ unread");
  expect(card?.textContent).toContain("A private subject");
  expect(card?.textContent).toContain("Sender 1");
  expect(card?.textContent).not.toContain("A private message body");
  await press("Open Inbox, 1+ unread");
  await until(alpha, alpha.runtime, Shell, (state) => state.trail.at(-1) === "Inbox");
});
