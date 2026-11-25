// @vitest-environment happy-dom
import { NodeHttpClient } from "@effect/platform-node";
import { startTelegramProvider, type RunningProvider } from "@repo/eliza-harness";
import { Effect, Layer, ManagedRuntime, Stream } from "effect";
import * as KeyValueStore from "effect/persistence/KeyValueStore";
import { TestClock } from "effect/testing";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as Preferences from "../gen/app__settings__preferences.effect.vibe";
import * as Shell from "../gen/app__shell.effect.vibe";
import * as ChatList from "../gen/app__telegram.effect.vibe";
import * as AgentTelegram from "../gen/app__telegram__agent.effect.vibe";
import * as Auth from "../gen/app__telegram__auth.effect.vibe";
import * as Composer from "../gen/app__telegram__composer.effect.vibe";
import * as Conversation from "../gen/app__telegram__conversation.effect.vibe";
import * as Notices from "../gen/app__telegram__notices.effect.vibe";
import { toasts } from "../src/notices/toasts.vibe";
import { browserDevice } from "../src/platform/device.vibe";
import { MessagingSessions, messagingSessions } from "../src/platform/messaging.vibe";
import { grounded } from "../src/platform/platform.vibe";
import { telegramAt } from "../src/platform/telegram.vibe";
import { together, whole } from "../src/runtime/reactor.vibe";
import { shell } from "../src/shell/shell.vibe";
import { TelegramScreen } from "../src/telegram/Telegram.tsx";
import {
  executeTelegramAgentRequest,
  telegramAmbientSnapshot,
  telegramHomeCard,
  telegramResident,
} from "../src/telegram/resident.vibe";
import { TELEGRAM_SESSION_KEY, TelegramStore } from "../src/telegram/store.vibe";

const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
env.IS_REACT_ACT_ENVIRONMENT = true;

async function drawn(work: () => unknown): Promise<void> {
  await act(async () => {
    await work();
  });
}

async function controlJson(origin: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response.json();
}

function buildTestLayer(origin: string) {
  const base = Layer.mergeAll(
    browserDevice,
    messagingSessions,
    Layer.provide(telegramAt(origin), NodeHttpClient.layerNodeHttp),
    Layer.provideMerge(Layer.effectDiscard(TestClock.setTime(1_700_000_000_000)), TestClock.layer()),
  );
  const platform = Layer.provideMerge(grounded, Layer.provideMerge(base, KeyValueStore.layerMemory));
  const prefsLayer = Preferences.machine();
  const appMachines = whole(together(shell, toasts, telegramResident));
  return Layer.provideMerge(appMachines, Layer.merge(platform, prefsLayer));
}

type TestRuntime = ManagedRuntime.ManagedRuntime<Layer.Success<ReturnType<typeof buildTestLayer>>, unknown>;

async function until<S>(
  runtime: TestRuntime,
  streamOf: Effect.Effect<Stream.Stream<S>, never, Layer.Success<ReturnType<typeof buildTestLayer>>>,
  predicate: (state: S) => boolean,
): Promise<S> {
  let matched: S | undefined;
  await drawn(async () => {
    const result = await runtime.runPromise(
      Effect.flatMap(streamOf, (changes) => Stream.runHead(Stream.filter(changes, predicate))),
    );
    if (result._tag === "Some") matched = result.value;
  });
  if (matched === undefined) throw new Error("State predicate did not match");
  return matched;
}

function findButton(name: string): HTMLButtonElement | undefined {
  return [...document.querySelectorAll("button")].find(
    (el) => (el.getAttribute("aria-label") ?? el.textContent?.trim()) === name,
  );
}

async function clickButton(name: string): Promise<void> {
  await drawn(() => {
    const found = findButton(name);
    if (!found) throw new Error(`Button not found: ${name}`);
    found.click();
  });
}

async function clickDialogButton(name: string): Promise<void> {
  await drawn(() => {
    const found = [...document.querySelectorAll("[role=dialog] button, [role=alertdialog] button")].find(
      (el) => el.textContent?.trim() === name,
    );
    if (!(found instanceof HTMLElement)) throw new Error(`Dialog button not found: ${name}`);
    found.click();
  });
}

