// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as List } from "../gen/app__inbox.effect.vibe";
import { Machine as Marks } from "../gen/app__inbox__marking.effect.vibe";
import { Machine as Shown } from "../gen/app__inbox__message.effect.vibe";
import { Machine as Changes } from "../gen/app__inbox__sending.effect.vibe";
import { Machine as Writing } from "../gen/app__inbox__drafts.effect.vibe";
import { Machine as Adding } from "../gen/app__inbox__adding.effect.vibe";
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
import { type InboxNoticeScene, letter } from "./fakes/inbox.ts";
import { type Scene, scene } from "./fakes/scene.ts";

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
const title = () => (document.querySelector('[data-alpha-subview="inbox-detail"] main[aria-label]') ??
  document.querySelector("main[aria-label]:not([aria-label=Inbox]), main[aria-label=Inbox]"))?.getAttribute("aria-label");
async function openInboxFromHome(alpha: Alpha) {
  await until(alpha, alpha.runtime, Shell, (state) => state.trail.length === 0);
  await homeIsReady(alpha);
  await drawn(() => {
    const tile = document.querySelector<HTMLButtonElement>("[data-home-tile='view:Inbox']");
    if (!tile) throw new Error(`no Inbox tile on Home; visible text: ${told().slice(0, 240)}`);
    tile.click();
  });
}
const action = (name: string) => drawn(() => {
  const found = document.querySelector<HTMLButtonElement>(`button[aria-label='${name}']`);
  if (!found) throw new Error(`no action ${name}`);
  found.click();
});
const sibling = (snippet: string) => drawn(() => {
  const found = [...document.querySelectorAll<HTMLButtonElement>('[aria-label="Conversation"] button')].find((one) => one.textContent?.includes(snippet));
  if (!found) throw new Error(`no conversation preview for ${snippet}`);
  found.click();
});
const search = (text: string) => fill("Search mail", text).then(() => document.querySelector("form[role=search]")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
const inboxMounts = only("home", "view:Inbox", "view:Browser", "view:Settings", "assistant", "notice");

async function homeIsReady(alpha: Alpha) {
  await until(alpha, home.runtime(alpha), Home, (state) => state.tiles.load.status === "Loaded");
}

async function openInbox(world: Scene) {
  const opened = await open(world, inboxMounts);
  await homeIsReady(opened.alpha);
  return opened;
}

it("Open or ask about the exact Android mail notice (spec/app/inbox/notices.md, \"Story: Hear about new mail\"; spec/app/inbox/notices.md, \"Story: Open my message from a notice\"; spec/app/inbox/notices.md, \"Ask Alpha from a notice checks the same email again before spending the tap\")", async () => {
  const world = { ...scene(), phone: true };
  const notices: InboxNoticeScene = { spent: [], released: [] };
  world.inbox.notices = notices;
  const { alpha } = await openInbox(world);
  const runtime = inbox.runtime(alpha);
  await drawn(() => vi.waitFor(() => expect(notices.selection?.grantId).toBe(world.inbox.google?.connection)));
  const selection = notices.selection;
  if (!selection || !notices.enter) throw new Error("No native mail watch");
  const enter = notices.enter;
  const tap = { ...selection, generation: "notice-generation" };
  const first = world.inbox.mail.find(({ card }) => card.id === "g1");
  const second = world.inbox.mail.find(({ card }) => card.id === "g3");
  if (!first || !second) throw new Error("Missing mail for notification tap");

  await drawn(() => enter({ ...tap, token: "obsolete", grantId: "retired-grant", messageId: first.card.id, threadId: first.card.threadId }));
  expect(notices.spent).toEqual([]);
  await drawn(() => enter({ ...tap, token: "ordinary", messageId: first.card.id, threadId: first.card.threadId }));
  await until(alpha, runtime, Shown, (state) => state.body.status === "Loaded");
  expect([title(), notices.spent, world.ask.said]).toEqual([first.card.subject, ["ordinary"], []]);

  const ask = { ...tap, question: true, messageId: second.card.id, threadId: second.card.threadId };
  const review = () => document.querySelector("[role=alertdialog]")?.textContent ?? "";
  await drawn(() => enter({ ...ask, token: "dismissed" }));
  await drawn(() => vi.waitFor(() => expect(review()).toContain(second.body)));
  await confirm("Cancel");
  await drawn(() => vi.waitFor(() => expect(notices.released).toEqual(["dismissed"])));
  expect([notices.spent, world.ask.said]).toEqual([["ordinary"], []]);
  await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "goBack" }))));
  await until(alpha, alpha.runtime, Shell, (state) => state.assistant === "Bar" && showing(state, "Inbox"));

  await drawn(() => enter({ ...ask, token: "reviewed" }));
  await drawn(() => vi.waitFor(() => expect(review()).toContain(second.body)));
  await confirm("Add to chat");
  await drawn(() => vi.waitFor(() => expect(notices.spent).toEqual(["ordinary", "reviewed"])));
  expect(world.ask.said).toEqual([]);
}, 30_000);

