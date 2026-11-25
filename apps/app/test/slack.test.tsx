// @vitest-environment happy-dom
// spec/app/slack/index.md, "Story: Switch workspaces and browse Slack conversations with strict isolation"; spec/app/slack/auth.md, "Story: Connect and manage my Slack workspaces with user tokens only"; spec/app/slack/conversation.md, "Story: Read Slack channels and threaded replies accurately"; spec/app/slack/composer.md, "Story: Draft and send Slack messages and thread replies safely"; spec/app/slack/agent.md, "Story: Let Alpha help across my Slack workspaces safely"; spec/app/slack/notices.md, "Story: Hear about Slack DMs, mentions and thread replies per workspace"
import { type RunningProvider, startSlackProvider } from "@repo/eliza-harness";
import { Effect, Layer, ManagedRuntime, Option, Stream } from "effect";
import { FetchHttpClient } from "effect/http";
import type * as KeyValueStore from "effect/persistence/KeyValueStore";
import { act } from "react";
import { type Root, createRoot } from "react-dom/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import * as Preferences from "../gen/app__settings__preferences.effect.vibe";
import { Machine as WorkspacesMachine, attention } from "../gen/app__slack.effect.vibe";
import { Machine as AgentMachine } from "../gen/app__slack__agent.effect.vibe";
import { Machine as AuthMachine, sensitive } from "../gen/app__slack__auth.effect.vibe";
import { Machine as ComposerMachine } from "../gen/app__slack__composer.effect.vibe";
import { Machine as ConversationMachine } from "../gen/app__slack__conversation.effect.vibe";
import { Machine as NoticesMachine } from "../gen/app__slack__notices.effect.vibe";
import { agentAt } from "../src/platform/agent.vibe";
import { cloudAt } from "../src/platform/cloud.vibe";
import { MessagingSessions, messagingSessions } from "../src/platform/messaging.vibe";
import { pagePlatform } from "../src/platform/platform.vibe";
import { assertSlackUserToken, slackAt } from "../src/platform/slack.vibe";
import { together, whole } from "../src/runtime/reactor.vibe";
import { SlackScreen } from "../src/slack/Slack.tsx";
import { completeSlackOAuthCallback, submitSlackTokenAttempt } from "../src/slack/auth.vibe";
import { type PendingOAuth, SlackLedger, slackSessionKey } from "../src/slack/ledger.vibe";
import { executeSlackAgentRequest, slackAmbientSnapshot, slackBack, slackHomeCard, slackResident } from "../src/slack/resident.vibe";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface MountedSlack {
  readonly runtime: ManagedRuntime.ManagedRuntime<
    Preferences.Machine | AuthMachine | WorkspacesMachine | ConversationMachine | ComposerMachine | AgentMachine | NoticesMachine | SlackLedger | MessagingSessions | KeyValueStore.KeyValueStore,
    unknown
  >;
  readonly host: HTMLDivElement;
  readonly close: () => Promise<void>;
}

let provider: RunningProvider;
const mounted: MountedSlack[] = [];

async function underAct(work: () => Promise<void> | void): Promise<void> {
  await act(async () => {
    await work();
  });
}

async function mountSlack(origin: string): Promise<MountedSlack> {
  const slackLayer = Layer.provide(slackAt(origin), FetchHttpClient.layer);
  const platform = pagePlatform(
    Layer.provide(agentAt(origin), FetchHttpClient.layer),
    Layer.provide(cloudAt(origin), FetchHttpClient.layer),
    { slack: slackLayer, sessions: messagingSessions },
  );
  const appLayer = Layer.provideMerge(whole(together(slackResident, Preferences.machine())), platform);
  const runtime = ManagedRuntime.make(appLayer) as unknown as MountedSlack["runtime"];
  const host = document.body.appendChild(document.createElement("div"));
  const root: Root = createRoot(host);
  await underAct(async () => {
    root.render(<SlackScreen runtime={runtime as unknown as Parameters<typeof SlackScreen>[0]["runtime"]} />);
    await runtime.runPromise(Effect.void);
  });
  const handle: MountedSlack = {
    runtime,
    host,
    close: async () => {
      await underAct(() => {
        root.unmount();
      });
      host.remove();
      await runtime.dispose();
    },
  };
  mounted.push(handle);
  return handle;
}

