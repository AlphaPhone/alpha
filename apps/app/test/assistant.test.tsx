// @vitest-environment happy-dom
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Chats } from "../gen/app__assistant__chats.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Locator } from "../gen/app__assistant__context.effect.vibe";
import { Machine as Reply } from "../gen/app__assistant__reply.effect.vibe";
import { Machine as Search } from "../gen/app__assistant__search.effect.vibe";
import * as Pages from "../gen/app__settings.effect.vibe";
import * as Prefs from "../gen/app__settings__preferences.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import type { Detent } from "../gen/app__shell.ts";
import type { Mount } from "../src/areas.ts";
import assistant from "../src/assistant/index.tsx";
import { MessagingBridge } from "../src/messaging/bridge.vibe";
import { untimed } from "../src/runtime/reactor.vibe";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, chatAction, closeAll, drawn, fill, hardware, later, open, press, seen, typeInto, underAct, until } from "./alpha.tsx";
import { draftKey } from "./fakes/ask.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/**
 * Ask Alpha in full at its place, and Settings with the Agent activity page, where the owner lists, restores and
 * starts conversations as in Alpha's Sunday v119 build (45f6bed30, settings-adapter.ts:1038-1043).
 */
const mounts: Mount[] = [
  { at: "assistant", load: () => import("../src/assistant/index.tsx") },
  { at: "view:Settings", load: () => import("../src/settings/index.tsx") },
  { at: "settings/activity", load: () => import("../src/assistant/settingsActivity.tsx") },
];

const lines = () => [...document.querySelectorAll("section[aria-label='Ask Alpha'] [role=log] article")].map((line) => line.querySelector("span:not([aria-hidden])")?.textContent);
const rows = (list: string) => document.querySelector(`section[aria-label='${list}'] > div`)?.children.length ?? 0;

/** Write `text` in the composer, as the owner types it. */
function write(text: string) {
  act(() => {
    const box = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
    if (!box) throw new Error("no composer");
    typeInto(box, text);
  });
}

/** Open the menu of the message that says `text` and choose `item`, as the owner does with the keyboard. */
function onMessage(text: string, item: string) {
  act(() => {
    const found = [...document.querySelectorAll("[role=log] article button[aria-haspopup=menu]")].find((one) => one.nextElementSibling?.textContent === text);
    if (!(found instanceof HTMLButtonElement)) throw new Error(`no message ${text}`);
    found.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  act(() => {
    const chosen = [...document.querySelectorAll("[role=menuitem]")].find((one) => one.textContent === item);
    if (!(chosen instanceof HTMLElement)) throw new Error(`no ${item} for ${text}`);
    chosen.click();
  });
}

/** The saved conversations Agent activity lists, by title. */
const restorable = () => [...document.querySelectorAll("button[aria-label^='Restore conversation: ']")].map((found) => found.getAttribute("aria-label")?.slice("Restore conversation: ".length));

/** Open Settings at About, then Agent activity, as the owner does. */
async function agentActivity(alpha: Alpha) {
  const shown = await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.get()));
  if (shown.trail.at(-1) !== "Settings") await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Settings" })));
  await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "openSection", page: "About" })));
  await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "open", page: "Activity" })));
  await until(alpha, alpha.runtime, Pages.Machine, (s) => s.page === "Activity");
  await drawn(() => vi.waitFor(() => expect(button(/^Load(ing)? conversations$/)).toBeDefined()));
}

/** Open the list of conversations: History on Agent activity in Settings. */
async function chatsList(alpha: Alpha) {
  await agentActivity(alpha);
  await press(/^Load(ing)? conversations$/);
}

/** Back, as the owner presses it, until Settings has closed, and Ask Alpha raised again to `detent`. */
async function leaveSettings(alpha: Alpha, detent: Detent) {
  const shell = () => alpha.runtime.runPromise(Effect.flatMap(Shell, (machine) => machine.get()));
  for (let presses = 0; presses < 5 && ((await shell()).trail.length > 0 || (await shell()).assistant !== "Bar"); presses++) await hardware("back");
  expect([(await shell()).trail, (await shell()).assistant]).toEqual([[], "Bar"]);
  if (detent !== "Bar") await alpha.runtime.runPromise(Effect.flatMap(Shell, (machine) => machine.send({ type: "raise", detent })));
  await until(alpha, alpha.runtime, Shell, (s) => s.assistant === detent);
}

/** Restore the saved conversation titled `title` from Agent activity, which raises Ask Alpha onto it. */
async function restore(title: string) {
  await drawn(() => vi.waitFor(() => expect(restorable()).toContain(title)));
  await press(`Restore conversation: ${title}`);
}

/** Click the row of the list named `list` whose text starts with `text`. */
function row(list: string, text: string) {
  act(() => {
    const found = [...document.querySelectorAll(`section[aria-label='${list}'] button`)].find((one) => one.textContent?.startsWith(text));
    if (!(found instanceof HTMLButtonElement)) throw new Error(`no row ${text} in ${list}`);
    found.click();
  });
}

/** Open Ask Alpha on `world`, waiting for its composer slot to open and optionally for the agent. */
async function openAssistant(world: ReturnType<typeof scene>, ready = true) {
  const { alpha } = await open(world, mounts);
  const runtime = assistant.runtime(alpha);
  await until(alpha, runtime, Composer, (s) => s.slot === "Open");
  if (ready) await until(alpha, runtime, Conversation, (s) => s.ready);
  return { alpha, runtime };
}