it("Choose a phone contact for the email I’m writing (spec/app/inbox/adding.md, \"Story: Add files and people to my draft\"; spec/app/inbox/adding.md, \"The people shown are for the draft and the newest Contacts read, and choosing one adds only its displayed address\")", async () => {
  const world = { ...scene(), phone: true, image: true };
  world.telephony.contacts = false;
  const maya = world.telephony.people[0];
  if (!maya) throw new Error("Missing Android contact fixture");
  const email = "maya@example.test";
  maya.emailAddresses = [{ address: email, type: "home" }];
  const { alpha } = await openInbox(world);
  const runtime = inbox.runtime(alpha);
  await until(alpha, alpha.runtime, Shell, (state) => state.contacts);
  await openInboxFromHome(alpha);
  await until(alpha, runtime, List, (state) => state.list.status === "Loaded");
  await press("Compose");
  await until(alpha, runtime, Writing, (state) => state.open && state.letter.kind === "Fresh");
  const show = async () => {
    await press("Choose contacts");
    await until(alpha, runtime, Adding, (state) => state.people.status === "Loaded" && state.addresses === 1);
  };
  const choose = () => drawn(() => vi.waitFor(() => {
    const choice = document.querySelector<HTMLButtonElement>('[aria-label="Contact addresses"] button');
    expect(choice?.textContent ?? "").toContain(email);
    choice?.click();
  }));
  await show();
  expect(world.telephony.contacts).toBe(true);
  world.telephony.contacts = false;
  await choose();
  await until(alpha, runtime, Adding, (state) => state.contactDraft === 0);
  expect(await runtime.runPromise(Effect.flatMap(Writing, (writing) => Effect.map(writing.get(), (state) => state.letter.recipients)))).toBe(0);
  world.telephony.contacts = true;
  await show();
  await choose();
  await until(alpha, runtime, Writing, (state) => state.letter.recipients === 1);
  const added = await runtime.runPromise(Effect.flatMap(Writing, (writing) => Effect.flatMap(writing.get(), (state) =>
    Effect.map(Letters, (letters) => letters.words(state.letter.id).to))));
  expect([world.telephony.contacts, added, world.inbox.changes]).toEqual([true, [email], []]);
});

it("Star and mark the mail I reviewed (spec/app/inbox/sending.md, \"Story: Change the stars or read state of selected mail\")", async () => {
  const world = scene();
  const { alpha } = await openInbox(world);
  const runtime = inbox.runtime(alpha);
  const first = "Notes for the 3:00 review";
  const second = "Dinner Friday?";
  const subjects = [first, second];
  await openInboxFromHome(alpha);
  await until(alpha, runtime, List, (state) => state.list.status === "Loaded");
  await choose(first);
  await row(second);
  await until(alpha, runtime, List, (state) => state.chosen.length === subjects.length);
  await menu("Star", "Mail options");
  await until(alpha, runtime, Changes, (state) => state.review.showing && state.kind === "Star");
  expect([...(document.querySelector("[role=alertdialog] ul")?.querySelectorAll("li") ?? [])].map((one) => one.textContent)).toEqual(expect.arrayContaining([...subjects]));
  expect(world.inbox.changes).toEqual([]);
  await confirm("Yes");
  await until(alpha, runtime, Changes, (state) => state.attempt.outcome === "Confirmed");
  await menu("Starred", "More folders");
  await until(alpha, runtime, List, (state) => state.selected.folder === "Starred" && state.list.status === "Loaded");
  expect(rows()).toEqual(subjects);

  await choose(first);
  await row(second);
  await until(alpha, runtime, List, (state) => state.chosen.length === subjects.length);
  await menu("Mark as read", "Mail options");
  await until(alpha, runtime, Changes, (state) => state.review.showing && state.kind === "MarkRead");
  await confirm("Yes");
  await until(alpha, runtime, Changes, (state) => state.attempt.outcome === "Confirmed");
  expect(world.inbox.mail.filter(({ card }) => subjects.includes(card.subject)).map(({ card }) => [card.labels.includes("STARRED"), card.isUnread])).toEqual([[true, false], [true, false]]);
  expect(world.inbox.changes).toHaveLength(4);
});