async function waitFor<S>(
  runtime: MountedSlack["runtime"],
  changes: Effect.Effect<Stream.Stream<S>, never, never>,
  predicate: (state: S) => boolean,
): Promise<S> {
  let matched!: S;
  await underAct(async () => {
    const found = await runtime.runPromise(
      Effect.flatMap(changes, (stream) => Stream.runHead(Stream.filter(stream, predicate))),
    );
    if (Option.isNone(found)) throw new Error("Stream ended before predicate matched");
    matched = found.value;
  });
  return matched;
}

function findButton(host: HTMLElement, label: string): HTMLButtonElement {
  const buttons = [...host.querySelectorAll<HTMLButtonElement>("button")];
  const found = buttons.find((b) =>
    b.getAttribute("aria-label") === label || b.textContent?.trim() === label || b.textContent?.includes(label));
  if (!found) throw new Error(`Button not found: ${label}`);
  return found;
}

async function waitForPendingOAuth(app: MountedSlack, nonce: number): Promise<PendingOAuth> {
  const ledger = await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.succeed(l)));
  const immediate = ledger.pendingOAuth();
  if (immediate && immediate.nonce === nonce) return immediate;
  return new Promise<PendingOAuth>((resolve) => {
    const off = ledger.subscribe(() => {
      const next = ledger.pendingOAuth();
      if (next && next.nonce === nonce) {
        off();
        resolve(next);
      }
    });
  });
}

async function connectWorkspaceViaPkce(app: MountedSlack, teamId: string): Promise<number> {
  await underAct(async () => {
    await app.runtime.runPromise(Effect.flatMap(SlackLedger, (ledger) => Effect.sync(() => ledger.setPendingTeam(teamId))));
    await app.runtime.runPromise(Effect.flatMap(AuthMachine, (m) => m.send({ type: "startConnect" })));
  });
  expect(app.host.textContent).toContain("Review Slack user scopes");
  expect(app.host.textContent).toContain("User account · no bot token");
  const authBeforeApprove = await app.runtime.runPromise(Effect.flatMap(AuthMachine, (m) => m.get()));
  expect(sensitive(authBeforeApprove)).toBe(true);

  await underAct(() => {
    findButton(app.host, "Approve & connect").click();
  });
  const browserAuth = await waitFor(app.runtime, Effect.map(AuthMachine, (m) => m.changes), (s) => s.step === "BrowserOAuth");
  const pending = await waitForPendingOAuth(app, browserAuth.nonce);
  expect(pending.authorizeUrl).toContain("user_scope=");
  expect(pending.authorizeUrl).not.toContain("&scope=");
  expect(pending.authorizeUrl).toContain("code_challenge_method=S256");

  const authRes = await fetch(`${pending.authorizeUrl}&auto_approve=1`, { redirect: "manual" });
  expect(authRes.status).toBe(302);
  const location = authRes.headers.get("location") ?? "";
  const callbackUrl = new URL(location);
  const code = callbackUrl.searchParams.get("code") ?? "";
  const state = callbackUrl.searchParams.get("state") ?? "";
  expect(code).not.toBe("");
  expect(state).toBe(pending.state);

  await underAct(async () => {
    await app.runtime.runPromise(completeSlackOAuthCallback(state, code));
  });
  const authAfter = await waitFor(
    app.runtime,
    Effect.map(AuthMachine, (m) => m.changes),
    (s) => s.step === "Idle" && s.connected.length > 0 && s.trouble === "Fine",
  );
  const meta = await app.runtime.runPromise(Effect.flatMap(SlackLedger, (ledger) => Effect.sync(() => ledger.workspaceByTeamId(teamId))));
  expect(meta).toBeDefined();
  const wsNum = meta?.num ?? 0;
  expect(authAfter.connected.some((w) => w.workspace === wsNum && w.tokenKind === "UserToken")).toBe(true);
  await waitFor(
    app.runtime,
    Effect.map(WorkspacesMachine, (m) => m.changes),
    (s) => s.connected.some((w) => w.workspace === wsNum) && s.list.status === "Loaded",
  );
  return wsNum;
}