async function openAssistantWithPreferences(world: ReturnType<typeof scene>) {
  const opening = await openAssistant(world);
  await until(opening.alpha, opening.alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded");
  return opening;
}

/** The location carried on the observation of `metadata`, if any. */
function locationIn(metadata: unknown): { latitude?: number; longitude?: number; accuracyMeters?: number; capturedAt?: number } | undefined {
  return (metadata as { observation?: { location?: { latitude?: number; longitude?: number; accuracyMeters?: number; capturedAt?: number } } } | undefined)?.observation?.location;
}

function composerText() {
  return document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']")?.value;
}

function webStorageContains(text: string) {
  return [localStorage, sessionStorage].some((store) =>
    Array.from({ length: store.length }, (_, index) => store.key(index))
      .some((key) => key !== null && (key.includes(text) || store.getItem(key)?.includes(text))));
}

it("Keeps my phone draft through restart and leaves it with my account (spec/app/assistant/composer.md, \"Story: Keep what I am writing\")", async () => {
  const world = { ...scene(), phone: true };
  const firstOwner = world.notes.ownerIdentity;
  world.ask.kept.set("c1", { roomId: "r1", title: "Shared fixture ID", messages: [] });

  const selectConversation = async (alpha: Awaited<ReturnType<typeof open>>["alpha"], runtime: ReturnType<typeof assistant.runtime>) => {
    await chatsList(alpha);
    await until(alpha, runtime, Chats, (state) => state.list.status === "Loaded");
    await restore("Shared fixture ID");
    await until(alpha, runtime, Composer, (state) => state.binding.conversation > 0 && state.slot === "Open");
  };

  const first = await open(world, mounts);
  const firstRuntime = assistant.runtime(first.alpha);
  await until(first.alpha, firstRuntime, Conversation, (state) => state.ready);
  await selectConversation(first.alpha, firstRuntime);
  const original = "First owner's unsent phone draft";
  const firstKey = draftKey(firstOwner, world.notes.owner, "c1", "r1");
  write(original);
  await until(first.alpha, firstRuntime, Composer, (state) => state.draft.sync === "Kept" && state.editor.text);
  expect(JSON.parse(world.ask.drafts.get(firstKey) ?? "{}")).toMatchObject({ text: original, sending: false });
  expect(webStorageContains(original)).toBe(false);
  await first.close();

  const second = await open(world, mounts);
  const runtime = assistant.runtime(second.alpha);
  await until(second.alpha, runtime, Conversation, (state) => state.ready);
  await until(second.alpha, runtime, Composer, (state) => state.binding.conversation > 0 && state.slot === "Open" && state.editor.text);
  expect(composerText()).toBe(original);

  const initialSeat = await runtime.runPromise(Composer.use((machine) => Effect.map(machine.get(), (state) => state.binding.owner)));
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  world.ask.beforeDraftExchange = () => {
    entered.resolve();
    return release.promise;
  };
  const stale = "A late save from the first account";
  try {
    write(stale);
    await entered.promise;
    world.notes.ownerIdentity = "second-draft-owner";
    await seen(false);
    await seen(true);
    await until(second.alpha, runtime, Composer, (state) => state.binding.owner > initialSeat && state.slot === "Open");
    expect(composerText()).toBe("");
  } finally {
    delete world.ask.beforeDraftExchange;
    await drawn(() => release.resolve());
  }

  await vi.waitFor(() => expect(world.ask.refusedDraftExchanges).toBe(1));
  await selectConversation(second.alpha, runtime);
  expect(composerText()).toBe("");
  expect(JSON.parse(world.ask.drafts.get(firstKey) ?? "{}")).toMatchObject({ text: original, sending: false });
  expect(webStorageContains(stale)).toBe(false);

  const next = "Second owner's unsent phone draft";
  const secondKey = draftKey(world.notes.ownerIdentity, world.notes.owner, "c1", "r1");
  write(next);
  await until(second.alpha, runtime, Composer, (state) => state.draft.sync === "Kept" && state.editor.text);
  expect(JSON.parse(world.ask.drafts.get(secondKey) ?? "{}")).toMatchObject({ text: next, sending: false });
  expect(webStorageContains(next)).toBe(false);
  expect(world.ask.said).toEqual([]);
});

/** Wait, on the runtime of `alpha`, until `check` holds. */
async function settled(alpha: Awaited<ReturnType<typeof open>>["alpha"], check: () => boolean, detail: () => unknown) {
  for (let turn = 0; turn < 2_000 && !check(); turn += 1) await drawn(() => alpha.runtime.runPromise(Effect.yieldNow));
  if (!check()) throw new Error(`did not settle: ${JSON.stringify(detail())}`);
}

describe.each([["a browser", false], ["a phone", true]])("in %s", (_where, phone) => {
  // spec/app/assistant/index.md, "Story: Ask Alpha something"; spec/app/assistant/composer.md, "Story: Send what I wrote"; spec/app/assistant/chats.md, "Story: Start a conversation, or fork one"
  it("Ask Alpha something, in a conversation made for it (spec/app/assistant/index.md, \"Story: Ask Alpha something\")", async () => {
    const world = { ...scene(), phone };
    // spec/app/assistant/composer.md, "The slot is opened when the composer is shown, and opened again after it could not be read"
    const { alpha, runtime } = await openAssistantWithPreferences(world);

    // spec/app/assistant/composer.md, "A message written before its conversation existed moves into the new one, then its old slot is cleared on the exact revision read"
    world.ask.metadata = [];
    const draftSlot = (conversation?: string, room?: string) => {
      const key = draftKey(world.notes.ownerIdentity, world.notes.owner, conversation, room);
      return phone ? world.ask.drafts.get(key) ?? null : localStorage.getItem(`alpha/assistant/slot-v2/${encodeURIComponent(key)}`);
    };
    write("Hello ");
    await press("Send");
    // spec/app/assistant/index.md, "A reply completes, streamed or all at once, even after the owner asked to stop it"
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    // spec/app/assistant/reply.md, "The settled reply is the whole final answer, shown and spoken, never the acknowledgment"
    await until(alpha, runtime, Reply, (s) => s.status === "Settled" && s.final === "You said: Hello".length);
    // spec/app/assistant/index.md, "The agent is told the view, the time zone, the day only from Calendar, and whether something is selected"
    expect(world.ask.metadata).toMatchObject([{ observation: { view: "home", sensitive: false } }]);
    // spec/app/browser/reading.md, "Only the committed page of a normal tab in front, while Browser is the open screen and Browser page for Alpha is on, is ever handed over": a turn asked on Home takes no page.
    expect(world.ask.metadata[0]).not.toHaveProperty("browserPage");
    // spec/app/assistant/context.md, "The locator holds whether the owner allows it, the time last told, the last GPS fix and the last network answer, each read once under its ticket, and when each may be read again": a cold turn never waits for a fix, and starts one read behind it.
    expect(locationIn(world.ask.metadata[0])).toBe(undefined);
    if (phone) await until(alpha, runtime, Locator, (s) => s.gpsAt >= 0);
    await until(alpha, runtime, Composer, (s) => s.away === "Free" && s.clear.outcome === "Confirmed" && s.draft.sync === "Kept");
    expect([lines(), world.ask.said, world.ask.opened]).toEqual([["Hello", "You said: Hello"], ["Hello"], 1]);
    expect(draftSlot()).toBe(null);
    expect(JSON.parse(draftSlot("c1", "r1") ?? "{}")).toMatchObject({ text: "", sending: false });

    // spec/app/assistant/composer.md, "Story: Keep what I am writing": a draft is kept in its conversation's slot.
    write("Not yet");
    await until(alpha, runtime, Composer, (s) => s.draft.sync === "Kept" && s.editor.text);
    expect(JSON.parse(draftSlot("c1", "r1") ?? "{}")).toMatchObject({ text: "Not yet", sending: false });
    // spec/app/assistant/composer.md, "A message longer than a message may hold is kept as a draft and never sent"
    write("x".repeat(64_001));
    await until(alpha, runtime, Composer, (s) => s.long);
    expect(button("Send")?.disabled).toBe(true);
    // spec/app/assistant/reply.md, "One brief acknowledgment at most, only from the agent's acknowledgment frame, before any tool runs"
    world.ask.acknowledgment = "Let me look";
    write("Again");
    await until(alpha, runtime, Composer, (s) => !s.long && s.draft.sync === "Kept");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 2 && s.turn.reply === "Complete");
    await until(alpha, runtime, Reply, (s) => s.turn === 2 && s.status === "Settled");
    await until(alpha, runtime, Composer, (s) => s.hold === 2 && !s.held.text && s.draft.sync === "Kept");
    const said = await runtime.runPromise(Effect.flatMap(Reply, (machine) => machine.get()));
    expect([said.acks, said.ackUnits, said.final]).toEqual([1, "Let me look".length, "You said: Again".length]);
    expect(lines()).toEqual(["Hello", "You said: Hello", "Again", "You said: Again"]);

    // spec/app/assistant/chats.md, "A fork is asked for from a message of the conversation showing"
    onMessage("Hello", "New chat from here");
    await until(alpha, runtime, Chats, (s) => s.origin === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello"]);
    // spec/app/assistant/chats.md, "Back to the original leaves the fork for the conversation it came from"
    await press("Original chat");
    await until(alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello", "You said: Hello", "Again", "You said: Again"]);

    // spec/app/assistant/chats.md, "The newest list says which conversations there are, and a conversation no longer listed stops showing"
    const raised = (await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.get()))).assistant;
    await chatsList(alpha);
    await until(alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    await drawn(() => vi.waitFor(() => expect(restorable()).toHaveLength(2)));
    await leaveSettings(alpha, raised);

    // spec/app/assistant/index.md, "A sensitive screen is never sent, and no reply is awaited over one": Settings showing carrier identifiers is a sensitive screen (on a phone).
    if (phone) {
      await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Settings" })));
      await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "open", page: "General" })));
      await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "open", page: "CarrierPage" })));
      await until(alpha, runtime, Conversation, (s) => s.context.sensitive && s.context.showing.tag === "App");
      await press("Type");
      await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Typing");
      await fill("Message Alpha", "my password is hunter2");
      expect([button("Send")?.disabled, world.ask.said.length]).toEqual([true, 2]);
      // spec/app/assistant/index.md, "A sensitive screen says only that it is sensitive: no selection and no day"
      await alpha.runtime.runPromise(Effect.flatMap(Pages.Machine, (pages) => pages.send({ type: "goBack" })));
      await until(alpha, runtime, Conversation, (s) => !s.context.sensitive);
      // General, drawn again, focuses the row the owner left, which ends typing; the draft stays for the next Type.
      await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Bar");
      await press("Type");
      await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Typing");
      expect([button("Send")?.disabled, composerText()]).toEqual([false, "my password is hunter2"]);
      await hardware("home");
      await until(alpha, runtime, Conversation, (s) => s.context.showing.tag === "Home");
      await press("Open conversation");
      await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Sheet");
    }

    // spec/app/assistant/reply.md, "Out of funds is refused before any output, is never spoken, and offers only Manage plan"
    world.ask.refusal = { failureKind: "insufficient_credits", cloudCode: "allowance_exhausted", planAction: "funding" };
    write("Hi");
    await press("Send");
    await until(alpha, runtime, Reply, (s) => s.turn === 3 && s.status === "Interrupted");
    expect([(document.querySelector("section[aria-label='Ask Alpha'] [role=log]")?.textContent ?? "").includes("You’re out of plan allowance and credits, so I couldn’t reply."), Boolean(button("Manage plan"))]).toEqual([true, true]);
    world.ask.refusal = undefined;

    // spec/app/assistant/chats.md, "Older or newer messages are read around a message of the conversation showing": with no Earlier, read around the first message directly.
    expect(button("Earlier")).toBeUndefined();
    await runtime.runPromise(Effect.flatMap(Chats, (chats) => chats.send({ type: "scroll", around: 1 })));
    await until(alpha, runtime, Chats, (s) => s.around > 0 && s.page.status === "Loaded");
    expect(lines().slice(0, 2)).toEqual(["Hello", "You said: Hello"]);
    // spec/app/assistant/reply.md, "Out of funds is refused before any output, is never spoken, and offers only Manage plan": read again from history, the refused reply is the same one line, never "Out of credits".
    const reopened = document.querySelector("[role=log] [data-alpha-message-id='m3a']");
    const fundingLine = "You’re out of plan allowance and credits, so I couldn’t reply.";
    const refusedRows = [...document.querySelectorAll("[role=log] article")].filter((line) => line.textContent?.includes(fundingLine));
    const managePlan = [...(reopened?.querySelectorAll("button") ?? [])].some((control) => control.textContent === "Manage plan");
    expect([reopened?.textContent?.includes(fundingLine), managePlan, refusedRows.length]).toEqual([true, true, 1]);

    // spec/app/assistant/composer.md, "A quoted message goes with the next send, until the owner removes the quote"
    onMessage("You said: Hello", "Reply");
    await until(alpha, runtime, Composer, (s) => s.editor.quote === 2);
    write("Why?");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 4 && s.turn.reply === "Complete");
    expect([world.ask.metadata?.at(-1), world.ask.said.at(-1)]).toEqual([expect.objectContaining({ replyToMessageId: "m1a" }), "Why?"]);
    // spec/app/assistant/context.md, "A turn carries the location only while the owner allows it, from a screen that is not sensitive, to a peer that declares it, and only a GPS fix at most thirty minutes old or a network answer that still stands": the phone's last fix, read behind an earlier turn, goes with this one.
    const carried = locationIn(world.ask.metadata?.at(-1));
    expect(phone ? { latitude: carried?.latitude, longitude: carried?.longitude, accuracyMeters: carried?.accuracyMeters, timed: typeof carried?.capturedAt === "number" } : carried)
      .toEqual(phone ? { latitude: 43.73, longitude: 7.42, accuracyMeters: 8, timed: true } : undefined);

    if (phone) {
      // spec/app/assistant/context.md, "Turning Location for Alpha off, or Android taking the permission away, forgets every fix and answer, and leaves what was being read behind"
      await alpha.runtime.runPromise(Effect.flatMap(Prefs.Machine, (prefs) => prefs.send({ type: "setShare", share: "AgentLocation", on: false, at: untimed }, "Owner")));
      await until(alpha, alpha.runtime, Prefs.Machine, (s) => !Prefs.allows(s, "AgentLocation"));
      await until(alpha, runtime, Locator, (s) => !s.enabled && s.gpsAt === -1);
      write("Where am I?");
      await press("Send");
      await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 5 && s.turn.reply === "Complete");
      expect(locationIn(world.ask.metadata?.at(-1))).toBe(undefined);

      // spec/app/assistant/context.md, "A turn carries the location only while the owner allows it, from a screen that is not sensitive, to a peer that declares it, and only a GPS fix at most thirty minutes old or a network answer that still stands": a fix older than thirty minutes is never sent.
      await alpha.runtime.runPromise(Effect.flatMap(Prefs.Machine, (prefs) => prefs.send({ type: "setShare", share: "AgentLocation", on: true, at: untimed }, "Owner")));
      await until(alpha, alpha.runtime, Prefs.Machine, (s) => Prefs.allows(s, "AgentLocation"));
      await until(alpha, runtime, Locator, (s) => s.enabled);
      write("Refresh");
      await press("Send");
      await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 6 && s.turn.reply === "Complete");
      await until(alpha, runtime, Locator, (s) => s.gpsAt >= 0);
      world.maps.here = undefined;
      await later(alpha, 1_800_001);
      write("Too old");
      await press("Send");
      await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 7 && s.turn.reply === "Complete");
      expect(locationIn(world.ask.metadata?.at(-1))).toBe(undefined);
    }

    // spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code": a tool call written out as text is hidden from Alpha's words, never from the owner's.
    const written = "Open Maps <tool_call>\n<function=phone_use() {}</function>\n</tool_call>";
    write(written);
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.send.id === (phone ? 8 : 5) && s.turn.reply === "Complete");
    expect(lines().slice(-2)).toEqual([written, "You said: Open Maps"]);
    // spec/app/assistant/reply.md, "Prose is drawn with its Markdown: bold, italics, code, headings, lists and quotes; a link is a link only to an https address, and HTML reads as text"
    const marked = "**Limes** tonight?\n> Ask [Ana](https://ana.example/) <b>now</b>\n- [one](javascript:alert(1))";
    write(marked);
    await press("Send");
    await until(alpha, runtime, Reply, (s) => s.status === "Settled" && s.final === `You said: ${marked}`.length);
    await vi.waitFor(() => expect([...document.querySelectorAll("[role=log] article")].at(-1)?.querySelector("strong")).toBeTruthy());
    const reply = [...document.querySelectorAll("[role=log] article")].at(-1);
    expect([reply?.querySelector("strong")?.textContent, reply?.querySelector("blockquote a")?.getAttribute("href"), reply?.querySelectorAll("a").length, reply?.querySelector("b"), reply?.querySelector("li")?.textContent, lines().at(-1)])
      .toEqual(["Limes", "https://ana.example/", 1, null, "one", "You said: Limes tonight?Ask Ana <b>now</b>one"]);
    // spec/app/assistant/reply.md, "Prose is drawn with its Markdown: bold, italics, code, headings, lists and quotes; a link is a link only to an https address, and HTML reads as text": Enter on the link is the link's own, and the message's press still opens its actions.
    const link = reply?.querySelector("a");
    act(() => { link?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect([link?.closest("button"), document.querySelector("[role=menu]")]).toEqual([null, null]);
    const messagePress = reply?.querySelector<HTMLButtonElement>("button[aria-haspopup=menu]");
    expect([messagePress?.getAttribute("aria-label"), messagePress?.textContent, messagePress?.hasAttribute("aria-labelledby"), messagePress?.nextElementSibling?.textContent]).toEqual(["Message actions", "", false, "You said: Limes tonight?Ask Ana <b>now</b>one"]);
    act(() => { messagePress?.click(); });
    expect(document.querySelector("[role=menu]")?.getAttribute("aria-label")).toBe("Message actions");
    act(() => { reply?.querySelector<HTMLButtonElement>("button[aria-haspopup=menu]")?.click(); });
    // spec/app/assistant/reply.md, "Copy, quote, read aloud, use in email and Talk take the reply's plain words, without its marks"
    if (phone) {
      await vi.waitFor(() => onMessage("You said: Limes tonight?Ask Ana <b>now</b>one", "Copy"));
      await vi.waitFor(() => expect(world.settings.copied.at(-1)).toBe("You said: Limes tonight?\n\nAsk Ana (https://ana.example/) <b>now</b>\n\n• one"));
    }

    // spec/app/assistant/reply.md, "The agent's turn tag is never drawn, copied, quoted, emailed or spoken, and a reply still being written holds back what may become one": the owner's own words keep it, and a link's words stay.
    const tagged = [[["Sure.\n[answer] Paris"], "Sure.Paris", "Sure.\nParis"], [["Paris. [answer]"], "Paris.", "Paris."], [["<promise> One sec."], "One sec.", "One sec."], [["[ans", "wer] Paris"], "Paris", "Paris"], [["[answer", "](https://example.com)"], "answer", "answer (https://example.com/)"]] as const;
    for (const [said, drawn, plain] of tagged) {
      const { turn } = await runtime.runPromise(Effect.flatMap(Conversation, (machine) => machine.get()));
      world.ask.nextReplyChunks = said;
      write("Capital of France? [answer]");
      await press("Send");
      await until(alpha, runtime, Conversation, (s) => s.turn.send.id === turn.send.id + 1 && s.turn.reply === "Complete");
      await until(alpha, runtime, Reply, (s) => s.status === "Settled");
      await vi.waitFor(() => expect(lines().slice(-2)).toEqual(["Capital of France? [answer]", drawn]));
      if (phone) {
        await vi.waitFor(() => onMessage(drawn, "Copy"));
        await vi.waitFor(() => expect(world.settings.copied.at(-1)).toBe(plain));
      }
    }
  });

  // spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/chats.md, "Story: Open a message that search found"
  it("Hear a brief acknowledgment and still get the whole answer: the acknowledgment stays the label while tools run (spec/app/assistant/reply.md, \"Story: Hear a brief acknowledgment and still get the whole answer\")", async () => {
    const world = { ...scene(), phone };
    const { alpha, runtime } = await openAssistantWithPreferences(world);
    // spec/app/assistant/reply.md, "The planning label shows until the first text, and provisional text is shown but never spoken": once taken, the acknowledgment stays the label through a later tool label and status, until text arrives.
    world.ask.acknowledgment = "Let me look";
    world.ask.holdAfterTools = true;
    write("What's on today?");
    await until(alpha, runtime, Composer, (s) => s.draft.sync === "Kept");
    await press("Send");
    await vi.waitFor(() => expect(world.ask.turns.size).toBe(1));
    await vi.waitFor(() => expect(document.body.textContent).toContain("Let me look"));
    expect([document.body.textContent?.includes("Using Calendar"), document.body.textContent?.includes("Working")]).toEqual([false, false]);
    await drawn(() => { for (const release of [...world.ask.turns.values()]) release(); });
    await until(alpha, runtime, Reply, (s) => s.status === "Settled" && s.final === "You said: What's on today?".length);
    const said = await runtime.runPromise(Effect.flatMap(Reply, (machine) => machine.get()));
    expect([said.acks, lines()]).toEqual([1, ["What's on today?", "You said: What's on today?"]]);
    expect(document.body.textContent?.includes("Let me look")).toBe(false);
  });

  // spec/app/assistant/index.md, "Alpha asks the agent to warm up at launch, on return to the foreground, after a sign-in and when Ask Alpha is raised from its bar, only while the agent can answer, and shows nothing of it"
  it("Warm the agent before my first message: at launch, on return, after a sign-in and when Ask Alpha is raised, never while it cannot answer, and without a word (spec/app/assistant/index.md, \"Alpha asks the agent to warm up at launch, on return to the foreground, after a sign-in and when Ask Alpha is raised from its bar, only while the agent can answer, and shows nothing of it\")", async () => {
    const world = { ...scene(), phone };
    const { alpha, runtime } = await openAssistant(world);
    const asked = () => world.ask.warmUps.length;
    await settled(alpha, () => asked() === 1, asked);
    await seen(false);
    await seen(true);
    await settled(alpha, () => asked() === 2, asked);
    await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "raise", detent: "Sheet" })));
    await settled(alpha, () => asked() === 3, asked);
    await alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "raise", detent: "Full" })));
    // Only the phone's sign-in settles; Talk warming speech for the new account asks the agent for nothing more.
    const signedIn = phone ? 1 : 0;
    await drawn(() => world.voice.signedInHere?.());
    await settled(alpha, () => asked() === 3 + signedIn, asked);
    world.ask.warmUpFails = true;
    await seen(false);
    await seen(true);
    await settled(alpha, () => asked() === 4 + signedIn, asked);
    world.ask.canRespond = false;
    const reads = world.ask.statusReads;
    await seen(false);
    await seen(true);
    await settled(alpha, () => world.ask.statusReads > reads, () => world.ask.statusReads);
    await later(alpha, 10);
    expect([asked(), world.ask.opened, world.ask.said, lines(), document.body.textContent?.toLowerCase().includes("warm"), new Set(world.ask.warmUps.map((headers) => JSON.stringify(headers))).size]).toEqual([4 + signedIn, 0, [], [], false, 1]);
    world.ask.canRespond = true;
    write("Hello");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    expect([lines(), world.ask.said]).toEqual([["Hello", "You said: Hello"], ["Hello"]]);
  });

  it("Search my conversations, and open a hit where it was said (spec/app/assistant/search.md, \"Story: Search my conversations\")", async () => {
    const world = { ...scene(), phone };
    world.ask.kept.set("c7", { roomId: "r7", title: "Lunch", messages: [
      { id: "m1", role: "user", text: "Lunch on Friday?" },
      { id: "m2", role: "assistant", text: "Friday at noon works." },
      { id: "m3", role: "assistant", text: "", failureKind: "limit_reached" },
      { id: "m4", role: "assistant", text: "", failureKind: "insufficient_credits" },
      { id: "m5", role: "assistant", text: "", failureKind: "insufficient_credits", cloudCode: "allowance_exhausted" },
      { id: "m6", role: "assistant", text: "<promise> Friday is free." },
      { id: "m7", role: "user", text: "Friday [answer] again?" },
    ] });
    const { alpha, runtime } = await openAssistant(world, false);

    await press("Open conversation");
    await until(alpha, runtime, Shell, (s) => s.assistant === "Sheet");

    // spec/app/assistant/search.md, "Story: Search my conversations": a hit returns to the full conversation.
    const openSearch = async () => {
      chatAction("Search chat");
      await drawn(() => vi.waitFor(() => expect(document.querySelector("input[aria-label='Search chats']")).not.toBeNull()));
    };
    await openSearch();
    await fill("Search chats", "friday");
    await until(alpha, runtime, Search, (s) => s.hits.status === "Loaded" && s.words === "friday");
    expect(rows("Results")).toBe(4);
    // spec/app/assistant/reply.md, "The agent's turn tag is never drawn, copied, quoted, emailed or spoken, and a reply still being written holds back what may become one": a hit of the agent's loses the tag, the owner's keeps it.
    const results = document.querySelector("section[aria-label='Results']")?.textContent ?? "";
    expect([results.includes("Friday is free."), results.includes("<promise>"), results.includes("Friday [answer] again?")]).toEqual([true, false, true]);
    // spec/app/assistant/search.md, "Opening a hit closes search and opens its conversation around its message, and another conversation only while the turn and the composer are free"
    row("Results", "Friday at noon");
    await until(alpha, runtime, Chats, (s) => s.chosen > 0 && s.around > 0 && s.page.status === "Loaded");
    const askDetent = () => document.querySelector("section[aria-label='Ask Alpha']")?.getAttribute("data-alpha-detent");
    expect([lines().slice(0, 2), document.querySelector("section[aria-label='Results']"), askDetent()]).toEqual([["Lunch on Friday?", "Friday at noon works."], null, "full"]);
    // spec/app/assistant/reply.md, "A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again": a reply read again from history says why it did not finish, and to wait a moment.
    expect(document.querySelector("[role=log]")?.textContent).toContain("Too many requests. Wait a moment, then try again");
    // spec/app/assistant/reply.md, "Out of funds is refused before any output, is never spoken, and offers only Manage plan"; spec/app/assistant/reply.md, "A failure refused before any output replaces the streamed text; any other failure is added after it": spent credits stored without Cloud's code keep their own words, and only the reply stored with it reads as the one out-of-funds line.
    const kept = [...document.querySelectorAll("[role=log] article")].map((line) => line.textContent ?? "");
    expect([kept.filter((text) => text.includes("Out of credits")).length, kept.filter((text) => text.includes("You’re out of plan allowance and credits, so I couldn’t reply.")).length]).toEqual([1, 1]);

    // spec/app/assistant/search.md, "Only the newest asking's hits are shown, a page at a time, after those already shown": a search that fails says so.
    world.ask.searchDown = true;
    await openSearch();
    await fill("Search chats", "noon");
    await until(alpha, runtime, Search, (s) => s.hits.status === "Failed");
    expect(document.body.textContent).toContain("Search did not finish");
    // spec/app/assistant/index.md, "Back closes a review, then search, then a quote or an edit, one at a time; with none of them open Back is the shell's"
    await hardware("back");
    await until(alpha, runtime, Search, (s) => !s.open);
    expect(askDetent()).toBe("full");
  });

  // spec/app/assistant/chats.md, "Story: Find my conversations"
  it("Find the conversation I was in after a restart, or the agent's newest, or a new chat once it has none (spec/app/assistant/chats.md, \"Story: Find my conversations\")", async () => {
    const world = { ...scene(), phone };
    const first = await open(world, mounts);
    let runtime = assistant.runtime(first.alpha);
    await until(first.alpha, runtime, Composer, (s) => s.slot === "Open");
    await until(first.alpha, runtime, Conversation, (s) => s.ready);
    write("Hello before restart");
    await press("Send");
    await until(first.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    await until(first.alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    await first.close();

    // spec/app/assistant/chats.md, "The conversation showing, and the one a fork came from, are remembered through a restart and read again": a read that fails offers Try again.
    world.ask.pagesDown = true;
    const second = await open(world, mounts);
    runtime = assistant.runtime(second.alpha);
    await until(second.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Failed");
    expect(document.body.textContent).toContain("Messages did not load");
    world.ask.pagesDown = false;
    await press("Try again");
    await until(second.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    expect(lines()).toEqual(["Hello before restart", "You said: Hello before restart"]);
    await second.close();

    // spec/app/assistant/chats.md, "A read of the latest messages answered 404 asks the agent's list whether the conversation is still there": a conversation the agent still lists is a read that failed, read once and never again by itself.
    world.ask.pagesMissing = true;
    world.ask.pageReads = 0;
    world.ask.listReads = 0;
    const listedYetMissing = await open(world, mounts);
    runtime = assistant.runtime(listedYetMissing.alpha);
    await until(listedYetMissing.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Failed");
    await until(listedYetMissing.alpha, runtime, Conversation, (s) => s.ready);
    expect([document.body.textContent?.includes("Messages did not load"), world.ask.pageReads, world.ask.listReads]).toEqual([true, 1, 1]);
    world.ask.pagesMissing = false;
    await press("Try again");
    await until(listedYetMissing.alpha, runtime, Chats, (s) => s.chosen === 1 && s.page.status === "Loaded");
    expect([lines(), world.ask.pageReads]).toEqual([["Hello before restart", "You said: Hello before restart"], 2]);
    await listedYetMissing.close();

    // spec/app/assistant/chats.md, "A conversation the list no longer has is forgotten, and the first it lists, the most recently used, shows in its place, or a new chat when there is none"
    world.ask.kept.clear();
    world.ask.kept.set("c8", { roomId: "r8", title: "Dinner", messages: [{ id: "m8", role: "user", text: "Dinner at eight?" }] });
    world.ask.kept.set("c7", { roomId: "r7", title: "Lunch", messages: [{ id: "m7", role: "user", text: "Lunch on Friday?" }] });
    const third = await open(world, mounts);
    runtime = assistant.runtime(third.alpha);
    await until(third.alpha, runtime, Chats, (s) => s.chosen > 1 && s.ids.length === 2 && s.page.status === "Loaded");
    expect([document.body.textContent?.includes("Messages did not load"), button("Try again"), lines()]).toEqual([false, undefined, ["Dinner at eight?"]]);

    // spec/app/assistant/chats.md, "The list of conversations is read whenever it is shown": Back from Agent activity keeps the current conversation and draft.
    write("Ideas for dinner");
    await until(third.alpha, runtime, Composer, (s) => s.editor.text && s.draft.sync === "Kept");
    const chosen = (await runtime.runPromise(Effect.flatMap(Chats, (machine) => machine.get()))).chosen;
    const detent = (await third.alpha.runtime.runPromise(Effect.flatMap(Shell, (machine) => machine.get()))).assistant;
    await chatsList(third.alpha);
    await until(third.alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    await drawn(() => vi.waitFor(() => expect(restorable()).toEqual(["Dinner", "Lunch"])));
    await hardware("back");
    await until(third.alpha, third.alpha.runtime, Pages.Machine, (s) => s.page === "About");
    const kept = await runtime.runPromise(Effect.flatMap(Chats, (machine) => machine.get()));
    expect([kept.chosen, composerText(), lines()]).toEqual([chosen, "Ideas for dinner", ["Dinner at eight?"]]);
    write("");
    await leaveSettings(third.alpha, detent);
    await third.close();

    // spec/app/assistant/chats.md, "Older or newer messages are read around a message of the conversation showing"
    world.ask.kept.set("c8", { roomId: "r8", title: "Dinner", messages: Array.from({ length: 205 }, (_, at) => ({
      id: `history-${at + 1}`, role: "user", text: `History ${at + 1}`,
    })) });
    const long = await open(world, mounts);
    runtime = assistant.runtime(long.alpha);
    await until(long.alpha, runtime, Chats, (s) => s.page.status === "Loaded");
    await press("Open conversation");
    await until(long.alpha, runtime, Shell, (s) => s.assistant === "Sheet");
    expect([lines().length, lines()[0], lines().at(-1), button("Later")]).toEqual([200, "History 6", "History 205", undefined]);
    await until(long.alpha, runtime, Composer, (s) => s.slot === "Open");
    onMessage("History 205", "Reply");
    await until(long.alpha, runtime, Composer, (s) => s.editor.quote > 0);
    const currentPage = () => runtime.runSync(Effect.flatMap(Chats, (machine) => machine.get())).page.ticket;
    for (let visit = 0; visit < 3; visit++) {
      const laterPage = currentPage();
      await press("Earlier");
      await until(long.alpha, runtime, Chats, (s) => s.page.status === "Loaded" && s.page.ticket > laterPage);
      expect([lines()[0], lines().at(-1), button("Earlier")]).toEqual(["History 1", "History 106", undefined]);
      expect(button("Remove quote")?.parentElement?.textContent).toContain("History 205");

      const earlierPage = currentPage();
      await press("Later");
      await until(long.alpha, runtime, Chats, (s) => s.page.status === "Loaded" && s.page.ticket > earlierPage);
      expect([lines()[0], lines().at(-1), Boolean(button("Earlier")), button("Later")]).toEqual(["History 6", "History 205", true, undefined]);
    }
    const laterPage = currentPage();
    await press("Earlier");
    await until(long.alpha, runtime, Chats, (s) => s.page.status === "Loaded" && s.page.ticket > laterPage);
    world.ask.metadata = [];
    write("Reply to a message outside this window");
    await press("Send");
    await until(long.alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    expect(world.ask.metadata?.at(-1)).toMatchObject({ replyToMessageId: "history-205" });
    await long.close();

    world.ask.kept.clear();
    const fourth = await open(world, mounts);
    runtime = assistant.runtime(fourth.alpha);
    await until(fourth.alpha, runtime, Chats, (s) => s.chosen === 0 && s.ids.length === 0 && s.page.status === "Idle");
    await until(fourth.alpha, runtime, Composer, (s) => s.binding.conversation === 0 && s.slot === "Open");
    await until(fourth.alpha, runtime, Conversation, (s) => s.ready);
    expect([document.body.textContent?.includes("Messages did not load"), button("Try again"), lines()]).toEqual([false, undefined, []]);
    write("Hello after restart");
    await press("Send");
    await until(fourth.alpha, runtime, Chats, (s) => s.chosen > 0 && s.page.status === "Loaded");
    await until(fourth.alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    expect([lines(), world.ask.said.at(-1), world.ask.opened]).toEqual([["Hello after restart", "You said: Hello after restart"], "Hello after restart", 2]);
    await fourth.close();

    // spec/app/assistant/chats.md, "The newest list says which conversations there are, and a conversation no longer listed stops showing"; spec/app/assistant/chats.md, "A new chat holds no conversation's page": a list without the conversation that lands while its 404 is being checked leaves its page behind, and the new chat settles.
    world.ask.kept.clear();
    world.ask.kept.set("c7", { roomId: "r7", title: "Lunch", messages: [{ id: "m7", role: "user", text: "Lunch on Friday?" }] });
    world.ask.holdLists = true;
    const fifth = await open(world, mounts);
    runtime = assistant.runtime(fifth.alpha);
    await vi.waitFor(() => expect(world.ask.heldLists.length).toBe(1));
    world.ask.holdLists = false;
    await chatsList(fifth.alpha);
    await until(fifth.alpha, runtime, Chats, (s) => s.chosen === 0 && s.list.status === "Loaded" && s.page.status === "Idle");
    expect([document.querySelector("[role=log] [aria-busy]"), document.body.textContent?.includes("Messages did not load")]).toEqual([null, false]);
    for (const release of world.ask.heldLists.splice(0)) release();
    await hardware("back");
    await until(fifth.alpha, fifth.alpha.runtime, Pages.Machine, (s) => s.page === "About");

    // spec/app/assistant/chats.md, "A list asked before a conversation was made is left behind, so its answer never takes that conversation away": the list read asked before New chat answers after the conversation was made.
    world.ask.holdLists = true;
    await chatsList(fifth.alpha);
    await vi.waitFor(() => expect(world.ask.heldLists.length).toBe(1));
    await press("New conversation");
    await until(fifth.alpha, runtime, Chats, (s) => s.chosen > 0 && s.make.outcome === "Confirmed" && s.page.status === "Loaded");
    const chats = () => runtime.runPromise(Effect.flatMap(Chats, (machine) => machine.get()));
    const made = (await chats()).chosen;
    world.ask.holdLists = false;
    for (const release of world.ask.heldLists.splice(0)) release();
    await until(fifth.alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    const after = await chats();
    expect([after.chosen, after.ids.includes(made)]).toEqual([made, true]);

    // spec/app/assistant/composer.md, "A typed draft in a conversation that vanished moves into the new chat"
    const carried = "Carry this draft into the new chat";
    write(carried);
    await until(fifth.alpha, runtime, Composer, (s) => s.binding.conversation === made && s.editor.text && s.draft.sync === "Kept");
    world.ask.kept.clear();
    await chatsList(fifth.alpha);
    await until(fifth.alpha, runtime, Chats, (s) => s.chosen === 0 && s.ids.length === 0 && s.list.status === "Loaded");
    await until(fifth.alpha, runtime, Composer, (s) => s.binding.conversation === 0 && s.slot === "Open" && s.editor.text && s.draft.sync === "Kept");
    expect(composerText()).toBe(carried);
    await press("Send");
    await until(fifth.alpha, runtime, Chats, (s) => s.chosen > 0 && s.page.status === "Loaded");
    await until(fifth.alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    expect(world.ask.said.at(-1)).toBe(carried);
  });

  it("Keeps the Later boundary ahead of my new turn when I send while reading older messages (spec/app/assistant/chats.md, \"Older or newer messages are read around a message of the conversation showing\")", async () => {
    const world = { ...scene(), phone };
    world.ask.kept.set("c1", { roomId: "r1", title: "Earlier history", messages: Array.from({ length: 205 }, (_, at) => ({
      id: `history-${at + 1}`, role: "user", text: `History ${at + 1}`,
    })) });
    const { alpha, runtime } = await openAssistant(world);
    await press("Open conversation");
    await until(alpha, runtime, Shell, (state) => state.assistant === "Sheet");
    await chatsList(alpha);
    await until(alpha, runtime, Chats, (state) => state.list.status === "Loaded");
    await restore("Earlier history");
    await until(alpha, runtime, Chats, (state) => state.chosen > 0 && state.page.status === "Loaded");
    await until(alpha, runtime, Composer, (state) => state.binding.conversation > 0 && state.slot === "Open");
    await press("Earlier");
    await until(alpha, runtime, Chats, (state) => state.around > 0 && state.page.status === "Loaded");

    const transcriptOrder = () => [...document.querySelectorAll("[role=log] [data-alpha-message-text], [role=log] button")].flatMap((element) =>
      element.hasAttribute("data-alpha-message-text") || element.textContent === "Later" ? [element.textContent] : []);
    const lastFour = ["History 106", "Later", "Question from here", "Reply from the current turn"];
    const done = Promise.withResolvers<void>();
    world.ask.nextReplyChunks = ["Reply from the current turn"];
    world.ask.holdDoneAfterReady = done.promise;
    try {
      write("Question from here");
      await press("Send");
      await drawn(() => vi.waitFor(() => expect(transcriptOrder().slice(-4)).toEqual(lastFour)));
    } finally {
      done.resolve();
    }
    await until(alpha, runtime, Conversation, (state) => state.turn.reply === "Complete");
    expect(transcriptOrder().slice(-4)).toEqual(lastFour);
    expect(lines()[0]).toBe("History 1");
    expect(lines().slice(-2)).toEqual(["Question from here", "Reply from the current turn"]);
  });

  // spec/app/assistant/index.md, "Story: Stop a reply"
  it("Stop a reply, and learn how it ended (spec/app/assistant/index.md, \"Story: Stop a reply\")", async () => {
    const world = { ...scene(), phone };
    world.ask.kept.set("c1", { roomId: "r1", title: "Ask Alpha", messages: [] });
    world.ask.opened = 1;
    const { alpha, runtime } = await openAssistant(world);
    await chatsList(alpha);
    await until(alpha, runtime, Chats, (s) => s.list.status === "Loaded");
    await restore("Ask Alpha");
    await until(alpha, runtime, Composer, (s) => s.binding.conversation === 1 && s.slot === "Open");

    // spec/app/assistant/index.md, "Stop reply ends a streaming reply, and takes back a message nothing was heard of"
    world.ask.stalled = true;
    world.ask.nextReplyChunks = ["Read [Octopus](https://en.wikipedia.org/wiki/Octopus) and **Lim", " [ans"];
    write("Take your time");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Streaming");
    expect(button("Send")).toBe(undefined);
    // spec/app/assistant/reply.md, "Prose is drawn with its Markdown: bold, italics, code, headings, lists and quotes; a link is a link only to an https address, and HTML reads as text": the reply still being written holds back its open mark, and its link opens through the phone's link path.
    // spec/app/assistant/reply.md, "The agent's turn tag is never drawn, copied, quoted, emailed or spoken, and a reply still being written holds back what may become one": the "[ans" it ends in is held back too.
    const writing = await vi.waitFor(() => {
      const found = document.querySelector("[data-alpha-message-id='reply'] a");
      if (!found) throw new Error("no link in the reply being written");
      return found;
    });
    const tap = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => { writing.dispatchEvent(tap); });
    expect([writing.getAttribute("href"), writing.closest("[data-alpha-message-id]")?.textContent, tap.defaultPrevented]).toEqual(["https://en.wikipedia.org/wiki/Octopus", "Read Octopus and Lim", phone]);
    await press("Stop reply");
    // spec/app/assistant/index.md, "The agent's answer to the abort starts the one read of the conversation"; spec/app/assistant/index.md, "The read says the reply finished anyway, was stopped for sure, was never recorded, or to look later"
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Stopped" && s.check !== "Aborting" && s.recheck.status !== "Loading");
    const first = await runtime.runPromise(Effect.flatMap(Conversation, (machine) => machine.get()));
    expect([world.ask.turns.size, lines()[0], first.check]).toEqual([0, "Take your time", "StoppedForSure"]);

    await until(alpha, runtime, Composer, (s) => s.slot === "Open" && s.away === "Free" && !s.unsettled);
    write("Take your time");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Streaming");
    world.ask.afterStop = [{ id: "scheduled-reminder", role: "assistant", text: "Your review starts now." }];
    await press("Stop reply");
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Stopped" && s.recheck.ticket > first.recheck.ticket && s.recheck.status !== "Loading");
    const second = await runtime.runPromise(Effect.flatMap(Conversation, (machine) => machine.get()));
    expect([world.ask.turns.size, world.ask.said, second.check]).toEqual([0, ["Take your time", "Take your time"], "LookLater"]);
  });

  // spec/app/assistant/context.md, "Story: Let my agent see the Telegram or Slack chat I have open"; spec/app/assistant/context.md, "A turn carries bounded Telegram or Slack context only while that app is in front, authenticated, non-sensitive, allowed by Settings' privacy share, and taken by the peer"
  it("Carries bounded Telegram or Slack context only when authenticated, non-sensitive and allowed, and stages drafts for explicit Send (spec/app/assistant/context.md, \"Story: Let my agent see the Telegram or Slack chat I have open\")", async () => {
    const world = { ...scene(), phone };
    const { alpha } = await open(world, mounts);
    const runtime = assistant.runtime(alpha);
    const bridge = alpha.runtime.runSync(MessagingBridge);
    await until(alpha, runtime, Composer, (s) => s.slot === "Open");
    await until(alpha, runtime, Conversation, (s) => s.ready);
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => s.document.read.status === "Loaded");

    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Telegram" }))));
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "raise", detent: "Sheet" }))));
    await drawn(() => {
      bridge.publishContext("Telegram", {
        platform: "telegram",
        authenticated: false,
        sensitive: true,
        pane: "auth",
        accountLabel: "",
        recentMessages: [],
      });
    });
    await until(alpha, runtime, Conversation, (s) => s.context.sensitive && s.context.showing.tag === "App");
    write("read my code");
    expect(button("Send")?.disabled).toBe(true);

    await drawn(() => {
      bridge.publishContext("Telegram", {
        platform: "telegram",
        authenticated: true,
        sensitive: false,
        pane: "conversation",
        accountLabel: "@owner",
        conversation: { id: "chat-1", title: "Alex", kind: "direct", muted: false, unreadCount: 1 },
        recentMessages: [{ id: "m1", sender: "Alex", at: 1000, text: "See you at 5", isOwn: false }],
      });
    });
    await until(alpha, runtime, Conversation, (s) => !s.context.sensitive && s.context.selected);
    world.ask.metadata = [];
    write("Summarize this chat");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.reply === "Complete");
    expect(world.ask.metadata?.at(-1)).toMatchObject({
      observation: { view: "telegram", sensitive: false },
      messagingContext: { platform: "telegram", accountLabel: "@owner", conversation: { id: "chat-1", title: "Alex" } },
    });

    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Prefs.Machine, (prefs) => prefs.send({ type: "setShare", share: "TelegramContext", on: false, at: 0 }, "Owner"))));
    await until(alpha, alpha.runtime, Prefs.Machine, (s) => !Prefs.allows(s, "TelegramContext"));
    write("Any update?");
    await press("Send");
    await until(alpha, runtime, Conversation, (s) => s.turn.send.id === 2 && s.turn.reply === "Complete");
    expect(world.ask.metadata?.at(-1)).toMatchObject({ observation: { view: "telegram", sensitive: true } });
    expect((world.ask.metadata?.at(-1) as Record<string, unknown> | undefined)?.messagingContext).toBeUndefined();

    const sentBodies: string[] = [];
    bridge.registerHandler("Slack", {
      sendDraft: (draft) => Effect.sync(() => {
        sentBodies.push(draft.body);
        return { status: "sent" as const };
      }),
      openTarget: () => Effect.void,
    });
    await drawn(() => {
      bridge.stageDraft({
        id: "d1",
        platform: "Slack",
        target: "Acme · #design",
        targetId: "C1",
        workspaceId: "T1",
        body: "Joining in 5",
        revision: 1,
        status: "draft",
      });
    });
    expect(sentBodies).toEqual([]);
    const cardSend = [...document.querySelectorAll<HTMLButtonElement>("section[aria-label='Ask Alpha'] [role=log] button")]
      .find((btn) => btn.textContent === "Send");
    expect(cardSend).toBeDefined();
    await drawn(() => { cardSend?.click(); });
    expect(sentBodies).toEqual(["Joining in 5"]);
  });
});