async function fillField(label: string, value: string): Promise<void> {
  await drawn(() => {
    const found = [...document.querySelectorAll("input, textarea")].find(
      (el) => el.getAttribute("aria-label") === label,
    );
    if (!(found instanceof HTMLInputElement || found instanceof HTMLTextAreaElement)) {
      throw new Error(`Field not found: ${label}`);
    }
    const proto = Object.getPrototypeOf(found) as object;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(found, value);
    found.dispatchEvent(new Event("input", { bubbles: true }));
    found.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function clickRowContaining(text: string): Promise<void> {
  await drawn(() => {
    const found = [...document.querySelectorAll("button")].find((el) => el.textContent?.includes(text));
    if (!found) throw new Error(`Row button containing "${text}" not found`);
    found.click();
  });
}

async function tick(runtime: TestRuntime, ms: number): Promise<void> {
  await drawn(() => runtime.runPromise(TestClock.adjust(ms)));
}

describe("Telegram user-account client over live HTTP+SSE provider", () => {
  let provider: RunningProvider;
  let runtime: TestRuntime | undefined;
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeAll(async () => {
    provider = await startTelegramProvider();
  });

  afterAll(async () => {
    await provider.stop();
  });

  beforeEach(async () => {
    await controlJson(provider.origin, "/__control/reset", {});
    document.body.innerHTML = "";
    const layer = buildTestLayer(provider.origin);
    runtime = ManagedRuntime.make(layer);
    await runtime.runPromise(
      Effect.gen(function* () {
        const shellMachine = yield* Shell.Machine;
        yield* Effect.ignore(shellMachine.send({ type: "openView", view: "Telegram" }));
        const prefs = yield* Preferences.Machine;
        yield* Effect.ignore(
          prefs.send(
            {
              type: "start",
              at: 1_700_000_000_000,
              kept: "System",
              keptLegible: false,
              readable: true,
              look: "LightLook",
            },
            "Phone",
          ),
        );
        yield* Effect.ignore(
          prefs.send(
            {
              type: "documentRead",
              docRead: 1,
              readable: true,
              askFirst: true,
              images: true,
              shares: ["TelegramContext"],
            },
            "Phone",
          ),
        );
      }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const activeRuntime = runtime;
    await drawn(() => {
      root?.render(<TelegramScreen runtime={activeRuntime} />);
    });
  });

  afterEach(async () => {
    if (root) {
      const mounted = root;
      root = undefined;
      await drawn(() => {
        mounted.unmount();
      });
    }
    if (runtime) {
      const active = runtime;
      runtime = undefined;
      await active.dispose();
    }
    container?.remove();
    container = undefined;
  });

  // spec/app/telegram/auth.md, "Story: Sign in to my Telegram user account"
  it("authenticates via Phone->OTP, 2FA password, and QR login while rejecting bot tokens and honoring FloodWait", async () => {
    const rt = runtime!;
    const authChanges = Auth.Machine.use((m) => Effect.succeed(m.changes));
    const listChanges = ChatList.Machine.use((m) => Effect.succeed(m.changes));

    // spec/app/telegram/auth.md, "Every non-authenticated auth state is sensitive, so Ask Alpha sees nothing of sign-in screens"
    expect(document.body.textContent).toContain("User account · no bot token");
    expect(document.querySelector("[data-alpha-sensitive='true']")).not.toBeNull();

    await clickButton("Continue");
    await until(rt, authChanges, (s) => s.step === "PhoneEntry");

    // spec/app/telegram/auth.md, "Bot tokens are never authenticated, an authenticated session always names a user account and positive credential revision, and FloodWait blocks submits"
    await fillField("Phone number", "123456:ABCDefghijKLMN_bot");
    await clickButton("Send code");
    await until(rt, authChanges, (s) => s.trouble === "BotTokenRejected" && s.work === "Idle");
    expect(document.body.textContent).toContain("Bot tokens are not supported");

    await fillField("Phone number", "not-a-phone");
    await clickButton("Send code");
    await until(rt, authChanges, (s) => s.trouble === "InvalidPhone" && s.work === "Idle");
    expect(document.body.textContent).toContain("Enter a valid phone number");

    // spec/app/telegram/auth.md, "Opening sign-in moves to phone entry or QR login; phone submission respects FloodWait and takes the next ticket"
    await controlJson(provider.origin, "/__control/fault", {
      path: "/rpc/auth.sendCode",
      status: 429,
      retryAfter: 2,
      body: { ok: false, error_code: 429, error_message: "FLOOD_WAIT_2" },
      remaining: 1,
    });
    await fillField("Phone number", "+9996621234");
    await clickButton("Send code");
    await until(rt, authChanges, (s) => s.trouble === "FloodWait" && s.work === "Idle");
    expect(document.body.textContent).toContain("Too many attempts");
    expect(findButton("Send code")?.disabled).toBe(true);

    await tick(rt, 2_500);
    await drawn(() => {});
    await clickButton("Send code");
    await until(rt, authChanges, (s) => s.step === "CodePending" && s.work === "Idle");

    // spec/app/telegram/auth.md, "A verification code is checked with a secret code, and may authenticate a user account, request two-factor password, expire or trigger FloodWait"
    await fillField("Verification code", "00000");
    await clickButton("Verify code");
    await until(rt, authChanges, (s) => s.trouble === "WrongCode" && s.work === "Idle");

    await fillField("Verification code", "22222");
    await clickButton("Verify code");
    await until(rt, authChanges, (s) => s.step === "Authenticated");
    await until(rt, listChanges, (s) => s.list.status === "Loaded" && s.pages === 1);

    const storedAuthState = await rt.runPromise(Auth.Machine.use((m) => m.get()));
    expect(JSON.stringify(storedAuthState)).not.toContain("tg-sess-");
    expect(JSON.stringify(storedAuthState)).not.toContain("22222");
    const sessionOpt = await rt.runPromise(MessagingSessions.use((s) => s.get(TELEGRAM_SESSION_KEY)));
    expect(sessionOpt._tag).toBe("Some");

    // spec/app/telegram/auth.md, "Two-factor cloud password is checked as a secret and authenticates only a user account"
    await rt.runPromise(Auth.Machine.use((m) => m.send({ type: "signOut" })));
    await until(rt, authChanges, (s) => s.step === "SignedOut" && s.work === "Idle");
    await clickButton("Continue");
    await until(rt, authChanges, (s) => s.step === "PhoneEntry");

    await fillField("Phone number", "+15550109999");
    await clickButton("Send code");
    await until(rt, authChanges, (s) => s.step === "CodePending");
    const codeInfo = (await controlJson(provider.origin, "/__control/last-code?phone=%2B15550109999")) as {
      readonly code: string;
    };
    await fillField("Verification code", codeInfo.code);
    await clickButton("Verify code");
    await until(rt, authChanges, (s) => s.step === "TwoFactorRequired");
    expect(document.body.textContent).toContain("codename");

    await fillField("Two-factor password", "wrong-pass");
    await clickButton("Unlock account");
    await until(rt, authChanges, (s) => s.trouble === "WrongPassword" && s.work === "Idle");

    await fillField("Two-factor password", "alpha-2fa");
    await clickButton("Unlock account");
    await until(rt, authChanges, (s) => s.step === "Authenticated");
    await until(rt, listChanges, (s) => s.list.status === "Loaded");

    // spec/app/telegram/auth.md, "QR login offers an alternate user-account path with expiry, optional two-factor check and secret token"
    await rt.runPromise(Auth.Machine.use((m) => m.send({ type: "signOut" })));
    await until(rt, authChanges, (s) => s.step === "SignedOut" && s.work === "Idle");
    await clickButton("Continue");
    await until(rt, authChanges, (s) => s.step === "PhoneEntry");

    await clickButton("Sign in with QR");
    await until(rt, authChanges, (s) => s.step === "QrPending");
    let qrToken = "";
    for (let i = 0; i < 20; i += 1) {
      const snap = await rt.runPromise(Effect.flatMap(TelegramStore, (s) => s.get()));
      if (snap.auth.qrToken !== "") {
        qrToken = snap.auth.qrToken;
        break;
      }
      await tick(rt, 50);
    }
    expect(qrToken).not.toBe("");
    await controlJson(provider.origin, "/__control/approve-qr", { token: qrToken });
    for (let i = 0; i < 20; i += 1) {
      const current = await rt.runPromise(Effect.flatMap(Auth.Machine, (m) => m.get()));
      if (current.step === "Authenticated") break;
      await tick(rt, 60);
    }
    const finalAuth = await rt.runPromise(Effect.flatMap(Auth.Machine, (m) => m.get()));
    expect(finalAuth.step).toBe("Authenticated");
  });

  // spec/app/telegram/index.md, "Story: Browse and search my Telegram chats"; spec/app/telegram/conversation.md, "Story: Read and interact with a Telegram conversation"; spec/app/telegram/composer.md, "Story: Draft and send Telegram messages under my sole authority"
  it("lists dialogs, switches tabs, searches, reads history with visible-only mark-read, replies, edits, deletes with review, reacts, mutes, and enforces broadcast read-only", async () => {
    const rt = runtime!;
    const authChanges = Auth.Machine.use((m) => Effect.succeed(m.changes));
    const listChanges = ChatList.Machine.use((m) => Effect.succeed(m.changes));
    const convChanges = Conversation.Machine.use((m) => Effect.succeed(m.changes));
    const compChanges = Composer.Machine.use((m) => Effect.succeed(m.changes));

    await clickButton("Continue");
    await fillField("Phone number", "+9996621234");
    await clickButton("Send code");
    await until(rt, authChanges, (s) => s.step === "CodePending");
    await fillField("Verification code", "22222");
    await clickButton("Verify code");
    await until(rt, listChanges, (s) => s.list.status === "Loaded" && s.pages === 1);

    expect(document.body.textContent).toContain("Maya");
    expect(document.body.textContent).toContain("Alpha Core");
    expect(document.body.textContent).toContain("Alpha Release Notes");

    // spec/app/telegram/index.md, "Choosing a filter, folder, search or refresh reads the first page under a new ticket"
    await rt.runPromise(ChatList.Machine.use((m) => m.send({ type: "chooseFilter", tab: "ArchivedChats", folderId: 0 })));
    await until(rt, listChanges, (s) => s.selected.tab === "ArchivedChats" && s.list.status === "Loaded");
    expect(document.body.textContent).toContain("Samira");

    await rt.runPromise(ChatList.Machine.use((m) => m.send({ type: "chooseFilter", tab: "PinnedChats", folderId: 0 })));
    await until(rt, listChanges, (s) => s.selected.tab === "PinnedChats" && s.list.status === "Loaded");
    expect(document.body.textContent).toContain("Maya");

    await rt.runPromise(ChatList.Machine.use((m) => m.send({ type: "chooseFilter", tab: "UnreadChats", folderId: 0 })));
    await until(rt, listChanges, (s) => s.selected.tab === "UnreadChats" && s.list.status === "Loaded");
    expect(document.body.textContent).toContain("Alpha Core");

    await rt.runPromise(ChatList.Machine.use((m) => m.send({ type: "chooseFilter", tab: "AllChats", folderId: 0 })));
    await until(rt, listChanges, (s) => s.selected.tab === "AllChats" && s.list.status === "Loaded");

    await fillField("Search Telegram", "Alpha");
    await until(rt, listChanges, (s) => s.selected.query === "Alpha" && s.list.status === "Loaded");
    await fillField("Search Telegram", "");
    await until(rt, listChanges, (s) => s.selected.query === "" && s.list.status === "Loaded");

    // spec/app/telegram/conversation.md, "Only the newest timeline read answers; MarkRead fires ONLY when the newest page is visibly shown in front"
    await clickRowContaining("Alpha Core");
    await until(rt, convChanges, (s) => s.chat > 0 && s.newestLoaded && s.unread === 0);
    await until(rt, compChanges, (s) => s.chat > 0);
    const readReqs = (await controlJson(provider.origin, "/__control/requests?path=/rpc/messages.readHistory")) as {
      readonly requests: ReadonlyArray<unknown>;
    };
    expect(readReqs.requests.length).toBeGreaterThanOrEqual(1);

    // spec/app/telegram/conversation.md, "Inline reply targeting works only in chats where the owner can compose"
    await clickButton("Reply");
    await until(rt, convChanges, (s) => s.replyTo > 0);
    await fillField("Message", "Inline reply from Alpha");
    await until(rt, compChanges, (s) => s.slot.author === "OwnerWrote");
    await clickButton("Send");
    await until(rt, compChanges, (s) => s.sendOp.outcome === "Confirmed");
    expect(document.body.textContent).toContain("Inline reply from Alpha");

    // spec/app/telegram/conversation.md, "Message edit, reviewed delete and reaction toggle execute one attempt at a time with honest outcomes"
    await clickButton("React");
    await until(rt, convChanges, (s) => s.opKind === "ToggleReact" && s.op.outcome === "Confirmed");

    const editButtons = [...document.querySelectorAll("button[aria-label='Edit']")];
    expect(editButtons.length).toBeGreaterThan(0);
    await drawn(() => { (editButtons[editButtons.length - 1] as HTMLButtonElement).click(); });
    await fillField("Edit message", "Edited inline reply from Alpha");
    await clickButton("Save edit");
    await until(rt, convChanges, (s) => s.opKind === "EditMsg" && s.op.outcome === "Confirmed");
    expect(document.body.textContent).toContain("Edited inline reply from Alpha");

    // spec/app/telegram/conversation.md, "Delete requires a confirmed review, broadcast read-only never holds a reply target, and every read or mutation terminates"
    const deleteButtons = [...document.querySelectorAll("button[aria-label='Delete']")];
    await drawn(() => { (deleteButtons[deleteButtons.length - 1] as HTMLButtonElement).click(); });
    await until(rt, convChanges, (s) => s.deleteReview.showing);
    const deletesBeforeConfirm = (await controlJson(provider.origin, "/__control/requests?path=/rpc/messages.deleteMessages")) as {
      readonly requests: ReadonlyArray<unknown>;
    };
    expect(deletesBeforeConfirm.requests.length).toBe(0);
    await clickDialogButton("Delete");
    await until(rt, convChanges, (s) => s.opKind === "DeleteMsg" && s.op.outcome === "Confirmed");
    expect(document.body.textContent).not.toContain("Edited inline reply from Alpha");

    // spec/app/telegram/index.md, "Muting or unmuting a chat runs as a once-only attempt"
    await clickButton("Mute chat");
    await until(rt, listChanges, (s) => s.muteOp.outcome === "Confirmed");

    // spec/app/telegram/conversation.md, "Broadcast channels without posting permission block composing and inline replies"
    await clickButton("Back to chats");
    await until(rt, convChanges, (s) => s.chat === 0);
    await clickRowContaining("Alpha Release Notes");
    await until(rt, convChanges, (s) => s.chat > 0 && s.kind === "BroadcastChannel" && !s.canPost);
    expect(document.body.textContent).toContain("This broadcast channel is read-only.");
    expect(document.querySelector("textarea[aria-label='Message']")).toBeNull();
  });

  // spec/app/telegram/agent.md, "Story: Let Alpha help with Telegram safely and transparently"; spec/app/telegram/notices.md, "Story: Hear about new Telegram messages without noise"
  it("gates ambient context, stages Alpha drafts without sending, dispatches on owner tap, and delivers SSE notices with mute suppression", async () => {
    const rt = runtime!;
    const authChanges = Auth.Machine.use((m) => Effect.succeed(m.changes));
    const listChanges = ChatList.Machine.use((m) => Effect.succeed(m.changes));
    const convChanges = Conversation.Machine.use((m) => Effect.succeed(m.changes));
    const compChanges = Composer.Machine.use((m) => Effect.succeed(m.changes));
    const agentChanges = AgentTelegram.Machine.use((m) => Effect.succeed(m.changes));
    const noticeChanges = Notices.Machine.use((m) => Effect.succeed(m.changes));

    // spec/app/telegram/agent.md, "Ambient context is emitted ONLY when authenticated, non-sensitive and allowed by `TelegramContext`, bounded to 15 messages and 6000 characters, with zero secrets"
    const whileAuth = await rt.runPromise(telegramAmbientSnapshot);
    expect(whileAuth.available).toBe(false);
    expect(whileAuth.sensitive).toBe(true);

    await clickButton("Continue");
    await fillField("Phone number", "+9996621234");
    await clickButton("Send code");
    await until(rt, authChanges, (s) => s.step === "CodePending");
    await fillField("Verification code", "22222");
    await clickButton("Verify code");
    await until(rt, listChanges, (s) => s.list.status === "Loaded" && s.pages === 1);
    await until(rt, noticeChanges, (s) => s.since > 0);

    const card = await rt.runPromise(telegramHomeCard);
    expect(card.standing).toBe("Ready");
    expect(card.rows.length).toBeGreaterThan(0);

    await clickRowContaining("Maya");
    await until(rt, convChanges, (s) => s.chat > 0 && s.newestLoaded);
    await until(rt, compChanges, (s) => s.chat > 0);
    await until(rt, agentChanges, (s) => s.authenticated && s.shareAllowed && s.pane === "ChatPane" && s.activeChat > 0);

    const ambientOn = await rt.runPromise(telegramAmbientSnapshot);
    expect(ambientOn.available).toBe(true);
    if (ambientOn.available) {
      expect(ambientOn.messages.length).toBeLessThanOrEqual(15);
      expect(ambientOn.charCount).toBeLessThanOrEqual(6000);
      expect(JSON.stringify(ambientOn)).not.toContain("tg-sess-");
    }

    // spec/app/telegram/agent.md, "Ambient context is emitted ONLY when authenticated, non-sensitive and allowed by `TelegramContext`, bounded to 15 messages and 6000 characters, with zero secrets"
    await rt.runPromise(
      Effect.flatMap(Preferences.Machine, (m) => Effect.gen(function* () {
        yield* m.send({ type: "setShare", share: "TelegramContext", on: false, at: 1_700_000_001_000 }, "Owner");
        const saving = (yield* m.get()).saving.read.ticket;
        yield* m.send({ type: "documentSaved", save: saving, ok: true }, "Phone");
      })),
    );
    await until(rt, agentChanges, (s) => !s.shareAllowed);
    const ambientOff = await rt.runPromise(telegramAmbientSnapshot);
    expect(ambientOff.available).toBe(false);

    // spec/app/telegram/agent.md, "Direct read tools run only while authenticated within the 25-message bound and mutate no state"
    const listedByAgent = await rt.runPromise(executeTelegramAgentRequest({ kind: "TelegramListChats", limit: 10 }));
    expect(listedByAgent.ok).toBe(true);

    // spec/app/telegram/agent.md, "Staging a draft (`TELEGRAM_DRAFT_MESSAGE`) emits only `StageDraft` and NEVER sends"
    const openChatId = (await rt.runPromise(Conversation.Machine.use((m) => m.get()))).chat;
    const staged = await rt.runPromise(
      executeTelegramAgentRequest({
        kind: "TelegramDraftMessage",
        turn: 1,
        chat: openChatId,
        text: "Alpha drafted this reply for review",
      }),
    );
    expect(staged.ok).toBe(true);
    await until(rt, compChanges, (s) => s.slot.author === "AlphaWrote");
    expect(document.body.textContent).toContain("Alpha's draft · not sent");
    expect(document.body.textContent).toContain("Alpha drafted this reply for review");

    const sendsBeforeOwnerTap = (await controlJson(provider.origin, "/__control/requests?path=/rpc/messages.sendMessage")) as {
      readonly requests: ReadonlyArray<unknown>;
    };
    expect(sendsBeforeOwnerTap.requests.length).toBe(0);

    // spec/app/telegram/composer.md, "Only the owner's tap sends: Recorded before Sent, read-back only on Unknown, confirmed clears the draft"
    await clickButton("Send");
    await until(rt, compChanges, (s) => s.sendOp.outcome === "Confirmed");
    const sendsAfterOwnerTap = (await controlJson(provider.origin, "/__control/requests?path=/rpc/messages.sendMessage")) as {
      readonly requests: ReadonlyArray<{ readonly headers: Record<string, string> }>;
    };
    expect(sendsAfterOwnerTap.requests.length).toBe(1);
    expect(sendsAfterOwnerTap.requests[0]?.headers["idempotency-key"]).toBeTruthy();

    // spec/app/telegram/notices.md, "Own, muted, archived, read-only broadcast and currently visible front-chat messages are always suppressed"
    await clickButton("Back to chats");
    await until(rt, convChanges, (s) => s.chat === 0);
    await until(rt, noticeChanges, (s) => s.frontChat === 0);

    // spec/app/telegram/notices.md, "Own, muted, archived, read-only broadcast and currently visible front-chat messages are always suppressed"
    await controlJson(provider.origin, "/__control/inject", {
      kind: "message",
      peer: "channel:4002",
      from_id: 4002,
      text: "Muted broadcast update",
    });
    await tick(rt, 100);
    const noticesAfterMuted = await rt.runPromise(Notices.Machine.use((m) => m.get()));
    expect(noticesAfterMuted.posts).toBe(0);

    // spec/app/telegram/notices.md, "Polling reads updates from the watermark; the first answer sets the baseline quietly and later answers post only eligible messages"
    await controlJson(provider.origin, "/__control/inject", {
      kind: "message",
      peer: "user:2001",
      from_id: 2001,
      text: "Live SSE ping from Maya",
    });
    await until(rt, noticeChanges, (s) => s.posts >= 1 && s.upChats.length >= 1);
    const snap = await rt.runPromise(TelegramStore.use((s) => s.get()));
    expect(snap.notices.some((entry) => entry.excerpt === "Live SSE ping from Maya")).toBe(true);
  });

  // spec/app/telegram/auth.md, "Remote revocation and explicit sign-out wipe local data, advance the credential revision and stop sync"
  it("wipes cached state on remote revocation and calls auth.logOut on explicit Sign Out", async () => {
    const rt = runtime!;
    const authChanges = Auth.Machine.use((m) => Effect.succeed(m.changes));
    const listChanges = ChatList.Machine.use((m) => Effect.succeed(m.changes));

    await clickButton("Continue");
    await fillField("Phone number", "+9996621234");
    await clickButton("Send code");
    await until(rt, authChanges, (s) => s.step === "CodePending");
    await fillField("Verification code", "22222");
    await clickButton("Verify code");
    await until(rt, listChanges, (s) => s.list.status === "Loaded" && s.pages === 1);

    await controlJson(provider.origin, "/__control/revoke", {});
    await until(rt, authChanges, (s) => s.step === "SessionExpired" && s.trouble === "SessionRevoked");
    await until(rt, listChanges, (s) => !s.authenticated && s.pages === 0);
    const afterRevokeSnap = await rt.runPromise(TelegramStore.use((s) => s.get()));
    expect(afterRevokeSnap.dialogs).toEqual([]);
    expect(afterRevokeSnap.historyByPeer.size).toBe(0);
    expect(afterRevokeSnap.drafts.size).toBe(0);
    const revokedCard = await rt.runPromise(telegramHomeCard);
    expect(revokedCard).toEqual({ standing: "SignedOut", unread: 0, mentions: 0, rows: [] });

    // spec/app/telegram/auth.md, "Remote revocation and explicit sign-out wipe local data, advance the credential revision and stop sync"
    await clickButton("Sign in again");
    await until(rt, authChanges, (s) => s.step === "PhoneEntry");
    await fillField("Phone number", "+9996621234");
    await clickButton("Send code");
    await until(rt, authChanges, (s) => s.step === "CodePending");
    await fillField("Verification code", "22222");
    await clickButton("Verify code");
    await until(rt, listChanges, (s) => s.list.status === "Loaded" && s.pages === 1);

    await rt.runPromise(Auth.Machine.use((m) => m.send({ type: "signOut" })));
    await until(rt, authChanges, (s) => s.step === "SignedOut" && s.work === "Idle");
    await until(rt, listChanges, (s) => !s.authenticated && s.pages === 0);

    const logOutReqs = (await controlJson(provider.origin, "/__control/requests?path=/rpc/auth.logOut")) as {
      readonly requests: ReadonlyArray<unknown>;
    };
    expect(logOutReqs.requests.length).toBeGreaterThanOrEqual(1);
    const afterSignOutSession = await rt.runPromise(MessagingSessions.use((s) => s.get(TELEGRAM_SESSION_KEY)));
    expect(afterSignOutSession._tag).toBe("None");
    const afterSignOutSnap = await rt.runPromise(TelegramStore.use((s) => s.get()));
    expect(afterSignOutSnap.dialogs).toEqual([]);
    expect(afterSignOutSnap.drafts.size).toBe(0);
  });
});
