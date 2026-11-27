// spec/app/account/session.md, "Story: Hold the account signed in"; spec/app/account/signIn.md, "Story: Choose how to sign in"; spec/app/account/plan.md, "Story: Know my plan"; spec/app/account/billing.md, "Story: Pay in the browser"; spec/app/account/google.md, "Story: See my Google accounts"
import type { BillingSnapshot, PlanOffer, Referral } from "@elizaos/cloud";
import type { AgentEvents, AgentStatus, ElizaAgentPlugin, ElizaCloudPlugin, ElizaSignInPlugin, NativeCloudRequest } from "@elizaos/os-bridges";
import { Effect, Layer } from "effect";
import { TestClock } from "effect/testing";
import type { InvoicePage } from "../../src/account/bridge.vibe";
import { type Platform, phonePlatform } from "../../src/platform/platform.vibe";
import { type Faked, plugIn, plugin, rejection } from "./phone.ts";
import { type Route, answering } from "./routes.ts";

/** Mutable Google account entry served by the fake Cloud Google endpoints. */
export interface FakeGoogleEntry {
  readonly connected: boolean;
  readonly identity: { readonly email: string } | null;
  readonly grantedCapabilities: readonly string[];
  readonly connectionId: string | null;
  readonly linkedAt: string | null;
}

/** Mutable boundary state driving the fake native plugins and Cloud routes for Account tests. */
export interface AccountScene {
  now: number;
  online: boolean;
  signedIn: boolean;
  userId: string;
  organizationId: string;
  credentialId: string;
  email: string;
  phone: string | null;
  name: string;
  keyExpiresAt: number;
  methods: { readonly email: boolean; readonly sms: boolean; readonly google: boolean };
  nextCodeRequiresSecondFactor: "totp" | "sms" | null;
  expectedCode: string;
  expectedSecondCode: string;
  signInCancelledAttempts: number[];
  signOutCalls: number;
  sentPhones: string[];
  sentEmails: string[];
  openedExternalUrls: string[];
  snapshot: BillingSnapshot;
  snapshotStatus: number;
  offers: PlanOffer[];
  invoices: InvoicePage["invoices"];
  checkoutStatus: "open" | "completed" | "expired";
  confirmCheckoutStatus: "open" | "completed" | "expired";
  planChangeOutcome: "succeeded" | "awaiting_payment" | "rejected";
  referral: Referral;
  redeemOutcome: "ok" | "invalid" | "unavailable";
  applyReferralStatus: number;
  googleAccounts: FakeGoogleEntry[];
  disconnectedGrantIds: string[];
  agentConsentCalls: Array<{ readonly gmailChanges: boolean; readonly calendarEdits: boolean }>;
  agentConsentRefused: boolean;
  agentState: "running" | "stopped" | "failed" | "unavailable";
  agentFailure: "storage" | undefined;
  agentStartFailuresLeft: number;
  agentStopRefused: boolean;
  retainedRecords: number;
  archivedRecords: number;
  emitSignInSettled?: (receipt: unknown) => void;
  emitAgentStatus?: (status: AgentStatus) => void;
}

/** Builds a default BillingSnapshot for a given plan key, balance, and clock time. */
export function makeSnapshot(options: {
  readonly nowMs: number;
  readonly planKey?: "free" | "plus_monthly" | "pro_monthly";
  readonly source?: "subscription" | "grant" | "free";
  readonly balanceUsdMicros?: number;
  readonly cancelAtPeriodEnd?: boolean;
  readonly revision?: number;
  readonly granted?: number;
  readonly available?: number;
}): BillingSnapshot {
  const planKey = options.planKey ?? "plus_monthly";
  const source = options.source ?? (planKey === "free" ? "free" : "subscription");
  const periodStart = options.nowMs - 86_400_000;
  const periodEnd = options.nowMs + 30 * 86_400_000;
  const revision = options.revision ?? 1;
  const cancelAtPeriodEnd = options.cancelAtPeriodEnd ?? false;
  const hasSub = source === "subscription" && planKey !== "free";
  const balanceUsdMicros = options.balanceUsdMicros ?? 0;
  const funded = hasSub || source === "grant" || balanceUsdMicros > 0;
  const lane = hasSub || source === "grant" ? "allowanceThenCredits" : balanceUsdMicros > 0 ? "creditsOnly" : "refused";
  const granted = options.granted ?? 1000;
  const available = options.available ?? 600;
  return {
    schemaVersion: 3,
    observedAt: options.nowMs,
    account: { status: "active" },
    balance: { usdMicros: balanceUsdMicros, revision: 1 },
    plan: { key: planKey, source, effectiveUntil: hasSub || source === "grant" ? periodEnd : null },
    subscription: hasSub ? {
      id: "sub-1",
      planKey,
      status: "active",
      periodStart,
      periodEnd,
      cancelAtPeriodEnd,
      pendingPlanKey: null,
      dunningEndsAt: null,
      revision,
      control: { action: cancelAtPeriodEnd ? "undo" : "cancel", eligible: true, expectedSubscriptionRevision: revision },
    } : null,
    grant: source === "grant" && planKey !== "free" ? {
      id: "grant-1",
      planKey,
      family: "promo",
      effectiveFrom: periodStart,
      effectiveUntil: periodEnd,
      revoked: false,
    } : null,
    allowance: funded ? {
      state: "open",
      granted,
      adjustment: 0,
      available,
      reserved: 0,
      settled: granted - available,
      expired: 0,
      clawedBack: 0,
      periodStart,
      resetsAt: periodEnd,
    } : null,
    funding: { inference: lane, speech: lane, maps: lane },
  };
}