it("Delete the reviewed phone drafts (spec/app/inbox/drafts.md, \"The owner can review and delete selected local drafts on the shelf, at the revisions shown\")", async () => {
  const world = scene();
  const first = await openInbox(world);
  const { alpha } = first;
  const runtime = inbox.runtime(alpha);
  await openInboxFromHome(alpha);
  await until(alpha, runtime, List, (state) => state.list.status === "Loaded");
  for (const [at, subject] of ["Notes for Monday", "Dinner arrangements"].entries()) {
    await press("Compose");
    await until(alpha, runtime, Writing, (state) => state.open);
    await fill("Subject", subject);
    await later(alpha, 10);
    await until(alpha, runtime, Writing, (state) => state.stored && state.letter.revision >= 1 && !state.pending);
    await press("Back from draft");
    await until(alpha, runtime, Writing, (state) => !state.open && state.shelf.shelved.length === at + 1);
  }
  await menu("Drafts", "More folders");
  await until(alpha, runtime, List, (state) => state.selected.folder === "DraftsFolder" && state.list.status === "Loaded");
  await menu("Select drafts", "Mail options");
  await menu("Select all shown", "Mail options");
  await menu("Delete drafts", "Mail options");
  await until(alpha, runtime, Writing, (state) => state.shelfSelection.reviewing && state.shelfSelection.picks.length === 2);
  expect(document.querySelector("[role=alertdialog]")?.textContent).toEqual(expect.stringContaining("Dinner arrangements"));
  await confirm("Delete");
  await until(alpha, runtime, Writing, (state) => state.shelf.shelved.length === 0 && state.shelfSelection.account === 0);
  expect(world.inbox.changes).toEqual([]);
  await first.close();
  const restored = await openInbox(world);
  await until(restored.alpha, inbox.runtime(restored.alpha), Writing, (state) => state.load.status === "Loaded" && state.shelf.shelved.length === 0);
}, 90_000);

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  it("See my mail (spec/app/inbox/index.md, \"Story: See my mail\"; spec/app/inbox/message.md, \"Story: Ask Alpha about a message\")", async () => {
    const world = { ...scene(), phone };
    if (phone) world.slots.add("inbox-saved-bodies");
    const attachmentText = '<strong data-attachment-fixture>Review agenda</strong>';
    for (let at = 10; at <= 30; at += 1) world.inbox.mail.push(letter(at, `Newsletter ${at}`, ["INBOX"]));
    const termSheet = world.inbox.mail.find(({ card }) => card.id === "g1");
    const dinner = world.inbox.mail.find(({ card }) => card.id === "g3");
    if (!termSheet || !dinner) throw new Error("Missing mailbox fixture");
    dinner.card = { ...dinner.card, hasAttachments: false };
    termSheet.body += "\n\nThe data room is at https://northpoint.test/room";
    termSheet.threadBody = "A stale copy of the selected email.";
    termSheet.files = [...termSheet.files, {
      partId: "2", name: "agenda.txt", mimeType: "text/plain", size: new TextEncoder().encode(attachmentText).byteLength, supported: true,
    }];
    termSheet.attachmentData = { "2": new TextEncoder().encode(attachmentText) };
    const earlierLunch = letter(0, "Earlier lunch plan", ["SENT"], "Could you make it Friday?", undefined, Date.parse(termSheet.card.receivedAt) - 3_600_000);
    world.inbox.mail.push({ ...earlierLunch, card: { ...earlierLunch.card, threadId: "t1" } });
    const first = await openInbox(world);
    const { alpha } = first;
    const runtime = inbox.runtime(alpha);

    // spec/app/inbox/index.md, "Opening Inbox, and every change to Google access, checks the accounts again, even while a check is out"
    await openInboxFromHome(alpha);
    await until(alpha, runtime, List, (s) => s.list.status === "Loaded" && s.pages === 1);
    expect([rows().slice(0, 2), rows().length]).toEqual([["Revised term sheet", "Notes for the 3:00 review"], 25]);
    expect(opens().find((one) => subjectOf(one) === "Revised term sheet")?.textContent).toContain("Has attachments");

    // spec/app/inbox/index.md, "Only a card with a positive attachment hint shows a paperclip"
    const attachmentBadge = (subject: string) => {
      const message = opens().find((open) => subjectOf(open) === subject);
      const announced = [...(message?.querySelectorAll(".sr-only") ?? [])].some((label) => label.textContent === "Has attachments");
      return [Boolean(message?.querySelector("svg.lucide-paperclip")), announced];
    };
    expect([attachmentBadge("Revised term sheet"), attachmentBadge("Dinner Friday?"), attachmentBadge("Standup notes")]).toEqual([[true, true], [false, false], [false, false]]);
    expect(world.inbox.attachmentReads).toEqual([]);

    // spec/app/inbox/index.md, "Inbox reads ahead only from a fresh list on screen"; spec/app/inbox/index.md, "More messages are read with the page cursor, which is given up as its page is asked"
    const nextPage = () => world.inbox.pageReads.filter(({ query, cursor }) => query === "in:inbox" && cursor === "p25");
    await drawn(() => vi.waitFor(() => expect([nextPage().length, [...new Set(world.inbox.bodyReads)].sort()]).toEqual([1, ["g1", "g2"]])));
    expect([rows().length, world.inbox.changes]).toEqual([25, []]);
    await press("Load more");
    await until(alpha, runtime, List, (s) => s.pages === 2);
    expect([rows().length, Boolean(button("Load more")), nextPage().length]).toEqual([28, false, 1]);

    // spec/app/inbox/index.md, "Choosing a folder or a search reads its first page"
    await press("Search email");
    await search("tacos");
    await until(alpha, runtime, List, (s) => s.selected.query === "tacos" && s.list.status === "Loaded");
    expect(rows()).toEqual(["Dinner Friday?"]);

    // spec/app/inbox/index.md, "Back from a search shows its folder without the search, before Back leaves Inbox"
    await hardware("back");
    await until(alpha, runtime, List, (s) => s.selected.query === "" && s.list.status === "Loaded");
    expect([rows().length, Boolean(button("Search email")), document.querySelector("input[aria-label='Search mail']")]).toEqual([25, true, null]);
    await menu("Spam", "More folders");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Spam" && s.list.status === "Loaded");
    expect(rows()).toEqual(["Win a prize"]);
    await press("Inbox");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Incoming" && s.list.status === "Loaded");

    // spec/app/inbox/message.md, "Opening a row reads the exact message chosen while its account may be read"; spec/app/inbox/marking.md, "Opening an unread message marks it read once in a session, silently, and never again, even when it is not known to have worked"
    await row("Revised term sheet");
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded");
    await later(alpha, 1000);
    await until(alpha, runtime, Marks, (s) => s.attempt.outcome === "Confirmed");
    expect([title(), world.inbox.changes]).toEqual(["Revised term sheet", ["mark-read g1"]]);

    // spec/app/inbox/message.md, "A thread control selects an exact position from the message and thread currently shown"
    await until(alpha, runtime, Shown, (s) => s.position === 1 && s.thread === 2);
    const threadReads = world.inbox.threadReads.length;
    await sibling("Could you make it Friday?");
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded" && s.position === 0);
    expect([title(), told()]).toEqual(["Earlier lunch plan", expect.stringContaining("Could you make it Friday?")]);
    await sibling(termSheet.card.snippet);
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded" && s.position === 1);
    expect([title(), told(), world.inbox.threadReads.length]).toEqual(["Revised term sheet", expect.stringContaining("https://northpoint.test/room"), threadReads]);
    expect(told()).not.toContain(termSheet.threadBody);

    if (!phone) {
      // spec/app/inbox/message.md, "Ask Alpha is handed the message on screen, once it has loaded, named by its account, number and history revision"
      await menu("Ask Alpha");
      await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Sheet");
      await drawn(() => vi.waitFor(() => expect(document.querySelector("[role=alertdialog]")?.textContent ?? "").toContain("Share this email with Alpha?")));
      expect([document.querySelector("[role=alertdialog]")?.textContent, world.ask.said]).toEqual([expect.stringContaining(termSheet.body), []]);
      await confirm("Add to chat");
      await drawn(() => vi.waitFor(() => expect(document.querySelector('textarea[aria-label="Message Alpha"]')).not.toBeNull()));
      await fill("Message Alpha", "What changed in the term sheet?");
      expect(world.ask.said).toEqual([]);
      await press("Send");
      await drawn(() => vi.waitFor(() => expect(world.ask.said).toHaveLength(1)));
      const sent = world.ask.said[0] ?? "";
      const lastBlock = sent.split("\n\n").at(-1) ?? "";
      expect([sent.startsWith("What changed in the term sheet?\n\n"), JSON.parse(lastBlock)]).toEqual([true, {
        from: termSheet.card.from, to: [...termSheet.card.to, ...termSheet.card.cc], subject: termSheet.card.subject, bodyText: termSheet.body,
      }]);
      await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "goBack" }))));
      await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Bar" && showing(s, "Inbox"));
    }

    // spec/app/inbox/message.md, "Only an https link without credentials in it can be reviewed and opened; any other link stays text"
    const visited = vi.spyOn(window, "open").mockReturnValue(null);
    await press("https://northpoint.test/room");
    await until(alpha, runtime, Shown, (s) => s.link === 1);
    expect([world.browser.tabs.size, visited.mock.calls.length]).toEqual([0, 0]);
    await confirm("Open link");
    await until(alpha, runtime, Shown, (s) => s.link === 0);
    if (phone) {
      await until(alpha, alpha.runtime, Shell, (state) => showing(state, "Browser"));
      await vi.waitFor(() => {
        const places = [...world.browser.tabs.values()].filter((tab) => tab.committed && !tab.private).map((tab) => tab.history.at(-1));
        expect([places, visited.mock.calls.length]).toEqual([["https://northpoint.test/room"], 0]);
      }, { timeout: 12_000 });
      await hardware("back");
      await until(alpha, alpha.runtime, Shell, (state) => showing(state, "Inbox"));
    } else {
      expect(visited).toHaveBeenCalledWith("https://northpoint.test/room", "_blank", "noopener,noreferrer");
    }

    // spec/app/inbox/message.md, "An attachment is reviewed before it is opened or saved, and one use is in flight at a time"
    await press(/^Open\s*agenda\.txt/);
    await until(alpha, runtime, Shown, (s) => s.attachment === 2);
    expect([world.inbox.attachmentReads, document.querySelector("[aria-label='Attachment contents']")]).toEqual([[], null]);
    await confirm("Open");
    await until(alpha, runtime, Shown, (s) => s.file.outcome === "Confirmed");
    const preview = document.querySelector("[aria-label='Attachment contents']");
    expect([world.inbox.attachmentReads, preview?.textContent, preview?.querySelector("strong")]).toEqual([["g1/2"], attachmentText, null]);
    await confirm("Close");
    await until(alpha, runtime, Shown, (s) => s.attachment === 0);
    if (phone) {
      await action("Save agenda.txt");
      expect(world.inbox.savedAttachments.size).toBe(0);
      await confirm("Save");
      await until(alpha, runtime, Shown, (s) => s.file.outcome === "Confirmed");
      expect([world.inbox.savedAttachments.get("agenda.txt"), told()]).toEqual([attachmentText, expect.stringContaining("Saved to Files")]);
      await confirm("Close");
      await until(alpha, runtime, Shown, (s) => s.attachment === 0);
    }

    // spec/app/inbox/marking.md, "The owner marks a message read or unread; while another mark is in flight the owner is told it is still in progress, and a message whose last mark was unconfirmed is marked again only after the list was read afresh"
    await menu("Mark unread");
    await until(alpha, runtime, Marks, (s) => s.told === "Marked");
    expect(world.inbox.changes).toEqual(["mark-read g1", "mark-unread g1"]);
    await press("Back to the list");
    await until(alpha, runtime, Shown, (s) => s.message === 0);
    await press("Sent");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Sent" && s.list.status === "Loaded");
    world.inbox.threadPageSize = 1;
    const threadReply = Promise.withResolvers<void>();
    world.inbox.threadReply = threadReply.promise;
    try {
      await row("Earlier lunch plan");
      await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded");
      expect([title(), told(), Boolean(button("More messages"))]).toEqual(["Earlier lunch plan", expect.stringContaining("Could you make it Friday?"), false]);
    } finally {
      threadReply.resolve();
      delete world.inbox.threadReply;
    }
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded" && s.thread === 2);
    expect([title(), Boolean(button("More messages")), world.inbox.changes]).toEqual(["Earlier lunch plan", true, ["mark-read g1", "mark-unread g1"]]);
    const history = String(world.inbox.history);
    await action("More messages");
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded" && s.position === 1);
    expect(title()).toBe("Revised term sheet");
    await action("Earlier messages");
    await until(alpha, runtime, Shown, (s) => s.body.status === "Loaded" && s.position === 0);
    expect([title(), world.inbox.threadReads.slice(-2)]).toEqual(["Earlier lunch plan", [{ offset: 1, history }, { offset: 0, history }]]);
    delete world.inbox.threadPageSize;
    await press("Back to the list");
    await until(alpha, runtime, Shown, (s) => s.message === 0);
    await press("Inbox");
    await until(alpha, runtime, List, (s) => s.selected.folder === "Incoming" && s.list.status === "Loaded");

    // spec/app/inbox/sending.md, "Archive and Trash are held for the undo window, and only the owner's Undo before it ends sends nothing"
    await choose("Standup notes");
    await menu("Archive", "Mail options");
    await confirm("Yes");
    await until(alpha, runtime, Changes, (s) => s.undo.holding === "Held");
    expect([rows().includes("Standup notes"), (await alpha.runtime.runPromise(List.use((list) => list.get()))).chosen]).toEqual([false, []]);
    await later(alpha, 4_000);
    await press("Undo");
    await until(alpha, runtime, Changes, (s) => s.undo.holding === "Undone");
    expect([rows().includes("Standup notes"), world.inbox.changes]).toEqual([true, ["mark-read g1", "mark-unread g1"]]);

    // spec/app/inbox/sending.md, "A recorded operation sends its one request, for its own account under that account's grant now, exactly as reviewed: a draft while it is at the revision shown and its hand-over is written to the phone, archive and Trash once the undo window has passed"
    await choose("Standup notes");
    await menu("Archive", "Mail options");
    await confirm("Yes");
    await later(alpha, 10_000);
    await until(alpha, runtime, Changes, (s) => s.attempt.outcome === "Confirmed");
    await until(alpha, runtime, List, (s) => s.list.status === "Loaded");
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
    expect([rows().length, told()]).toEqual([25, expect.stringContaining("You are offline")]);
    if (phone) await vi.waitFor(() => expect(world.secrets.has("inbox-saved-bodies")).toBe(true));
    await first.close();

    // spec/app/inbox/index.md, "A restart keeps the selection, the list kept for it and its credential, whether Spam and Trash can be searched, and the count as no longer fresh, and forgets the rest"; spec/app/inbox/index.md, "The saved list can be on screen while Gmail cannot be reached"
    const second = await open(world, inboxMounts);
    const again = inbox.runtime(second.alpha);
    await until(second.alpha, again, List, (s) => s.saved && s.accounts.status === "Failed");
    expect([rows().length, told()]).toEqual([25, expect.stringContaining("Saved list")]);

    // spec/app/inbox/message.md, "While the list shows its saved copy and access is being checked or offline, a message saved on the phone opens from there, marked as saved"
    if (phone) {
      await row("Revised term sheet");
      await until(second.alpha, again, Shown, (s) => s.fromPhone);
      expect([told().includes("Need your eyes by Friday"), document.querySelector("iframe[title='Formatted email']"),
        button("Open agenda.txt"), button("https://northpoint.test/room")]).toEqual([true, null, undefined, undefined]);
      await press("Back to the list");
      await until(second.alpha, again, Shown, (s) => s.message === 0);
    }

    // spec/app/inbox/index.md, "Only the newest read's answer is shown, and only while reading is allowed": a read Google refuses as withdrawn empties the screen and asks to reconnect.
    world.inbox.offline = false;
    world.inbox.revoked = true;
    await press("Refresh");
    await until(second.alpha, again, List, (s) => s.failure === "Revoked");
    expect([rows(), told()]).toEqual([[], expect.stringContaining("Gmail access was withdrawn")]);
    if (phone) await vi.waitFor(() => expect(world.secrets.has("inbox-saved-bodies")).toBe(false));
  });
});

