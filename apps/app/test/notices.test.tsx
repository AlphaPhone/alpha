// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Notices } from "../gen/app__notices.effect.vibe";
import * as CollectionGen from "../gen/app__notices__collection.ts";
import { Machine as Collection } from "../gen/app__notices__collection.effect.vibe";
import * as DeletionsGen from "../gen/app__notices__deletions.ts";
import { Machine as Deletions } from "../gen/app__notices__deletions.effect.vibe";
import * as PostingGen from "../gen/app__notices__posting.ts";
import { Machine as Posting } from "../gen/app__notices__posting.effect.vibe";
import * as NoticeRemindersGen from "../gen/app__notices__reminders.ts";
import { Machine as NoticeReminders } from "../gen/app__notices__reminders.effect.vibe";
import { Machine as Toasts } from "../gen/app__notices__toasts.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import { at } from "../src/areas.ts";
import noticesArea, {
  ALPHA_CHANNEL_GROUPS,
  DeletionDesk,
  NoticeDesk,
  NoticeRemindersDesk,
  PostingDesk,
  ShadeShelf,
  acknowledgeNotice,
  askAboutShadeRow,
  askAboutWaitingTap,
  canPostToChannel,
  chooseCollectionApp,
  clearAllShadeRows,
  closeNoticeQuestion,
  concealNoticesForOwner,
  confirmNoticeQuestion,
  createNoticeReminder,
  decideNoticeReminder,
  deliverNotice,
  dismissOwnRow,
  keep,
  markDeletionItemChanged,
  markNoticeSpent,
  markReviewedNoticeChanged,
  observeListenerAccess,
  offer,
  openShade,
  openWaitingTap,
  queueDeletion,
  queueNotice,
  readNoticeReminders,
  recoverDeletions,
  restartAndCheckPosting,
  restartAndRecoverNoticeReminders,
  restartDeletions,
  restartNotices,
  retryNoticeDelivery,
  ringNoticeReminder,
  say,
  setCollectionConsent,
  setPhoneLocked,
  showOwnNotices,
  switchCollectionOwner,
  switchDeletionsOwner,
  switchNoticeOwner,
  tapNotice,
  undoDeletion,
  withdraw,
} from "../src/notices/index.tsx";
import { button, closeAll, drawn, later, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const toastRegion = () => document.querySelector("[data-alpha-toast-region]");
const toast = () => toastRegion()?.textContent;
const live = () => toastRegion()?.getAttribute("aria-live");

const noticesMounts = () => [
  ...only("home", "notice"),
  at("overlay", () => Promise.resolve({ default: noticesArea })),
];

describe("the toasts", () => {
  // spec/app/notices/toasts.md, "Story: Read a toast before it goes"; spec/app/notices/toasts.md, "Story: Keep an Undo in reach"; spec/app/notices/toasts.md, "Story: Keep what I must not miss"
  it("Read a toast before it goes, keep an Undo in reach and keep what I must not miss (spec/app/notices/toasts.md, \"Story: Read a toast before it goes\"; spec/app/notices/toasts.md, \"Story: Keep an Undo in reach\"; spec/app/notices/toasts.md, \"Story: Keep what I must not miss\")", async () => {
    const { alpha } = await open(scene());
    let undone = 0;

    // spec/app/notices/toasts.md, "A toast stays 1.9 seconds, a long one 50 milliseconds a character and half a second more up to 12 seconds, and a change is offered for Undo at least 10 seconds; all are stretched by Android's scale"
    await alpha.runtime.runPromise(say("Saved"));
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing);
    expect([toast(), live()]).toEqual(["Saved", "polite"]);
    await later(alpha, 1_900);
    await until(alpha, alpha.runtime, Toasts, (t) => !t.showing);

    // spec/app/notices/toasts.md, "A toast is shown at once unless an Undo shows; behind an Undo, an Undo waits its turn and a plain toast waits, giving way to a newer plain one; nothing shows during startup, and what was raised then waits"
    await alpha.runtime.runPromise(offer("Deleted Lunch", "notes", 1, Effect.sync(() => { undone += 1; })));
    await alpha.runtime.runPromise(say("Couldn't share", true));
    await later(alpha, 30_000);
    expect(toast()).toContain("Deleted Lunch");

    // spec/app/notices/toasts.md, "Tapping Undo passes the tap on once, naming the change of the toast showing, and the next toast waiting is shown"
    await press("Undo");
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing && !t.current.undo);
    expect([undone, toast(), live()]).toEqual([1, "Couldn't share", "assertive"]);

    // spec/app/notices/toasts.md, "The area that raised an Undo toast withdraws it, showing or waiting, once its change can no longer be undone"
    await alpha.runtime.runPromise(offer("Archived a message", "inbox", 2, Effect.sync(() => { undone += 1; })));
    await until(alpha, alpha.runtime, Toasts, (t) => t.current.undo);
    await alpha.runtime.runPromise(withdraw("inbox", 2));
    await until(alpha, alpha.runtime, Toasts, (t) => !t.current.undo);
    expect(undone).toBe(1);

    // spec/app/notices/toasts.md, "An area keeps a notice under its own name and number, once; at most three are listed, and a fourth pushes out the oldest"
    await alpha.runtime.runPromise(keep("Your recording was not saved", "camera", 1));
    await until(alpha, alpha.runtime, Toasts, (t) => t.kept.length === 1);
    await later(alpha, 12_000);
    await until(alpha, alpha.runtime, Toasts, (t) => !t.showing);

    // spec/app/notices/toasts.md, "A kept notice stays listed until the owner dismisses it"
    expect(Boolean(button("Dismiss Your recording was not saved"))).toBe(true);
    await press("Dismiss Your recording was not saved");
    await until(alpha, alpha.runtime, Toasts, (t) => t.kept.length === 0);

    // spec/app/notices/toasts.md, "Story: See a toast over a dialog"
    const dialog = document.body.appendChild(document.createElement("div"));
    dialog.setAttribute("role", "dialog");
    await alpha.runtime.runPromise(Layers.use((layers) => layers.send({ type: "openLayer", id: "confirm", kind: "DialogLayer", covers: true })));
    await until(alpha, alpha.runtime, Toasts, (t) => t.dialog === 1);
    await alpha.runtime.runPromise(say("Copied inside dialog"));
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing && t.shownIn === 1);
    expect(dialog.querySelector("[data-alpha-toast-region]")?.textContent).toBe("Copied inside dialog");
    await alpha.runtime.runPromise(Layers.use((layers) => layers.send({ type: "closeLayer", id: "confirm" })));
    dialog.remove();
  });

  it('Concurrent raises keep every toast message and focus holds a toast after pointer leave (spec/app/notices/toasts.md, "Every toast raised is shown at once, or waits"; spec/app/notices/toasts.md, "A plain toast the owner is reading is held, and its whole time starts again when they let go")', async () => {
    const { alpha } = await open(scene(), only("home", "notice"));
    await alpha.runtime.runPromise(Effect.all([
      offer("Deleted note", "notes", 1, Effect.void),
      say("Second notice"),
    ], { concurrency: "unbounded" }));
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing && t.current.undo);
    expect(toast()).toContain("Deleted note");
    await press("Undo");
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing && !t.current.undo);
    expect(toast()).toBe("Second notice");

    const card = document.querySelector<HTMLElement>("[data-alpha-toast-region] > div");
    if (!card) throw new Error("no toast card");
    card.tabIndex = 0;
    await drawn(() => {
      card.focus();
      card.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    });
    await until(alpha, alpha.runtime, Toasts, (t) => t.held);
    await drawn(() => { card.dispatchEvent(new PointerEvent("pointerout", { bubbles: true })); });
    await later(alpha, 5_000);
    expect((await alpha.runtime.runPromise(Toasts.use((m) => m.get()))).showing).toBe(true);
    expect(toast()).toBe("Second notice");
  });
});