/** Creates a fresh AccountScene with realistic defaults for Account journeys. */
export function accountScene(overrides: Partial<AccountScene> = {}): AccountScene {
  const now = overrides.now ?? 1_700_000_000_000;
  return {
    now,
    online: true,
    signedIn: true,
    userId: "user-1",
    organizationId: "org-1",
    credentialId: "cred-1",
    email: "owner@alpha.test",
    phone: null,
    name: "Owner",
    keyExpiresAt: now + 30 * 86_400_000,
    methods: { email: true, sms: true, google: true },
    nextCodeRequiresSecondFactor: null,
    expectedCode: "123456",
    expectedSecondCode: "654321",
    signInCancelledAttempts: [],
    signOutCalls: 0,
    sentPhones: [],
    sentEmails: [],
    openedExternalUrls: [],
    snapshot: makeSnapshot({ nowMs: now, planKey: "plus_monthly", source: "subscription" }),
    snapshotStatus: 200,
    offers: [
      { key: "plus_monthly", name: "Alpha Plus", amountCents: 2000, currency: "usd", interval: "month", allowance: { amountUsd: "20" } },
      { key: "pro_monthly", name: "Alpha Pro", amountCents: 6000, currency: "usd", interval: "month", allowance: { amountUsd: "80" } },
    ],
    invoices: [
      { id: "inv-1", number: "INV-001", date: now - 86_400_000, status: "paid", amountDueCents: 2000, amountPaidCents: 2000, currency: "usd", hostedInvoiceUrl: "https://stripe.test/inv/1" },
    ],
    checkoutStatus: "open",
    confirmCheckoutStatus: "completed",
    planChangeOutcome: "succeeded",
    referral: { code: "ALPHA-REF", total_referrals: 2, is_active: true },
    redeemOutcome: "ok",
    applyReferralStatus: 200,
    googleAccounts: [
      {
        connected: true,
        identity: { email: "owner@gmail.com" },
        grantedCapabilities: ["google.basic_identity", "google.gmail.triage", "google.gmail.mailbox", "google.gmail.manage", "google.gmail.send", "google.calendar.read", "google.calendar.write"],
        connectionId: "conn-1",
        linkedAt: "2026-01-01T00:00:00Z",
      },
    ],
    disconnectedGrantIds: [],
    agentConsentCalls: [],
    agentConsentRefused: false,
    agentState: "running",
    agentFailure: undefined,
    agentStartFailuresLeft: 0,
    agentStopRefused: false,
    retainedRecords: 0,
    archivedRecords: 0,
    ...overrides,
  };
}

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (one) => String.fromCharCode(one)).join(""));