it("Connect Gmail and keep to its grant (spec/app/inbox/index.md, \"Story: Connect Gmail and keep to its grant\")", async () => {
  const world = { ...scene(), phone: true };
  world.inbox.google = undefined;
  world.inbox.offline = true;
  world.signedIn = false;
  const { alpha } = await openInbox(world);
  const runtime = inbox.runtime(alpha);

  // spec/app/platform/index.md, "The owner's tap on a mail sign-in control starts the phone's one more sign-in for mail where the phone wants it, then reads again once": signed out, the phone wants no mail sign-in and Connect Eliza Cloud opens Settings as it always did.
  await openInboxFromHome(alpha);
  await until(alpha, runtime, List, (s) => !s.signedIn);
  await press("Connect Eliza Cloud");
  await until(alpha, alpha.runtime, Shell, (s) => showing(s, "Settings"));
  expect(world.mailLease.asked).toBe(0);
  world.signedIn = true;
  await hardware("home");

  // spec/app/inbox/index.md, "The answer names the connected accounts, their credentials and grants; the account chosen stays selected while it is connected, else the one account that may be read, else none and the owner chooses": a failed check changes nothing, and with nothing listed the list says mail could not be read and offers to check again
  await openInboxFromHome(alpha);
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
  await openInboxFromHome(alpha);
  await until(alpha, runtime, List, (s) => s.accounts.status === "Loaded" && s.connected.length === 1);
  await drawn(() => [...document.querySelectorAll("button")].find((one) => one.textContent?.includes("owner@gmail.test"))?.click());
  await until(alpha, runtime, List, (s) => s.selected.account !== 0);
  expect([rows(), told()]).toEqual([[], expect.stringContaining("Alpha cannot read this mail")]);

  // spec/app/platform/index.md, "A mail or calendar request the phone holds back for want of its mail lease reads as the cloud's own refusal of the device key there, never as a sign-out"; spec/app/inbox/index.md, "A check the phone holds back for want of the mail lease keeps the session and everything kept, and asks for one more sign-in": on a phone signed in before mail leases existed, opening Inbox, twice, keeps the draft, the accounts and the owner's session, and asks to sign in.
  const draft = { ...nothing, subject: "Kept through the lease" };
  await alpha.runtime.runPromise(Letters.use((letters) => Effect.andThen(Effect.sync(() => letters.set(9, draft)), letters.keep(9))));
  const generation = () => alpha.runtime.runPromise(Effect.map(Mail, (mail) => mail.generation()));
  const kept = await generation();
  const before = await runtime.runPromise(List.use((list) => list.get()));
  world.mailLease.held = false;
  for (const opening of [1, 2]) {
    await alpha.back();
    await openInboxFromHome(alpha);
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
  await openInboxFromHome(alpha);
  await until(alpha, runtime, List, (s) => s.list.status === "Loaded" && s.pages >= 1);
  const shown = rows();
  expect(shown.length).toBeGreaterThan(0);
  world.mailLease.held = false;
  await hardware("home");
  await openInboxFromHome(alpha);
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

  // spec/app/inbox/index.md, "A new cloud session starts from nothing, and checks the accounts only once signed in"
  world.voice.organizationId = "org-2";
  await hardware("home");
  await openInboxFromHome(alpha);
  await until(alpha, runtime, List, (s) => !s.signedIn);
  expect([rows(), Boolean(button("Connect Eliza Cloud"))]).toEqual([[], true]);
});

it("Send a draft I reviewed (spec/app/inbox/sending.md, \"Story: Send a draft I reviewed\"; spec/app/inbox/drafts.md, \"Story: Write a message\"; spec/app/inbox/drafts.md, \"Story: Set a draft aside or discard it\"; spec/app/inbox/adding.md, \"Story: Add files and people to my draft\"; spec/app/inbox/suggestion.md, \"Story: Review what is offered into my email\"; spec/app/inbox/sending.md, \"Story: Save my draft to Gmail, or delete it there, knowingly\"; spec/app/inbox/drafts.md, \"Story: Find out whether a send went\")", async () => {
  const world = { ...scene(), phone: false };
  const original = world.inbox.mail.find(({ card }) => card.id === "g4");
  if (!original) throw new Error("Missing original mail fixture");
  const bytes = new TextEncoder().encode("Meeting actions");
  original.files = [{ partId: "1", name: "actions.txt", mimeType: "text/plain", size: bytes.length, supported: true }];
  original.attachmentData = { "1": bytes };
  const { alpha, close } = await openInbox(world);
  const runtime = inbox.runtime(alpha);
  await openInboxFromHome(alpha);
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
  expect(document.querySelector<HTMLTextAreaElement>("textarea[aria-label=Message]")?.value).toBe("Thanks, it is all in order.\n\nSee you on Friday.");

  // spec/app/inbox/sending.md, "Story: Save my draft to Gmail, or delete it there, knowingly"
  await menu("Save to Gmail", "Draft actions");
  await until(alpha, runtime, Changes, (s) => s.review.showing && s.kind === "SaveDraft");
  world.inbox.loseDraftReply = true;
  await confirm("Save");
  await until(alpha, runtime, Writing, (s) => s.letter.unsure && s.letter.copyAttempt !== 0 && s.stored && !s.pending && s.write.status === "Loaded");
  expect(told()).toContain("Alpha cannot confirm what happened to Gmail's copy");
  await press("Check Gmail copy");
  await until(alpha, runtime, Changes, (s) => s.kind === "SaveDraft" && s.attempt.outcome === "Confirmed");
  await until(alpha, runtime, Writing, (s) => !s.letter.unsure && s.letter.gmail !== 0);
  expect([world.inbox.changes, world.inbox.receiptReads.length, world.inbox.drafts.size]).toEqual([["draft-create Re: Standup notes"], 1, 1]);

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

  // spec/app/inbox/letter.md, "A reply goes to the Reply-To address when the message has one, else to its sender; a reply to all adds everyone else on its To and Cc; a forward carries the original's attachments only where the account may forward them and they fit, and is otherwise text only and says so"
  await menu("Forward");
  await until(alpha, runtime, Writing, (s) => s.open && s.letter.kind === "Forward");
  expect(told()).toContain("actions.txt");
  await fill("To", "reader@example.test");
  await drawn(() => document.querySelector<HTMLInputElement>('input[aria-label="To"]')?.form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  await later(alpha, 10);
  await until(alpha, runtime, Writing, (s) => s.letter.recipients === 1 && s.stored && !s.pending && s.write.status === "Loaded");
  await press("Send email");
  await until(alpha, runtime, Changes, (s) => s.review.showing && s.kind === "Send");
  expect(document.querySelector("[role=dialog]")?.textContent).toContain("actions.txt");
  expect(world.inbox.changes).toHaveLength(2);
  world.inbox.loseSendReply = true;
  await confirm("Send");
  await until(alpha, runtime, Writing, (s) => s.open && s.letter.doubt.attempt !== 0);
  expect(told()).toContain("Alpha cannot tell whether it was sent");
  await press("Check Sent");
  await until(alpha, runtime, Writing, (s) => !s.open);
  expect(new Set(world.inbox.receiptReads).size).toBe(2);
  expect([world.inbox.changes.at(-1), world.inbox.attached]).toEqual(["send reader@example.test Fwd: Standup notes", ["receipt.txt", "actions.txt"]]);

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
  await row("A remote draft");
  await until(alpha, runtime, Writing, (s) => s.open && s.stored && s.write.status === "Loaded");
  world.inbox.loseDraftReply = true;
  await menu("Delete Gmail copy", "Draft actions");
  await until(alpha, runtime, Changes, (s) => s.review.showing && s.kind === "DeleteDraft");
  await confirm("Delete");
  await until(alpha, runtime, Writing, (s) => s.letter.unsure && s.letter.copyAttempt !== 0 && s.stored && !s.pending && s.write.status === "Loaded");
  await press("Check Gmail copy");
  await until(alpha, runtime, Writing, (s) => s.open && !s.letter.unsure && s.letter.gmail === 0 && s.write.status === "Loaded");
  expect([
    world.inbox.drafts.has("plain-remote"),
    document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.value,
    new Set(world.inbox.receiptReads).size,
  ]).toEqual([false, "Already in Gmail.", 3]);
  await menu("Discard", "Draft actions");
  await confirm("Discard");
  await until(alpha, runtime, Writing, (s) => !s.open);
  await press("Inbox");
  await until(alpha, runtime, List, (s) => s.selected.folder === "Incoming" && s.list.status === "Loaded");

  await press("Compose");
  await until(alpha, runtime, Writing, (s) => s.open);
  await fill("To", "unfinished@");
  await fill("Message", "Keep these words.");
  await hardware("back");
  await until(alpha, runtime, Writing, (s) => !s.open && s.shelf.shelved.length === 1);
  await close();

  const again = await open(world, inboxMounts);
  const restored = inbox.runtime(again.alpha);
  await until(again.alpha, restored, Writing, (s) => !s.open && s.shelf.shelved.length === 1);
  await menu("Drafts", "More folders");
  await row("(No subject)");
  await until(again.alpha, restored, Writing, (s) => s.open);
  expect([
    document.querySelector<HTMLInputElement>('input[aria-label="To"]')?.value,
    document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message"]')?.value,
    world.inbox.changes.length,
  ]).toEqual(["unfinished@", "Keep these words.", 4]);
});

// spec/app/home/cards.md, "The mail card shows the unread count, senders and subjects only, never a message body; marked not up to date when Inbox's page is not, and not drawn without an account or a row"
it("shows the authorized first page of unread Inbox mail on Home", async () => {
  const world = scene();
  world.inbox.mail.splice(0, world.inbox.mail.length, letter(1, "A private subject", ["INBOX", "UNREAD"], "A private message body"));
  for (let id = 2; id <= 27; id++) world.inbox.mail.push(letter(id, `Read mail ${id}`, ["INBOX"], "", "Sender", Date.UTC(2026, 9, 31, 0, id)));
  const { alpha } = await open(world, only("home", "view:Inbox"));
  const inboxState = inbox.runtime(alpha);
  await openInboxFromHome(alpha);
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
