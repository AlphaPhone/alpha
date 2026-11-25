import { Effect, Layer, Queue, Stream } from "effect";
import { FetchHttpClient } from "effect/http";
import { afterEach, describe, expect, inject, it } from "vitest";
import { page } from "vitest/browser";
import * as Shell from "../gen/app__shell.effect.vibe";
import * as SlackWorkspaces from "../gen/app__slack.effect.vibe";
import * as SlackAuth from "../gen/app__slack__auth.effect.vibe";
import * as SlackConversation from "../gen/app__slack__conversation.effect.vibe";
import * as SlackNotices from "../gen/app__slack__notices.effect.vibe";
import * as TelegramList from "../gen/app__telegram.effect.vibe";
import * as TelegramAuth from "../gen/app__telegram__auth.effect.vibe";
import * as TelegramConversation from "../gen/app__telegram__conversation.effect.vibe";
import * as TelegramNotices from "../gen/app__telegram__notices.effect.vibe";
import { MessagingBridge } from "../src/messaging/bridge.vibe";
import { messagingSessions } from "../src/platform/messaging.vibe";
import { slackAt } from "../src/platform/slack.vibe";
import { telegramAt } from "../src/platform/telegram.vibe";
import { completeSlackOAuthCallback } from "../src/slack/auth.vibe";
import { SlackLedger } from "../src/slack/ledger.vibe";
import { closeAll, only, openOver, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { fakeWorld } from "./fakes/world.vibe";
import "../src/main.css";

const slackOrigin = inject("slackOrigin");
const telegramOrigin = inject("telegramOrigin");
const messagingMounts = only("home", "assistant", "notice", "view:Telegram", "view:Slack", "view:Settings");

afterEach(closeAll);

async function controlJson(origin: string, route: string, body?: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${origin}${route}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return (await response.json()) as Record<string, unknown>;
}

async function openMessagingAlpha() {
  const platform = fakeWorld(scene(), {
    slack: Layer.provide(slackAt(slackOrigin), FetchHttpClient.layer),
    telegram: Layer.provide(telegramAt(telegramOrigin), FetchHttpClient.layer),
    sessions: messagingSessions,
  });
  return openOver(platform, messagingMounts);
}

async function waitForSlackOAuth(
  alpha: Awaited<ReturnType<typeof openMessagingAlpha>>["alpha"],
  nonce: number,
) {
  return alpha.runtime.runPromise(
    Effect.flatMap(SlackLedger, (ledger) =>
      Stream.runHead(
        Stream.filter(
          Stream.callback<ReturnType<typeof ledger.pendingOAuth>>((queue) =>
            Effect.gen(function* () {
              Queue.offerUnsafe(queue, ledger.pendingOAuth());
              const off = ledger.subscribe(() => {
                Queue.offerUnsafe(queue, ledger.pendingOAuth());
              });
              yield* Effect.addFinalizer(() => Effect.sync(off));
            }),
          ),
          (pending) => pending !== undefined && pending.nonce === nonce,
        ),
      ),
    ),
  );
}

async function connectSlackWorkspace(
  alpha: Awaited<ReturnType<typeof openMessagingAlpha>>["alpha"],
  teamId: string,
): Promise<number> {
  await alpha.runtime.runPromise(
    Effect.flatMap(SlackLedger, (ledger) => Effect.sync(() => { ledger.setPendingTeam(teamId); })),
  );
  await alpha.runtime.runPromise(
    Effect.flatMap(SlackAuth.Machine, (m) => m.send({ type: "startConnect" })),
  );
  await expect.element(page.getByText("Review Slack user scopes")).toBeVisible();
  await expect.element(page.getByText("User account · no bot token")).toBeVisible();
  await page.getByRole("button", { name: "Approve & connect" }).click();
  await until(alpha, alpha.runtime, SlackAuth.Machine, (s) => s.step === "BrowserOAuth");
  const authState = await alpha.runtime.runPromise(Effect.flatMap(SlackAuth.Machine, (m) => m.get()));
  const pendingOpt = await waitForSlackOAuth(alpha, authState.nonce);
  if (pendingOpt._tag !== "Some" || pendingOpt.value === undefined) throw new Error("Pending Slack OAuth missing");
  const pending = pendingOpt.value;
  expect(pending.authorizeUrl).toContain("user_scope=");
  expect(pending.authorizeUrl).not.toContain("&scope=");
  expect(pending.authorizeUrl).toContain("code_challenge_method=S256");

  await fetch(`${pending.authorizeUrl}&auto_approve=1`, { redirect: "manual" });
  const providerState = await controlJson(slackOrigin, "/__control/state");
  const snapshot = (providerState.state ?? {}) as { authCodes?: Record<string, { code: string; state: string; used?: boolean }> };
  const authCodes = snapshot.authCodes ?? {};
  const matched = Object.values(authCodes).find((entry) => entry.state === pending.state && !entry.used);
  expect(matched?.code).toBeTruthy();

  await alpha.runtime.runPromise(completeSlackOAuthCallback(pending.state, matched?.code ?? ""));
  await until(alpha, alpha.runtime, SlackAuth.Machine, (s) => s.step === "Idle" && s.trouble === "Fine");
  const meta = await alpha.runtime.runPromise(
    Effect.flatMap(SlackLedger, (ledger) => Effect.sync(() => ledger.workspaceByTeamId(teamId))),
  );
  expect(meta).toBeDefined();
  const wsNum = meta?.num ?? 0;
  await until(
    alpha,
    alpha.runtime,
    SlackWorkspaces.Machine,
    (s) => s.connected.some((w) => w.workspace === wsNum) && s.list.status === "Loaded",
  );
  return wsNum;
}

describe("Messaging E2E", () => {
  // spec/app/home/tiles.md, "Story: Choose the apps on Home"; spec/app/settings/preferences.md, "Story: Decide whether Alpha asks before it acts"
  it("Home tiles and Privacy switches", async () => {
    await controlJson(telegramOrigin, "/__control/reset", {});
    await controlJson(slackOrigin, "/__control/reset", {});
    await openMessagingAlpha();

    await expect.element(page.getByRole("button", { name: "Telegram" })).toBeVisible();
    await expect.element(page.getByRole("button", { name: "Slack" })).toBeVisible();

    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("button", { name: /Privacy/i }).click();
    await expect.element(page.getByText("Telegram screen")).toBeVisible();
    await expect.element(page.getByText("Slack screen")).toBeVisible();
    const telegramSwitch = page.getByRole("switch", { name: /Telegram screen/i });
    const slackSwitch = page.getByRole("switch", { name: /Slack screen/i });
    await expect.element(telegramSwitch).toHaveAttribute("aria-checked", "true");
    await expect.element(slackSwitch).toHaveAttribute("aria-checked", "true");
    await page.getByText("Telegram screen").click();
    await expect.element(telegramSwitch).toHaveAttribute("aria-checked", "false");
    await page.getByText("Telegram screen").click();
    await expect.element(telegramSwitch).toHaveAttribute("aria-checked", "true");
  });

  // spec/app/telegram/auth.md, "Story: Sign in to my Telegram user account"; spec/app/telegram/index.md, "Story: Browse and search my Telegram chats"; spec/app/telegram/composer.md, "Story: Draft and send Telegram messages under my sole authority"; spec/app/telegram/notices.md, "Story: Hear about incoming Telegram messages without noise"
  it("Telegram full UI E2E", async () => {
    await controlJson(telegramOrigin, "/__control/reset", {});
    const { alpha } = await openMessagingAlpha();

    await page.getByRole("button", { name: /^Telegram/ }).first().click();
    await expect.element(page.getByText("Sign in to Telegram")).toBeVisible();
    await expect.element(page.getByText("User account · no bot token")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByLabelText("Phone number").fill("+15550109999");
    await page.getByRole("button", { name: "Send code" }).click();
    await until(alpha, alpha.runtime, TelegramAuth.Machine, (s) => s.step === "CodePending");

    const codeInfo = await controlJson(telegramOrigin, `/__control/last-code?phone=${encodeURIComponent("+15550109999")}`);
    const otp = typeof codeInfo.code === "string" ? codeInfo.code : "";
    expect(otp.length).toBeGreaterThan(0);
    await page.getByLabelText("Verification code").fill(otp);
    await page.getByRole("button", { name: "Verify code" }).click();
    await until(alpha, alpha.runtime, TelegramAuth.Machine, (s) => s.step === "TwoFactorRequired");

    await page.getByPlaceholder("Cloud password").fill("alpha-2fa");
    await page.getByRole("button", { name: "Unlock account" }).click();
    await until(alpha, alpha.runtime, TelegramAuth.Machine, (s) => s.step === "Authenticated");
    await until(alpha, alpha.runtime, TelegramList.Machine, (s) => s.list.status === "Loaded" && s.pages > 0);
    await expect.element(page.getByText("Maya Chen")).toBeVisible();

    await page.getByText("Maya Chen").click();
    await until(alpha, alpha.runtime, TelegramConversation.Machine, (s) => s.chat > 0 && s.read.status === "Loaded");
    await page.getByLabelText("Message").fill("Hello from Chromium E2E");
    await page.getByRole("button", { name: "Send" }).first().click();
    await expect.element(page.getByRole("log", { name: "Telegram messages" }).getByText("Hello from Chromium E2E")).toBeVisible();

    const tgRequests = await controlJson(telegramOrigin, "/__control/requests?path=/rpc/messages.sendMessage");
    const sentCalls = (tgRequests.requests ?? []) as ReadonlyArray<unknown>;
    expect(sentCalls.length).toBeGreaterThanOrEqual(1);

    await alpha.runtime.runPromise(
      Effect.flatMap(MessagingBridge, (bridge) =>
        Effect.sync(() => {
          bridge.stageDraft({
            id: "tg-browser-draft-1",
            platform: "Telegram",
            target: "Maya Chen",
            targetId: "user:2001",
            body: "Alpha Chromium Telegram draft",
            revision: 1,
            status: "draft",
          });
        }),
      ),
    );
    await alpha.runtime.runPromise(
      Effect.flatMap(Shell.Machine, (m) => m.send({ type: "raise", detent: "Full" })),
    );
    const askAlphaRegion = page.getByRole("region", { name: "Ask Alpha" });
    await expect.element(askAlphaRegion.getByText("Alpha Chromium Telegram draft")).toBeVisible();
    await askAlphaRegion.getByRole("button", { name: "Send" }).click();
    await expect.element(askAlphaRegion.getByText("Sent", { exact: true })).toBeVisible();

    await alpha.runtime.runPromise(Effect.flatMap(Shell.Machine, (m) => m.send({ type: "goHome" })));
    await expect.element(page.getByText(/Telegram/i).first()).toBeVisible();
    const cardState = await alpha.runtime.runPromise(
      Effect.flatMap(MessagingBridge, (bridge) => Effect.sync(() => bridge.snapshot().cards.Telegram)),
    );
    expect(cardState.connected).toBe(true);

    await until(alpha, alpha.runtime, TelegramNotices.Machine, (s) => s.since > 0);
    await controlJson(telegramOrigin, "/__control/inject", {
      kind: "message",
      peer: "chat:3001",
      from_id: 2001,
      message: "Live SSE ping from browser test",
    });
    await until(alpha, alpha.runtime, TelegramNotices.Machine, (s) => s.posts > 0);

    await page.getByRole("button", { name: /^Telegram/ }).first().click();
    await page.getByRole("button", { name: "Back to chats" }).click();
    await page.getByRole("button", { name: "Account options" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect.element(page.getByText("Sign out of Telegram?")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await until(alpha, alpha.runtime, TelegramAuth.Machine, (s) => s.step === "SignedOut");
    const logoutReqs = await controlJson(telegramOrigin, "/__control/requests?path=/rpc/auth.logOut");
    expect(((logoutReqs.requests ?? []) as ReadonlyArray<unknown>).length).toBeGreaterThanOrEqual(1);
  }, 60_000);

  // spec/app/slack/auth.md, "Story: Connect and manage my Slack workspaces with user tokens only"; spec/app/slack/index.md, "Story: Switch workspaces and browse Slack conversations with strict isolation"; spec/app/slack/conversation.md, "Story: Read Slack channels and threaded replies accurately"; spec/app/slack/notices.md, "Story: Hear about Slack DMs, mentions and thread replies per workspace"
  it("Slack full UI E2E", async () => {
    await controlJson(slackOrigin, "/__control/reset", {});
    const { alpha } = await openMessagingAlpha();

    await page.getByRole("button", { name: /^Slack/ }).first().click();
    await expect.element(page.getByText("Connect Slack")).toBeVisible();

    const alphaWs = await connectSlackWorkspace(alpha, "T01ALPHA");
    await expect.element(page.getByText("Alpha Team")).toBeVisible();
    await expect.element(page.getByText("general", { exact: true })).toBeVisible();

    const designWs = await connectSlackWorkspace(alpha, "T02DESIGN");
    await page.getByRole("button", { name: "Switch workspace" }).click();
    await expect.element(page.getByText("Slack workspaces")).toBeVisible();
    await page.getByText("Design Guild").click();
    await until(
      alpha,
      alpha.runtime,
      SlackWorkspaces.Machine,
      (s) => s.selected.workspace === designWs && s.list.status === "Loaded",
    );
    await expect.element(page.getByText("critique", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Switch workspace" }).click();
    await page.getByText("Alpha Team").click();
    await until(
      alpha,
      alpha.runtime,
      SlackWorkspaces.Machine,
      (s) => s.selected.workspace === alphaWs && s.list.status === "Loaded",
    );
    await page.getByText("general", { exact: true }).click();
    await until(alpha, alpha.runtime, SlackConversation.Machine, (s) => s.channel > 0 && s.channelRead.status === "Loaded");

    await alpha.runtime.runPromise(
      Effect.flatMap(MessagingBridge, (bridge) =>
        Effect.sync(() => {
          bridge.stageDraft({
            id: "sl-browser-draft-1",
            platform: "Slack",
            target: "Alpha Team · #general",
            targetId: "C01GENERAL",
            workspaceId: "T01ALPHA",
            body: "Alpha Chromium Slack draft",
            revision: 1,
            status: "draft",
          });
        }),
      ),
    );
    await alpha.runtime.runPromise(
      Effect.flatMap(Shell.Machine, (m) => m.send({ type: "raise", detent: "Full" })),
    );
    const askAlphaRegion = page.getByRole("region", { name: "Ask Alpha" });
    await expect.element(askAlphaRegion.getByText("Alpha Chromium Slack draft")).toBeVisible();
    await askAlphaRegion.getByRole("button", { name: "Send" }).click();
    await expect.element(askAlphaRegion.getByText("Sent", { exact: true })).toBeVisible();

    const slackPosts = await controlJson(slackOrigin, "/__control/requests?path=/api/chat.postMessage");
    expect(((slackPosts.requests ?? []) as ReadonlyArray<unknown>).length).toBeGreaterThanOrEqual(1);

    await alpha.runtime.runPromise(Effect.flatMap(Shell.Machine, (m) => m.send({ type: "goHome" })));
    await until(alpha, alpha.runtime, SlackNotices.Machine, (s) => Object.keys(s.watermarks).length > 0);
    await controlJson(slackOrigin, "/__control/inject", {
      kind: "message",
      team_id: "T01ALPHA",
      channel: "C02ENG",
      user: "U02MAYA",
      text: "Hey <@U01OWNER> check the Chromium Slack SSE test",
    });
    await until(alpha, alpha.runtime, SlackNotices.Machine, (s) => s.posts > 0);

    await controlJson(slackOrigin, "/__control/revoke", { team_id: "T02DESIGN" });
    await until(
      alpha,
      alpha.runtime,
      SlackAuth.Machine,
      (s) => !s.connected.some((w) => w.workspace === designWs) && s.connected.some((w) => w.workspace === alphaWs),
    );
    await page.getByRole("button", { name: /^Slack/ }).first().click();
    await page.getByRole("button", { name: "Back to conversations" }).click();
    await page.getByRole("button", { name: "Switch workspace" }).click();
    await expect.element(page.getByText("Design Guild")).not.toBeInTheDocument();
    await page.getByRole("button", { name: "Sign out Alpha Team" }).click();
    await expect.element(page.getByText("Sign out of Alpha Team?")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await until(alpha, alpha.runtime, SlackAuth.Machine, (s) => s.connected.length === 0);
    const revokeReqs = await controlJson(slackOrigin, "/__control/requests?path=/api/auth.revoke");
    expect(((revokeReqs.requests ?? []) as ReadonlyArray<unknown>).length).toBeGreaterThanOrEqual(1);
  }, 60_000);
});