function accountCloudRoutes(scene: AccountScene): Route[] {
  return [
    (req, url) => (req.method === "GET" && url.pathname === "/api/v1/user"
      ? Response.json({
        success: true,
        data: {
          id: scene.userId,
          email: scene.email,
          ...(scene.phone === null ? {} : { phone: scene.phone }),
          name: scene.name,
          organization_id: scene.organizationId,
          organization: { id: scene.organizationId, name: scene.name },
        },
      })
      : undefined),
    (req, url) => (req.method === "DELETE" && url.pathname === "/api/v1/api-keys/current" ? new Response(null, { status: 204 }) : undefined),
    (req, url) => {
      if (req.method !== "GET" || url.pathname !== "/api/v1/billing/limits") return undefined;
      if (scene.snapshotStatus !== 200) return Response.json({ error: { code: "credential_invalid", reason: "token_revoked" } }, { status: scene.snapshotStatus });
      return Response.json({ data: scene.snapshot });
    },
    (req, url) => (req.method === "GET" && url.pathname === "/api/v1/subscriptions/plans" ? Response.json({ plans: scene.offers }) : undefined),
    (req, url) => (req.method === "GET" && url.pathname === "/api/v1/billing/invoices" ? Response.json({ invoices: scene.invoices, nextCursor: null }) : undefined),
    (req, url) => {
      if (req.method !== "POST" || url.pathname !== "/api/v1/subscriptions/checkout") return undefined;
      if (scene.checkoutStatus === "open") {
        return Response.json({ status: "open", commandId: "cmd-chk-1", checkoutUrl: "https://checkout.stripe.test/session/cs_1", sessionId: "cs_1", expiresAt: scene.now + 3_600_000 });
      }
      return Response.json({ status: scene.checkoutStatus, commandId: "cmd-chk-1" });
    },
    (req, url) => {
      if (req.method !== "POST" || url.pathname !== "/api/v1/subscriptions/checkout/confirm") return undefined;
      if (scene.confirmCheckoutStatus === "completed") {
        scene.snapshot = makeSnapshot({ nowMs: scene.now, planKey: "pro_monthly", source: "subscription" });
        return Response.json({ status: "completed", commandId: "cmd-chk-1" });
      }
      return Response.json({ status: scene.confirmCheckoutStatus, commandId: "cmd-chk-1", checkoutUrl: "https://checkout.stripe.test/session/cs_1", sessionId: "cs_1", expiresAt: scene.now + 3_600_000 });
    },
    (req, url) => (req.method === "POST" && url.pathname === "/api/v1/subscriptions/portal" ? Response.json({ url: "https://billing.stripe.test/portal" }) : undefined),
    (req, url) => {
      if (req.method !== "POST" || (url.pathname !== "/api/v1/subscriptions/upgrade/review" && url.pathname !== "/api/v1/subscriptions/downgrade/review")) return undefined;
      const upgrade = url.pathname.includes("upgrade");
      return Response.json({
        quoteId: upgrade ? "quote-up-1" : "quote-down-1",
        review: {
          kind: upgrade ? "upgrade_estimate" : "downgrade_estimate",
          targetPlanKey: upgrade ? "pro_monthly" : "plus_monthly",
          dueNow: { amountDueCents: upgrade ? 4000 : 0 },
          recurringEstimate: { amountDueCents: upgrade ? 6000 : 2000 },
          effectiveAt: scene.now,
          expiresAt: scene.now + 600_000,
        },
      });
    },
    (req, url) => {
      if (req.method !== "POST" || (url.pathname !== "/api/v1/subscriptions/upgrade/confirm" && url.pathname !== "/api/v1/subscriptions/downgrade/confirm")) return undefined;
      const upgrade = url.pathname.includes("upgrade");
      if (scene.planChangeOutcome === "succeeded") {
        scene.snapshot = makeSnapshot({ nowMs: scene.now, planKey: upgrade ? "pro_monthly" : "plus_monthly", source: "subscription", revision: (scene.snapshot.subscription?.revision ?? 1) + 1 });
      }
      return Response.json({
        commandId: "cmd-chg-1",
        kind: upgrade ? "upgrade" : "downgrade",
        subscriptionId: "sub-1",
        status: scene.planChangeOutcome,
        expectedRevision: scene.snapshot.subscription?.revision ?? 1,
        resultRevision: scene.planChangeOutcome === "succeeded" ? (scene.snapshot.subscription?.revision ?? 1) : null,
        createdAt: scene.now,
      });
    },
    (req, url) => (req.method === "POST" && url.pathname.endsWith("/payment") ? Response.json({ url: "https://invoice.stripe.test/pay/1" }) : undefined),
    (req, url) => {
      if (req.method !== "POST" || url.pathname !== "/api/v1/subscriptions/cancel") return undefined;
      const rev = (scene.snapshot.subscription?.revision ?? 1) + 1;
      scene.snapshot = makeSnapshot({ nowMs: scene.now, planKey: scene.snapshot.plan.key, source: "subscription", cancelAtPeriodEnd: true, revision: rev });
      return Response.json({ commandId: "cmd-cancel-1", kind: "cancel", subscriptionId: "sub-1", status: "succeeded", expectedRevision: rev - 1, resultRevision: rev, createdAt: scene.now });
    },
    (req, url) => (req.method === "GET" && url.pathname === "/api/v1/subscriptions/cancel/undo/review"
      ? Response.json({ kind: "renewal_estimate", quoteId: "quote-undo-1", subscriptionId: "sub-1", expectedSubscriptionRevision: scene.snapshot.subscription?.revision ?? 1, planKey: "plus_monthly", renewalAt: scene.now + 30 * 86_400_000, amountDueCents: 2000, currency: "usd", observedAt: scene.now, expiresAt: scene.now + 600_000 })
      : undefined),
    (req, url) => {
      if (req.method !== "POST" || url.pathname !== "/api/v1/subscriptions/cancel/undo") return undefined;
      const rev = (scene.snapshot.subscription?.revision ?? 1) + 1;
      scene.snapshot = makeSnapshot({ nowMs: scene.now, planKey: scene.snapshot.plan.key, source: "subscription", cancelAtPeriodEnd: false, revision: rev });
      return Response.json({ commandId: "cmd-undo-1", kind: "undo", subscriptionId: "sub-1", status: "succeeded", expectedRevision: rev - 1, resultRevision: rev, createdAt: scene.now });
    },
    (req, url) => {
      if (req.method !== "POST" || url.pathname !== "/api/v1/subscription/redeem") return undefined;
      if (scene.redeemOutcome === "invalid") return Response.json({ error: { code: "invalid_code" } }, { status: 400 });
      if (scene.redeemOutcome === "unavailable") return Response.json({ error: { code: "service_unavailable" } }, { status: 503 });
      return Response.json({
        replayed: false,
        grant: { id: "grant-redeem-1", planKey: "plus_monthly", family: "gift", effectiveFrom: scene.now, effectiveUntil: 4_102_444_800_000, revoked: false },
        entitlement: { plan: { key: "plus_monthly", source: "grant", effectiveUntil: 4_102_444_800_000 } },
      });
    },
    (req, url) => (req.method === "GET" && url.pathname === "/api/v1/referrals" ? Response.json(scene.referral) : undefined),
    (req, url) => {
      if (req.method !== "POST" || url.pathname !== "/api/v1/referrals/apply") return undefined;
      if (scene.applyReferralStatus !== 200) return Response.json({ error: { code: "referral_error" } }, { status: scene.applyReferralStatus });
      return Response.json({ success: true });
    },
    (req, url) => (req.method === "GET" && url.pathname === "/api/v1/eliza/google/accounts" ? Response.json(scene.googleAccounts) : undefined),
    (req, url) => (req.method === "POST" && url.pathname === "/api/v1/eliza/google/connect/initiate" ? Response.json({ authUrl: "https://accounts.google.test/oauth/consent" }) : undefined),
    (req, url) => {
      if (req.method !== "POST" || url.pathname !== "/api/v1/eliza/google/disconnect") return undefined;
      return req.json().catch(() => ({})).then((raw) => {
        const body = raw as { grantId?: string };
        const grantId = body.grantId ?? "";
        scene.disconnectedGrantIds.push(grantId);
        scene.googleAccounts = scene.googleAccounts.filter((item) => item.connectionId !== grantId);
        return Response.json({ ok: true });
      });
    },
  ];
}