async function controlPost(path: string, body: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(`${provider.origin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function controlRequests(path: string): Promise<ReadonlyArray<{ readonly path: string; readonly method: string; readonly headers: Record<string, string>; readonly body?: unknown }>> {
  const res = await fetch(`${provider.origin}/__control/requests?path=${encodeURIComponent(path)}`);
  const json = await res.json() as { readonly requests: ReadonlyArray<{ readonly path: string; readonly method: string; readonly headers: Record<string, string>; readonly body?: unknown }> };
  return json.requests;
}

beforeAll(async () => {
  provider = await startSlackProvider();
});

afterEach(async () => {
  for (const app of mounted.splice(0)) await app.close();
  localStorage.clear();
  await controlPost("/__control/reset");
});

afterAll(async () => {
  await provider.stop();
});

describe("Slack user-account client over live HTTP+SSE provider", () => {
  // spec/app/slack/auth.md, "Adding a workspace presents scope consent first, then opens PKCE OAuth with a fresh state nonce"; spec/app/slack/auth.md, "OAuth callback verifies the state nonce and exchanges the secret code and PKCE verifier; only user tokens (`UserToken`) are admitted"; spec/app/slack/auth.md, "Bot tokens are never admitted into connected workspaces, and per-workspace sign-out preserves all other workspaces"
  it("completes scope consent and real PKCE OAuth2 user flow for two workspaces and strictly rejects bot tokens", async () => {
    const app = await mountSlack(provider.origin);
    expect(app.host.textContent).toContain("Connect Slack");
    expect(app.host.textContent).toContain("User account · no bot token");

    const alphaWs = await connectWorkspaceViaPkce(app, "T01ALPHA");
    const designWs = await connectWorkspaceViaPkce(app, "T02DESIGN");
    expect(alphaWs).not.toBe(designWs);

    const alphaSecret = await app.runtime.runPromise(Effect.flatMap(MessagingSessions, (s) => s.get(slackSessionKey("T01ALPHA"))));
    const designSecret = await app.runtime.runPromise(Effect.flatMap(MessagingSessions, (s) => s.get(slackSessionKey("T02DESIGN"))));
    expect(Option.isSome(alphaSecret)).toBe(true);
    expect(Option.isSome(designSecret)).toBe(true);
    expect(JSON.stringify(localStorage)).not.toContain("xoxp-");

    const botCheck = await app.runtime.runPromiseExit(assertSlackUserToken("xoxb-disallowed-bot-token"));
    expect(botCheck._tag).toBe("Failure");
    const botScopeRes = await fetch(`${provider.origin}/oauth/v2/authorize?client_id=alpha&scope=chat:write&redirect_uri=alpha://cb&state=s1`);
    expect(botScopeRes.status).toBe(400);

    await underAct(async () => {
      const admitted = await app.runtime.runPromise(submitSlackTokenAttempt("xoxb-disallowed-bot-token"));
      expect(admitted).toBe(false);
    });
    const authAfterBot = await app.runtime.runPromise(Effect.flatMap(AuthMachine, (m) => m.get()));
    expect(authAfterBot.trouble).toBe("BotTokenRejected");
    expect(authAfterBot.connected.length).toBe(2);
    expect(authAfterBot.connected.every((w) => w.tokenKind === "UserToken")).toBe(true);
  });

  // spec/app/slack/index.md, "Switching workspace, choosing a section, searching or refreshing reads the first page under a new ticket"; spec/app/slack/conversation.md, "Opening a channel reads its newest history; opening a thread drawer pins its parent and reads thread replies independently"; spec/app/slack/conversation.md, "Edit, reviewed delete and emoji reactions execute one attempt at a time with honest outcomes"; spec/app/slack/composer.md, "Only the owner's tap sends; Unknown outcomes reconcile via read-back only"
  it("switches workspaces with strict isolation, searches, opens threads with broadcast send, edits, deletes with review, reacts, marks read, and mutes", async () => {
    const app = await mountSlack(provider.origin);
    const alphaWs = await connectWorkspaceViaPkce(app, "T01ALPHA");
    const designWs = await connectWorkspaceViaPkce(app, "T02DESIGN");

    expect(app.host.textContent).toContain("general");
    expect(app.host.textContent).toContain("engineering");
    expect(app.host.textContent).toContain("Maya Chen");
    expect(app.host.textContent).not.toContain("critique");

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(WorkspacesMachine, (m) => m.send({ type: "switchWorkspace", workspace: designWs })));
    });
    await waitFor(app.runtime, Effect.map(WorkspacesMachine, (m) => m.changes), (s) => s.selected.workspace === designWs && s.list.status === "Loaded");
    expect(app.host.textContent).toContain("critique");
    expect(app.host.textContent).toContain("Sora Takahashi");
    expect(app.host.textContent).not.toContain("engineering");

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(WorkspacesMachine, (m) => m.send({ type: "switchWorkspace", workspace: alphaWs })));
    });
    await waitFor(app.runtime, Effect.map(WorkspacesMachine, (m) => m.changes), (s) => s.selected.workspace === alphaWs && s.list.status === "Loaded");

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(WorkspacesMachine, (m) => m.send({ type: "search", query: "in:#engineering backoff" })));
    });
    await waitFor(app.runtime, Effect.map(WorkspacesMachine, (m) => m.changes), (s) => s.selected.query === "in:#engineering backoff" && s.list.status === "Loaded");
    expect(app.host.textContent).toContain("retry backoff PR");

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(WorkspacesMachine, (m) => m.send({ type: "search", query: "from:@maya" })));
    });
    await waitFor(app.runtime, Effect.map(WorkspacesMachine, (m) => m.changes), (s) => s.selected.query === "from:@maya" && s.list.status === "Loaded");
    expect(app.host.textContent).toContain("Sprint review kicks off");

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(WorkspacesMachine, (m) => m.send({ type: "chooseSection", section: "AllConversations" })));
    });
    await waitFor(app.runtime, Effect.map(WorkspacesMachine, (m) => m.changes), (s) => s.selected.query === "" && s.list.status === "Loaded");

    const generalNum = await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.channelNum(alphaWs, "C01GENERAL"))));
    const engNum = await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.channelNum(alphaWs, "C02ENG"))));

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(ConversationMachine, (m) => m.send({ type: "openChannel", workspace: alphaWs, channel: generalNum, kind: "PublicChannel", front: true })));
      await app.runtime.runPromise(Effect.flatMap(ComposerMachine, (m) => m.send({ type: "openTarget", workspace: alphaWs, channel: generalNum, threadTs: 0 }, "Owner")));
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.channel === generalNum && s.newestLoaded);
    expect(app.host.textContent).toContain("Sprint review kicks off at 2pm today.");
    expect(app.host.textContent).toContain("2 replies");

    await underAct(() => {
      findButton(app.host, "2 replies").click();
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.threadTs > 0 && s.threadLoaded);
    expect(app.host.textContent).toContain("I will share the latency benchmarks right before.");
    expect(app.host.textContent).toContain("Design slides are linked in the doc.");

    const convInThread = await app.runtime.runPromise(Effect.flatMap(ConversationMachine, (m) => m.get()));
    await waitFor(app.runtime, Effect.map(ComposerMachine, (m) => m.changes), (s) => s.active.threadTs === convInThread.threadTs);
    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(ComposerMachine, (m) => m.send({ type: "toggleBroadcast", on: true }, "Owner")));
      await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.setDraftText({ workspace: alphaWs, channel: generalNum, threadTs: convInThread.threadTs }, "Joining with updated metrics!"))));
      await app.runtime.runPromise(Effect.flatMap(ComposerMachine, (m) => m.send({ type: "typeDraft", empty: false }, "Owner")));
      await app.runtime.runPromise(Effect.flatMap(ComposerMachine, (m) => m.send({ type: "send" }, "Owner")));
    });
    await waitFor(app.runtime, Effect.map(ComposerMachine, (m) => m.changes), (s) => s.sendOp.outcome === "Confirmed");
    const postReqs = await controlRequests("/api/chat.postMessage");
    expect(postReqs.length).toBeGreaterThanOrEqual(1);
    const lastPost = postReqs.at(-1);
    expect(lastPost?.headers["idempotency-key"]).toBeTruthy();
    expect(lastPost?.body).toMatchObject({ channel: "C01GENERAL", text: "Joining with updated metrics!", reply_broadcast: true });

    await underAct(async () => {
      expect(await app.runtime.runPromise(slackBack)).toBe(true);
      expect(await app.runtime.runPromise(slackBack)).toBe(true);
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.channel === 0 && s.threadTs === 0);

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(ConversationMachine, (m) => m.send({ type: "openChannel", workspace: alphaWs, channel: engNum, kind: "PublicChannel", front: true })));
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.channel === engNum && s.newestLoaded);
    const markReqs = await controlRequests("/api/conversations.mark");
    expect(markReqs.some((r) => (r.body as { readonly channel?: string } | undefined)?.channel === "C02ENG")).toBe(true);

    const ownTsNum = await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.tsNum(alphaWs, engNum, "1730000200.000100"))));
    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.setPendingEdit(alphaWs, engNum, ownTsNum, "Shipping the new HTTP client layer today (updated)."))));
      await app.runtime.runPromise(Effect.flatMap(ConversationMachine, (m) => m.send({ type: "startEdit", ts: ownTsNum })));
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.opKind === "EditMsg" && s.op.outcome === "Confirmed");
    expect(app.host.textContent).toContain("Shipping the new HTTP client layer today (updated).");
    expect(app.host.textContent).toContain("edited");

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(ConversationMachine, (m) => m.send({ type: "toggleReact", ts: ownTsNum, emoji: "thumbsup", add: true })));
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.opKind === "ToggleReact" && s.op.outcome === "Confirmed");
    expect((await controlRequests("/api/reactions.add")).length).toBe(1);

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(ConversationMachine, (m) => m.send({ type: "askDelete", ts: ownTsNum })));
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.deleteReview.showing);
    expect((await controlRequests("/api/chat.delete")).length).toBe(0);
    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(ConversationMachine, (m) => m.send({ type: "confirmDelete" })));
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.opKind === "DeleteMsg" && s.op.outcome === "Confirmed");
    expect((await controlRequests("/api/chat.delete")).length).toBe(1);
    expect(app.host.textContent).not.toContain("Shipping the new HTTP client layer today (updated).");

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(WorkspacesMachine, (m) => m.send({ type: "toggleMute", channel: engNum, muted: true })));
    });
    await waitFor(app.runtime, Effect.map(WorkspacesMachine, (m) => m.changes), (s) => s.mutedChannels.includes(engNum));
    expect((await controlRequests("/api/conversations.setMute")).length).toBe(1);
  });

  // spec/app/slack/agent.md, "Ambient context is emitted ONLY for a connected workspace when non-sensitive and allowed by `SlackContext`, bounded to 15 messages and 6000 characters, with zero secrets"; spec/app/slack/agent.md, "Workspace-scoped direct reads and staged drafts never mutate state or send"; spec/app/slack/notices.md, "Own, muted and currently visible front target messages are suppressed; DMs, channel mentions and participated thread replies trigger"
  it("gates Ask Alpha ambient context, stages drafts without sending, handles 429 Retry-After, and streams live SSE notices with mute suppression", async () => {
    const app = await mountSlack(provider.origin);
    expect(await app.runtime.runPromise(slackAmbientSnapshot)).toBeUndefined();

    const alphaWs = await connectWorkspaceViaPkce(app, "T01ALPHA");
    const generalNum = await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.channelNum(alphaWs, "C01GENERAL"))));
    const engNum = await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.channelNum(alphaWs, "C02ENG"))));

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(ConversationMachine, (m) => m.send({ type: "openChannel", workspace: alphaWs, channel: generalNum, kind: "PublicChannel", front: true })));
      await app.runtime.runPromise(Effect.flatMap(ComposerMachine, (m) => m.send({ type: "openTarget", workspace: alphaWs, channel: generalNum, threadTs: 0 }, "Owner")));
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.channel === generalNum && s.newestLoaded);

    await waitFor(app.runtime, Effect.map(AgentMachine, (m) => m.changes), (s) => s.pane === "ChannelPane" && !s.shareAllowed);
    expect(await app.runtime.runPromise(slackAmbientSnapshot)).toBeUndefined();

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(Preferences.Machine, (m) => m.send({ type: "start", at: 1, kept: "Light", keptLegible: false, readable: true, look: "LightLook" }, "Phone")));
      const prefState = await app.runtime.runPromise(Effect.flatMap(Preferences.Machine, (m) => m.get()));
      await app.runtime.runPromise(Effect.flatMap(Preferences.Machine, (m) => m.send({
        type: "documentRead",
        docRead: prefState.document.read.ticket,
        readable: true,
        askFirst: false,
        images: true,
        shares: ["SlackContext"],
      }, "Phone")));
    });
    await waitFor(app.runtime, Effect.map(AgentMachine, (m) => m.changes), (s) => s.pane === "ChannelPane" && s.shareAllowed);
    const ambient = await app.runtime.runPromise(slackAmbientSnapshot);
    expect(ambient).toBeDefined();
    expect(ambient?.workspaceId).toBe("T01ALPHA");
    expect(ambient?.channelId).toBe("C01GENERAL");
    expect(ambient?.messages.length).toBeLessThanOrEqual(15);
    expect(ambient?.charCount).toBeLessThanOrEqual(6000);
    expect(JSON.stringify(ambient)).not.toContain("xoxp-");

    const wsRead = await app.runtime.runPromise(executeSlackAgentRequest({ type: "SlackListWorkspaces" }));
    expect(wsRead.ok).toBe(true);

    const postsBeforeDraft = (await controlRequests("/api/chat.postMessage")).length;
    await underAct(async () => {
      const staged = await app.runtime.runPromise(executeSlackAgentRequest({
        type: "SlackDraftMessage",
        turn: 1,
        workspace: alphaWs,
        channel: generalNum,
        text: "Drafted by Alpha — ready for your review.",
      }));
      expect(staged).toMatchObject({ ok: true, kind: "draft-staged" });
    });
    await waitFor(app.runtime, Effect.map(ComposerMachine, (m) => m.changes), (s) => s.slot.author === "AlphaWrote");
    expect(app.host.textContent).toContain("Alpha's draft · not sent");
    expect(app.host.textContent).toContain("Drafted by Alpha — ready for your review.");
    expect((await controlRequests("/api/chat.postMessage")).length).toBe(postsBeforeDraft);

    await underAct(() => {
      findButton(app.host, "Send").click();
    });
    await waitFor(app.runtime, Effect.map(ComposerMachine, (m) => m.changes), (s) => s.sendOp.outcome === "Confirmed");
    const postReqs = await controlRequests("/api/chat.postMessage");
    expect(postReqs.length).toBe(postsBeforeDraft + 1);
    expect(postReqs.at(-1)?.headers["idempotency-key"]).toBeTruthy();

    await controlPost("/__control/fault", { path: "/api/conversations.history", status: 429, retryAfter: 7, remaining: 1 });
    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(ConversationMachine, (m) => m.send({ type: "openChannel", workspace: alphaWs, channel: engNum, kind: "PublicChannel", front: true })));
    });
    await waitFor(app.runtime, Effect.map(ConversationMachine, (m) => m.changes), (s) => s.channel === engNum && s.channelRead.status === "Failed");
    expect(app.host.textContent).toContain("Rate limited — retry after 7s");

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(WorkspacesMachine, (m) => m.send({ type: "toggleMute", channel: engNum, muted: true })));
    });
    await waitFor(app.runtime, Effect.map(NoticesMachine, (m) => m.changes), (s) => s.mutedChannels.includes(engNum) && (s.watermarks[alphaWs] ?? 0) > 0);

    await controlPost("/__control/inject", {
      team_id: "T01ALPHA",
      channel: "C02ENG",
      user: "U03DEVON",
      text: "<@U01OWNER> muted channel ping",
    });
    await controlPost("/__control/inject", {
      team_id: "T01ALPHA",
      channel: "C01GENERAL",
      user: "U02MAYA",
      text: "<@U01OWNER> live mention in general!",
    });
    const noticed = await waitFor(
      app.runtime,
      Effect.map(NoticesMachine, (m) => m.changes),
      (s) => s.up.some((p) => p.target.workspace === alphaWs && p.target.channel === generalNum),
    );
    expect(noticed.up.some((p) => p.target.channel === engNum)).toBe(false);
    expect(noticed.up.some((p) => p.target.channel === generalNum)).toBe(true);

    const card = await app.runtime.runPromise(slackHomeCard);
    expect(card.standing).toBe("Ready");
  });

  // spec/app/slack/auth.md, "Revoking or signing out one workspace wipes only that workspace and leaves other workspaces connected"; spec/app/slack/notices.md, "Per-workspace isolation, baseline gating, withdrawal on visible read and isolated workspace revocation"
  it("isolates per-workspace revocation to the revoked workspace and calls auth.revoke on explicit sign-out", async () => {
    const app = await mountSlack(provider.origin);
    const alphaWs = await connectWorkspaceViaPkce(app, "T01ALPHA");
    const designWs = await connectWorkspaceViaPkce(app, "T02DESIGN");

    await waitFor(
      app.runtime,
      Effect.map(NoticesMachine, (m) => m.changes),
      (s) => s.connected.includes(alphaWs) && s.connected.includes(designWs) && (s.watermarks[alphaWs] ?? 0) > 0,
    );

    const generalNum = await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.channelNum(alphaWs, "C01GENERAL"))));
    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.setDraftText({ workspace: alphaWs, channel: generalNum, threadTs: 0 }, "alpha secret draft"))));
    });

    await controlPost("/__control/revoke", { team_id: "T01ALPHA" });
    await waitFor(
      app.runtime,
      Effect.map(AuthMachine, (m) => m.changes),
      (s) => !s.connected.some((w) => w.workspace === alphaWs) && s.connected.some((w) => w.workspace === designWs),
    );
    await waitFor(
      app.runtime,
      Effect.map(WorkspacesMachine, (m) => m.changes),
      (s) => !s.connected.some((w) => w.workspace === alphaWs) && s.selected.workspace === designWs && s.list.status === "Loaded",
    );

    const alphaSessionAfter = await app.runtime.runPromise(Effect.flatMap(MessagingSessions, (s) => s.get(slackSessionKey("T01ALPHA"))));
    const designSessionAfter = await app.runtime.runPromise(Effect.flatMap(MessagingSessions, (s) => s.get(slackSessionKey("T02DESIGN"))));
    expect(Option.isNone(alphaSessionAfter)).toBe(true);
    expect(Option.isSome(designSessionAfter)).toBe(true);
    const alphaDraftAfter = await app.runtime.runPromise(Effect.flatMap(SlackLedger, (l) => Effect.sync(() => l.draftText({ workspace: alphaWs, channel: generalNum, threadTs: 0 }))));
    expect(alphaDraftAfter).toBe("");
    expect(app.host.textContent).toContain("critique");

    await underAct(async () => {
      await app.runtime.runPromise(Effect.flatMap(AuthMachine, (m) => m.send({ type: "signOutWorkspace", workspace: designWs })));
    });
    await waitFor(app.runtime, Effect.map(AuthMachine, (m) => m.changes), (s) => s.connected.length === 0);
    await waitFor(app.runtime, Effect.map(WorkspacesMachine, (m) => m.changes), (s) => s.connected.length === 0);

    const revokeReqs = await controlRequests("/api/auth.revoke");
    expect(revokeReqs.length).toBeGreaterThanOrEqual(1);
    const designSessionFinal = await app.runtime.runPromise(Effect.flatMap(MessagingSessions, (s) => s.get(slackSessionKey("T02DESIGN"))));
    expect(Option.isNone(designSessionFinal)).toBe(true);
    const finalWs = await app.runtime.runPromise(Effect.flatMap(WorkspacesMachine, (m) => m.get()));
    expect(attention(finalWs).standing).toBe("SignedOut");
    expect(app.host.textContent).toContain("Connect Slack");
  });
});