describe("notices shade, taps, deletions, posting, and reminders", () => {
  // spec/app/notices/collection.md, "Story: Let Alpha see my notifications"; spec/app/notices/collection.md, "Story: See and dismiss Alpha's own notices"; spec/app/notices/collection.md, "Story: Change owner or restart while collecting"
  it("Enforces shade consent, secret preview hiding, 20-item history cap, own rows, and owner scoping (spec/app/notices/collection.md, \"Story: Let Alpha see my notifications\"; spec/app/notices/collection.md, \"Story: See and dismiss Alpha's own notices\"; spec/app/notices/collection.md, \"Story: Change owner or restart while collecting\")", async () => {
    const { alpha } = await open(scene(), noticesMounts());
    const runtime = noticesArea.runtime(alpha);

    await runtime.runPromise(switchCollectionOwner(1));
    // spec/app/notices/collection.md, "Alpha's own rows need no listener consent, and show only while the phone is unlocked"
    await drawn(() => runtime.runPromise(showOwnNotices([{ id: 7, title: "Approval waiting", text: "Send email", at: 10 }], true)));
    await until(alpha, runtime, Collection, (c) => c.own === 1);
    await drawn(() => runtime.runPromise(openShade));
    expect(document.body.textContent).toContain("Approval waiting");

    // spec/app/notices/collection.md, "Only the newest listing is shown, while collection is active and the phone unlocked; its text only with consent to previews and never for a secret notification; a listing can fail"
    const batch = Array.from({ length: 25 }, (_, i) => ({
      id: `n-${i + 1}`,
      appLabel: "Chat",
      title: `Message ${i + 1}`,
      text: `Secret body ${i + 1}`,
      at: 100 + i,
      owned: true,
      secret: i === 0,
      clearable: true,
    }));
    await runtime.runPromise(Effect.flatMap(ShadeShelf, (shelf) => Effect.sync(() => shelf.setSourceRows(batch))));
    await drawn(() => runtime.runPromise(setCollectionConsent(true, true, true, 1, "Owner")));
    await drawn(() => runtime.runPromise(chooseCollectionApp("Owner")));
    await drawn(() => runtime.runPromise(observeListenerAccess("Granted", true)));
    await until(alpha, runtime, Collection, (c) => c.rows === 25 && c.kept === CollectionGen.maxKept);

    const colState = await runtime.runPromise(Effect.flatMap(Collection, (m) => m.get()));
    expect([colState.previews, colState.kept]).toEqual([false, 20]);

    // spec/app/notices/collection.md, "History older than its limit is forgotten"
    await later(alpha, CollectionGen.historyAge);
    await until(alpha, runtime, Collection, (c) => c.kept === 0);

    // spec/app/notices/collection.md, "The phone says when it locks, and a locked phone shows no rows"
    await drawn(() => runtime.runPromise(setPhoneLocked(true)));
    await until(alpha, runtime, Collection, (c) => c.locked && c.rows === 0 && c.own === 0);
    await drawn(() => runtime.runPromise(setPhoneLocked(false)));
    await until(alpha, runtime, Collection, (c) => !c.locked && c.rows === 25);

    await drawn(() => runtime.runPromise(clearAllShadeRows("Owner")));
    await until(alpha, runtime, Collection, (c) => c.rows === 0);

    await drawn(() => runtime.runPromise(showOwnNotices([{ id: 8, title: "Reminder", text: "Call dentist", at: 20 }], true)));
    await drawn(() => runtime.runPromise(dismissOwnRow(8, "Owner")));
    await until(alpha, runtime, Collection, (c) => c.own === 0);

    // spec/app/notices/collection.md, "Changing owner forgets everything collected, the consent, which is the new owner's to give, and the own rows of the owner before"
    await drawn(() => runtime.runPromise(switchCollectionOwner(2)));
    await until(alpha, runtime, Collection, (c) => c.owner === 2 && !c.on && c.kept === 0 && c.rows === 0);
  });

  // spec/app/notices/index.md, "Story: Open what I tapped"; spec/app/notices/index.md, "Story: Ask Alpha about a notice"; spec/app/notices/index.md, "Story: Change owner or restart with a tap in hand"
  it("Routes taps with single-use token spending and Ask Alpha excerpt review (spec/app/notices/index.md, \"Story: Open what I tapped\"; spec/app/notices/index.md, \"Story: Ask Alpha about a notice\"; spec/app/notices/index.md, \"Story: Change owner or restart with a tap in hand\")", async () => {
    const { alpha } = await open(scene(), noticesMounts());
    const runtime = noticesArea.runtime(alpha);

    // spec/app/notices/index.md, "A new tap for the owner signed in replaces the one waiting, and closes a question still under review"
    await runtime.runPromise(queueNotice({ id: 101, title: "Flight gate", body: "Gate B12", channel: "AssistantChannel", owner: 1 }));
    const first = await runtime.runPromise(tapNotice({ source: "Workflow", title: "Old run", appLabel: "Workflows", text: "", asks: false, reviewable: false, owner: 1 }));
    const second = await runtime.runPromise(tapNotice({ source: "Own", noticeId: 101, title: "Flight gate", appLabel: "Alpha", text: "Gate B12", asks: false, reviewable: true, owner: 1 }));
    expect(second).toBeGreaterThan(first);

    await runtime.runPromise(openWaitingTap());
    await until(alpha, runtime, Notices, (s) => s.waiting.token === 0 && s.opening === 0);
    const postingAfterSpend = await runtime.runPromise(Effect.flatMap(Posting, (m) => m.get()));
    expect(PostingGen.held(postingAfterSpend, 101).closed).toBe(true);
    const deskSnap1 = await runtime.runPromise(Effect.flatMap(NoticeDesk, (d) => Effect.sync(() => d.snapshot())));
    expect(deskSnap1.spentTokens).toEqual([second]);

    // spec/app/notices/index.md, "The owner closing the review gives the tap back: nothing is drafted, the notice can be tapped again, and the publisher is told once"
    await drawn(() => runtime.runPromise(askAboutShadeRow({
      id: "shade-1",
      appLabel: "Mail",
      title: "Contract draft",
      text: "Please sign by 5pm",
      at: 50,
      owned: true,
      secret: false,
      clearable: true,
    }, 1)));
    await until(alpha, runtime, Notices, (s) => s.review.showing);
    expect(document.body.textContent).toContain("Ask Alpha about this notice");
    expect(document.body.textContent).toContain("Contract draft");

    await drawn(() => runtime.runPromise(closeNoticeQuestion("Owner")));
    await until(alpha, runtime, Notices, (s) => !s.review.showing && s.waiting.token === 0);

    // spec/app/notices/index.md, "The notice can change while its question is under review, and the review then no longer counts until it is read again"
    const askToken = await runtime.runPromise(tapNotice({
      source: "Shade",
      title: "Delivery update",
      appLabel: "Packages",
      text: "Arriving today",
      asks: true,
      reviewable: true,
      owner: 1,
    }));
    await drawn(() => runtime.runPromise(askAboutWaitingTap()));
    await until(alpha, runtime, Notices, (s) => s.review.showing);
    await runtime.runPromise(markReviewedNoticeChanged());
    expect(await runtime.runPromise(confirmNoticeQuestion("Owner"))).toBe(false);
    await drawn(() => runtime.runPromise(askAboutWaitingTap()));
    await until(alpha, runtime, Notices, (s) => s.review.showing && s.review.shown === s.review.revision);

    // spec/app/notices/index.md, "The question is drafted only once its tap is spent, from the notice that was confirmed, for its owner still signed in; a spent tap that drafts nothing is reported, and one Android would not spend keeps its tap"
    await drawn(() => runtime.runPromise(confirmNoticeQuestion("Owner")));
    await until(alpha, runtime, Notices, (s) => s.spending.token === 0 && s.waiting.token === 0);
    const deskSnap2 = await runtime.runPromise(Effect.flatMap(NoticeDesk, (d) => Effect.sync(() => d.snapshot())));
    expect(deskSnap2.spentTokens).toEqual([second, askToken]);
    expect(deskSnap2.drafts).toHaveLength(1);
    expect(deskSnap2.drafts[0]?.prompt).toContain("Delivery update");

    // spec/app/notices/index.md, "Changing owner drops the tap waiting for someone else, puts down the tap in hand and closes the question"
    await runtime.runPromise(tapNotice({ source: "Workflow", title: "Owner 1 only", appLabel: "Workflows", text: "", asks: false, reviewable: false, owner: 1 }));
    await runtime.runPromise(switchNoticeOwner(2));
    await until(alpha, runtime, Notices, (s) => s.waiting.token === 0);
    await runtime.runPromise(restartNotices());
  });

  // spec/app/notices/deletions.md, "Story: Delete several things, each with its own Undo"; spec/app/notices/deletion.md, "Undo is offered at least ten seconds, and longer still when Android asks toasts to stay longer"; spec/app/notices/deletions.md, "Story: Change owner or restart with deletions pending"
  it("Handles concurrent deferred deletions with scale-adjusted Undo timing and restart recovery (spec/app/notices/deletions.md, \"Story: Delete several things, each with its own Undo\"; spec/app/notices/deletion.md, \"Undo is offered at least ten seconds, and longer still when Android asks toasts to stay longer\"; spec/app/notices/deletions.md, \"Story: Change owner or restart with deletions pending\")", async () => {
    const { alpha } = await open(scene(), noticesMounts());
    const runtime = noticesArea.runtime(alpha);

    await runtime.runPromise(switchDeletionsOwner(1));
    await runtime.runPromise(Effect.flatMap(Toasts, (t) => t.send({ type: "askScale" })));
    const toastState = await runtime.runPromise(Effect.flatMap(Toasts, (t) => t.get()));
    await runtime.runPromise(Effect.flatMap(Toasts, (t) => t.send({ type: "scaled", ticket: toastState.scaling.ticket, scale: 150, ok: true })));
    await until(alpha, runtime, Toasts, (t) => t.scale === 150);

    let n1 = 0;
    let n2 = 0;
    await drawn(async () => {
      n1 = await runtime.runPromise(queueDeletion({ itemId: 11, area: "calendar", title: "Standup" }));
      n2 = await runtime.runPromise(queueDeletion({ itemId: 12, area: "reminders", title: "Buy milk" }));
    });
    await until(alpha, runtime, Deletions, (d) =>
      DeletionsGen.held(d, n1).window.holding === "Held" && DeletionsGen.held(d, n2).window.holding === "Held",
    );

    // spec/app/notices/deletions.md, "An item is in hand in at most one deletion, and one that was deleted or cannot be told is never queued again"
    expect(await runtime.runPromise(queueDeletion({ itemId: 11, area: "calendar", title: "Standup duplicate" }))).toBe(0);

    expect(document.querySelector("[data-alpha-deletions-bar]")?.textContent).toContain("Standup");
    expect(document.querySelector("[data-alpha-deletions-bar]")?.textContent).toContain("Buy milk");

    // spec/app/notices/deletion.md, "Undo is offered at least ten seconds, and longer still when Android asks toasts to stay longer"
    await later(alpha, 10_000);
    const mid = await runtime.runPromise(Effect.flatMap(Deletions, (m) => m.get()));
    expect(DeletionsGen.held(mid, n2).window.holding).toBe("Held");

    await drawn(() => runtime.runPromise(undoDeletion(n1)));
    await until(alpha, runtime, Deletions, (d) => DeletionsGen.held(d, n1).window.holding === "Undone");

    await later(alpha, 6_000);
    await until(alpha, runtime, Deletions, (d) => DeletionsGen.held(d, n2).attempt.outcome === "Confirmed");
    const deskSnap = await runtime.runPromise(Effect.flatMap(DeletionDesk, (d) => Effect.sync(() => d.snapshot())));
    expect(deskSnap.restored).toEqual([n1]);
    expect(deskSnap.committed).toEqual([n2]);

    // spec/app/notices/deletions.md, "A restart marks every deletion it left unsettled to be picked up, and each is then picked up once: written again, paused, or read back"
    let n3 = 0;
    await drawn(async () => {
      n3 = await runtime.runPromise(queueDeletion({ itemId: 13, area: "notes", title: "Scratchpad" }));
    });
    await until(alpha, runtime, Deletions, (d) => DeletionsGen.held(d, n3).window.holding === "Held");
    await runtime.runPromise(markDeletionItemChanged(n3));
    await runtime.runPromise(restartDeletions());
    await until(alpha, runtime, Deletions, (d) => d.interrupted.includes(n3));
    await runtime.runPromise(recoverDeletions());
    await until(alpha, runtime, Deletions, (d) => d.interrupted.length === 0 && DeletionsGen.held(d, n3).paused);
  });

  // spec/app/notices/posting.md, "A channel in a group the owner blocked is off, and reminder, call and text channels are in no group"; spec/app/notices/posting.md, "A refused post is tried again once, under the same identity; refused again, it is not tried any more"; spec/app/notices/reminders.md, "Story: Have the agent set reminders"; spec/app/notices/reminders.md, "Story: Pick up reminders after a restart"
  it("Refuses blocked channel groups while keeping reminders ungrouped, enforces single retry, and coordinates notice reminders (spec/app/notices/posting.md, \"A channel in a group the owner blocked is off, and reminder, call and text channels are in no group\"; spec/app/notices/posting.md, \"A refused post is tried again once, under the same identity; refused again, it is not tried any more\"; spec/app/notices/reminders.md, \"Story: Have the agent set reminders\"; spec/app/notices/reminders.md, \"Story: Pick up reminders after a restart\")", async () => {
    const { alpha } = await open(scene(), noticesMounts());
    const runtime = noticesArea.runtime(alpha);

    expect(ALPHA_CHANNEL_GROUPS).toHaveLength(4);
    expect([
      canPostToChannel("AssistantChannel", { notifications: true, channelBlocked: false, groupBlocked: true }),
      canPostToChannel("WorkflowChannel", { notifications: true, channelBlocked: false, groupBlocked: true }),
      canPostToChannel("ReminderChannel", { notifications: true, channelBlocked: false, groupBlocked: true }),
      canPostToChannel("CallOrTextChannel", { notifications: true, channelBlocked: false, groupBlocked: true }),
      canPostToChannel("ReminderChannel", { notifications: true, channelBlocked: true, groupBlocked: false }),
    ]).toEqual([false, false, true, true, false]);

    await runtime.runPromise(queueNotice({ id: 201, title: "Digest ready", body: "Morning brief", channel: "MailOrBriefChannel", owner: 1 }));
    expect(await runtime.runPromise(deliverNotice(201, { notifications: true, channelBlocked: false, groupBlocked: true }, 1))).toBe(false);
    await until(alpha, runtime, Posting, (p) => PostingGen.held(p, 201).blocked);

    // spec/app/notices/posting.md, "A refused post is tried again once, under the same identity; refused again, it is not tried any more"
    await runtime.runPromise(Effect.flatMap(PostingDesk, (desk) => Effect.sync(() => {
      desk.setHooks({ post: () => Effect.succeed({ shown: false, known: true }) });
    })));
    await runtime.runPromise(deliverNotice(201, { notifications: true, channelBlocked: false, groupBlocked: false }, 1));
    await until(alpha, runtime, Posting, (p) => PostingGen.held(p, 201).attempt.outcome === "Refused" && !PostingGen.held(p, 201).retried);
    expect(await runtime.runPromise(retryNoticeDelivery(201))).toBe(true);
    await runtime.runPromise(deliverNotice(201, { notifications: true, channelBlocked: false, groupBlocked: false }, 1));
    await until(alpha, runtime, Posting, (p) => PostingGen.held(p, 201).attempt.outcome === "Refused" && PostingGen.held(p, 201).retried);
    expect(await runtime.runPromise(retryNoticeDelivery(201))).toBe(false);
    expect(await runtime.runPromise(acknowledgeNotice(201))).toBe(true);

    await runtime.runPromise(Effect.flatMap(PostingDesk, (desk) => Effect.sync(() => {
      desk.setHooks({ post: () => Effect.succeed({ shown: true, known: true }) });
    })));
    await runtime.runPromise(queueNotice({ id: 202, title: "Approval", body: "Ready", channel: "AssistantChannel", owner: 1 }));
    await runtime.runPromise(markNoticeSpent(202));
    expect(await runtime.runPromise(deliverNotice(202, { notifications: true, channelBlocked: false, groupBlocked: false }, 1))).toBe(false);
    await runtime.runPromise(concealNoticesForOwner(2));
    await runtime.runPromise(restartAndCheckPosting());

    // spec/app/notices/reminders.md, "The agent creates a reminder under a new number; while one is unconfirmed or not saved, another needs the owner's explicit choice, and past a few the agent is refused and the owner told until one is saved or discarded"
    await runtime.runPromise(readNoticeReminders());
    await until(alpha, runtime, NoticeReminders, (r) => !r.stale);

    expect(await runtime.runPromise(createNoticeReminder({ number: 1, title: "Take meds", at: 500, daily: true, approval: 1, signedIn: 1 }))).toBe(true);
    await until(alpha, runtime, NoticeReminders, (r) => NoticeRemindersGen.held(r, 1).status === "Scheduled");

    await later(alpha, 500);
    expect(await runtime.runPromise(ringNoticeReminder(1, 1, false))).toBe(false);
    expect(await runtime.runPromise(ringNoticeReminder(1, 1, true))).toBe(true);
    await until(alpha, runtime, NoticeReminders, (r) => NoticeRemindersGen.held(r, 1).status === "Posted");

    // spec/app/notices/reminder.md, "Android's answer settles the change: done, saved without its alert, refused with a reason, or lost; a lost answer, and a reopening, are read back once before they settle"
    expect(await runtime.runPromise(decideNoticeReminder({ number: 1, change: "Complete", seen: 1, fresh: 2, target: 0, signedIn: 1 }))).toBe(true);
    await until(alpha, runtime, NoticeReminders, (r) => NoticeRemindersGen.held(r, 1).status === "Scheduled" && NoticeRemindersGen.held(r, 1).at === 600);

    // spec/app/notices/reminders.md, "A restart marks every reminder to be picked up and the list out of date, and each reminder is then picked up once: read back if a change was sent, armed again if it has a time"
    await runtime.runPromise(restartAndRecoverNoticeReminders());
    await until(alpha, runtime, NoticeReminders, (r) => r.interrupted.length === 0);
    const remSnap = await runtime.runPromise(Effect.flatMap(NoticeRemindersDesk, (d) => Effect.sync(() => d.snapshot())));
    expect(remSnap.withdrawn).toEqual([1]);
    expect(remSnap.armed.some((a) => a.number === 1 && a.at === 600)).toBe(true);
  });
});