function accountPlugins(scene: AccountScene): Record<string, Faked> {
  const cloudAnswer = answering(accountCloudRoutes(scene));
  let attemptCounter = 0;
  let requestCounter = 0;
  const activeAttempts = new Map<number, { secondFactorPending: boolean }>();

  const elizaSignInFake = plugin<ElizaSignInPlugin, { signInSettled: unknown }>((emit) => {
    scene.emitSignInSettled = (receipt) => emit("signInSettled", receipt);
    const currentAccount = () => scene.signedIn
      ? { signedIn: true, userId: scene.userId, organizationId: scene.organizationId, credentialId: scene.credentialId, keyExpiresAt: scene.keyExpiresAt }
      : { signedIn: false };
    const startCode = () => {
      requestCounter += 1;
      attemptCounter += 1;
      activeAttempts.set(attemptCounter, { secondFactorPending: false });
      return Promise.resolve({
        request: requestCounter,
        attempt: attemptCounter,
        verdict: "code-on-its-way",
        expiresAt: scene.now + 600_000,
        resendAt: scene.now + 60_000,
      });
    };
    return {
      startEmail: ({ email }) => {
        scene.sentEmails.push(email);
        return startCode();
      },
      startPhone: ({ phone }) => {
        scene.sentPhones.push(phone);
        if (!/^\+\d{7,15}$/.test(phone)) {
          requestCounter += 1;
          attemptCounter += 1;
          return Promise.resolve({ request: requestCounter, attempt: attemptCounter, verdict: "try-again", retry: "invalid-input" });
        }
        return startCode();
      },
      startGoogle: () => startCode(),
      upgradeMailLease: () => Promise.resolve({ request: ++requestCounter, attempt: ++attemptCounter, verdict: "account-confirmed" }),
      cancelMailLeaseUpgrade: () => Promise.resolve({ cancelled: true }),
      reauthenticate: () => startCode(),
      resend: ({ attempt }) => Promise.resolve({ request: ++requestCounter, attempt, verdict: "code-on-its-way", expiresAt: scene.now + 600_000, resendAt: scene.now + 60_000 }),
      verify: ({ attempt, code, method }) => {
        requestCounter += 1;
        const entry = activeAttempts.get(Number(attempt));
        if (!entry) return Promise.resolve({ request: requestCounter, attempt, verdict: "try-again", retry: "expired" });
        if (method !== undefined || entry.secondFactorPending) {
          if (String(code) !== scene.expectedSecondCode) {
            return Promise.resolve({ request: requestCounter, attempt, verdict: "try-again", retry: "wrong-code" });
          }
          scene.signedIn = true;
          return Promise.resolve({ request: requestCounter, attempt, verdict: "signed-in-as", credentialId: scene.credentialId, google: "not-requested" });
        }
        if (String(code) !== scene.expectedCode) {
          return Promise.resolve({ request: requestCounter, attempt, verdict: "try-again", retry: "wrong-code" });
        }
        if (scene.nextCodeRequiresSecondFactor !== null) {
          entry.secondFactorPending = true;
          return Promise.resolve({ request: requestCounter, attempt, verdict: "factor-asked", factors: [scene.nextCodeRequiresSecondFactor], expiresAt: scene.now + 600_000 });
        }
        scene.signedIn = true;
        return Promise.resolve({ request: requestCounter, attempt, verdict: "signed-in-as", credentialId: scene.credentialId, google: "not-requested" });
      },
      sendFactorCode: ({ attempt }) => Promise.resolve({ attempt }),
      cancel: ({ attempt }) => {
        scene.signInCancelledAttempts.push(Number(attempt));
        activeAttempts.delete(Number(attempt));
        return Promise.resolve({ cancelled: true });
      },
      signOut: () => {
        scene.signOutCalls += 1;
        scene.signedIn = false;
        return Promise.resolve({ account: { signedIn: false } });
      },
      status: ({ environment }) => Promise.resolve({
        environment,
        methodsKnown: true,
        email: scene.methods.email,
        sms: scene.methods.sms,
        google: scene.methods.google,
        googleMode: "browser",
        account: currentAccount(),
      }),
      serviceInfo: ({ environment }) => Promise.resolve({ environment, outcome: "service_unavailable" }),
    };
  });

  const elizaCloudFake = plugin<ElizaCloudPlugin>(() => ({
    async request({ method, target, headers, body }: NativeCloudRequest) {
      if (!scene.signedIn) throw rejection("sign-in-required");
      const response = await cloudAnswer(new Request(new URL(target, "http://cloud.phone"), {
        method,
        headers: { ...headers, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        body,
      })).catch(() => { throw rejection("network"); });
      const etag = response.headers.get("etag");
      const contentType = response.headers.get("content-type");
      const retryAfter = response.headers.get("retry-after");
      return {
        status: response.status,
        body: toBase64(new Uint8Array(await response.arrayBuffer())),
        ...(etag === null ? {} : { etag }),
        ...(contentType === null ? {} : { contentType }),
        ...(retryAfter === null ? {} : { retryAfter }),
      };
    },
    readGrant: () => Promise.reject(rejection("grant-unknown")),
    cancel: () => Promise.resolve({ cancelled: false }),
    openExternal: ({ url }) => {
      scene.openedExternalUrls.push(url);
      return Promise.resolve({ opened: true });
    },
  }));

  const elizaAgentFake = plugin<ElizaAgentPlugin, AgentEvents>((emit) => {
    scene.emitAgentStatus = (status) => emit("status", status);
    const currentStatus = (): AgentStatus => {
      const base = { available: scene.agentState !== "unavailable", epoch: 1, requestBodyLimit: 1_048_576 } as const;
      if (scene.agentState === "failed") {
        return { ...base, state: "failed", failure: scene.agentFailure ?? "runtime" };
      }
      if (scene.agentState === "running") return { ...base, state: "running" };
      if (scene.agentState === "stopped") return { ...base, state: "stopped" };
      return { ...base, state: "unavailable" };
    };
    return {
      getStatus: () => Promise.resolve(currentStatus()),
      start: () => {
        if (scene.agentStartFailuresLeft > 0) {
          scene.agentStartFailuresLeft -= 1;
          scene.agentState = "failed";
          return Promise.resolve(currentStatus());
        }
        if (scene.agentState === "failed" && scene.agentFailure === "storage") return Promise.resolve(currentStatus());
        scene.agentState = "running";
        const now = currentStatus();
        emit("status", now);
        return Promise.resolve(now);
      },
      stop: () => {
        if (scene.agentStopRefused) return Promise.resolve(currentStatus());
        scene.agentState = "stopped";
        const now = currentStatus();
        emit("status", now);
        return Promise.resolve(now);
      },
      restart: () => {
        scene.agentState = "running";
        return Promise.resolve(currentStatus());
      },
      request: () => Promise.resolve({ status: 200, data: { ready: scene.agentState === "running" } }),
      requestStream: ({ id }) => Promise.resolve({ id }),
      abort: () => Promise.resolve({ aborted: false }),
      subscribeEvents: ({ id }) => Promise.resolve({ id }),
      unsubscribeEvents: () => Promise.resolve({ aborted: false }),
      reviewRecovery: () => Promise.resolve(scene.agentState === "failed" && scene.agentFailure === "storage" && scene.retainedRecords > 0
        ? { kind: "reviewable", reviewToken: "rec-tok-1", retainedCount: scene.retainedRecords }
        : { kind: "unavailable" }),
      archiveRecovery: ({ reviewToken }) => {
        if (reviewToken !== "rec-tok-1" || scene.retainedRecords <= 0) return Promise.resolve({ kind: "unavailable" });
        const count = scene.archivedRecords > 0 ? scene.archivedRecords : scene.retainedRecords;
        if (count >= scene.retainedRecords) {
          scene.agentFailure = undefined;
          scene.agentState = "stopped";
          scene.retainedRecords = 0;
        }
        return Promise.resolve({ kind: "archived", archivedCount: count });
      },
    };
  });

  const alphaDeviceFake: Faked = () => ({
    haptic: () => Promise.resolve(),
    recommendedTimeout: () => Promise.resolve({ timeoutMs: 5000 }),
    setSystemBarAppearance: () => Promise.resolve(),
    setAgentGoogleConsent: (consent: { gmailChanges: boolean; calendarEdits: boolean }) => {
      scene.agentConsentCalls.push(consent);
      return scene.agentConsentRefused ? Promise.reject(new Error("consent refused")) : Promise.resolve();
    },
    diagnosticsFacts: () => Promise.resolve({}),
    copyText: () => Promise.resolve(),
  });

  const elizaWiFiFake: Faked = () => ({
    getConnectivity: () => Promise.resolve({ online: scene.online, validated: scene.online, captivePortal: false }),
    connectivity: () => Promise.resolve({ online: scene.online, transport: scene.online ? "wifi" : "none" }),
  });

  return {
    ElizaSignIn: elizaSignInFake,
    ElizaCloud: elizaCloudFake,
    ElizaAgent: elizaAgentFake,
    AlphaDevice: alphaDeviceFake,
    ElizaWiFi: elizaWiFiFake,
  };
}

/** Builds a test Platform layer wired to AccountScene's native plugins, Cloud routes, and TestClock. */
export function accountPlatform(scene: AccountScene): Layer.Layer<Platform | TestClock.TestClock> {
  const plugged = Layer.effectDiscard(Effect.acquireRelease(Effect.sync(() => plugIn(accountPlugins(scene))), (unplug) => Effect.sync(unplug)));
  const platform = Layer.provide(phonePlatform(), plugged);
  const clock = Layer.provideMerge(Layer.effectDiscard(TestClock.setTime(scene.now)), TestClock.layer());
  return Layer.provideMerge(platform, clock);
}
