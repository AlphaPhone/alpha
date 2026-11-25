// @vitest-environment happy-dom
// spec/app/account/index.md, "Story: Have the agent running"; spec/app/account/session.md, "Story: Hold the account signed in"; spec/app/account/signIn.md, "Story: Sign in with a code"; spec/app/account/provider.md, "Story: Use my own key"; spec/app/account/binding.md, "Story: Use Cloud AI only under the current sign-in and plan"; spec/app/account/plan.md, "Story: Know my plan"; spec/app/account/billing.md, "Story: Pay in the browser"; spec/app/account/change.md, "Story: Change or cancel my plan"; spec/app/account/codes.md, "Story: Redeem a code"; spec/app/account/google.md, "Story: See my Google accounts"; spec/app/account/access.md, "Story: Decide what the agent may change in Google"; spec/app/account/outside.md, "Story: Keep the agent out of my account"; spec/app/account/records.md, "Story: Restart after a failure that kept records"
import { type Context, Effect, Layer, type ManagedRuntime, Stream } from "effect";
import { TestClock } from "effect/testing";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Resident from "../gen/app__account.effect.vibe";
import * as Access from "../gen/app__account__access.effect.vibe";
import * as Billing from "../gen/app__account__billing.effect.vibe";
import * as Binding from "../gen/app__account__binding.effect.vibe";
import * as Change from "../gen/app__account__change.effect.vibe";
import * as Codes from "../gen/app__account__codes.effect.vibe";
import * as Google from "../gen/app__account__google.effect.vibe";
import * as Outside from "../gen/app__account__outside.effect.vibe";
import * as Plan from "../gen/app__account__plan.effect.vibe";
import * as Provider from "../gen/app__account__provider.effect.vibe";
import * as Records from "../gen/app__account__records.effect.vibe";
import * as Session from "../gen/app__account__session.effect.vibe";
import * as SignIn from "../gen/app__account__signIn.effect.vibe";
import * as Pages from "../gen/app__settings.effect.vibe";
import * as Shell from "../gen/app__shell.effect.vibe";
import * as Layers from "../gen/app__shell__layers.effect.vibe";
import { AccountShelf } from "../src/account/bridge.vibe";
import accountOverlay, { AccountStatus, accountResident, accountRuntime } from "../src/account/index.tsx";
import { normalizePhoneNumber } from "../src/account/phone.ts";
import { accountLayer, openAccount } from "../src/account/profile.vibe";
import type { Alpha, Resident as RootResident } from "../src/runtime/area.tsx";
import { rooted, together, untimed, whole } from "../src/runtime/index.vibe";
import { closeAll, drawn, press, seen, underAct } from "./alpha.tsx";
import { type AccountScene, accountPlatform, accountScene, makeSnapshot } from "./fakes/account.ts";

underAct();

const disposers: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const dispose of disposers.splice(0)) await dispose();
  await closeAll();
});

async function waitFor<I, S>(
  runtime: ManagedRuntime.ManagedRuntime<I, unknown>,
  key: Context.Key<I, { readonly changes: Stream.Stream<S> }>,
  predicate: (state: S) => boolean,
) {
  await drawn(() => runtime.runPromise(Effect.flatMap(key, (machine) => Stream.runHead(Stream.filter(machine.changes, predicate)))));
}

async function bootAccount(overrides: Partial<AccountScene> = {}) {
  const scene = accountScene(overrides);
  const platform = accountPlatform(scene);
  const minimalRoot = Layer.provideMerge(
    whole(together(Shell.machine(), Layers.machine(), Pages.machine(), accountResident)),
    platform,
  );
  const root = rooted(minimalRoot);
  const alpha: Alpha = {
    runtime: root.runtime as unknown as ManagedRuntime.ManagedRuntime<RootResident, unknown>,
    over: (layer) => root.over(layer as never),
    slot: () => null,
    back: () => Promise.resolve(undefined),
    taking: () => undefined,
    dispose: root.dispose,
  };
  const OverlayScreen = accountOverlay.open(alpha, "overlay");
  const container = document.body.appendChild(document.createElement("div"));
  const reactRoot = createRoot(container);
  await drawn(async () => {
    reactRoot.render(
      <>
        <AccountStatus alpha={alpha} />
        <OverlayScreen />
      </>,
    );
    await root.runtime.runPromise(Effect.void);
  });
  disposers.push(async () => {
    await drawn(() => reactRoot.unmount());
    container.remove();
    await root.dispose();
  });
  const runtime = accountRuntime(alpha);
  const advance = async (ms: number) => {
    scene.now += ms;
    await drawn(() => root.runtime.runPromise(TestClock.adjust(ms)));
  };
  return { alpha, scene, runtime, root, advance };
}

describe("Account", () => {
  it("normalizes typed phone numbers to E.164 without guessing other countries (spec/app/account/signIn.md, \"The phone writes a typed number in international form, and leaves a number already in that form as it is\")", () => {
    expect(normalizePhoneNumber(" (415) 555-0100 ")).toBe("+14155550100");
    expect(normalizePhoneNumber("1-415-555-0100")).toBe("+14155550100");
    expect(normalizePhoneNumber("0044 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhoneNumber("+442079460958")).toBe("+442079460958");
    expect(normalizePhoneNumber(" ()- . ")).toBe("");
    expect(normalizePhoneNumber("442079460958")).toBe("442079460958");
    expect(normalizePhoneNumber("415-ABC-0100")).toBe("415ABC0100");
    for (const sample of [" (415) 555-0100 ", "0044 20 7946 0958", "+14155550100", "442079460958", "415-ABC-0100", ""]) {
      expect(normalizePhoneNumber(normalizePhoneNumber(sample))).toBe(normalizePhoneNumber(sample));
    }
  });

  it("signs in by email and E.164 phone OTP, enforces resend cooldown, and adopts Google tab return (spec/app/account/signIn.md, \"Story: Sign in with a code\")", async () => {
    const { scene, runtime, advance } = await bootAccount({ signedIn: false });
    await waitFor(runtime, Session.Machine, (s) => s.known && s.account === 0);

    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "begin", origin: "ByOwner" })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Choose" && s.sms && s.google);

    // spec/app/account/outside.md, "The agent starts nothing in the account, and a card only opens the owner's own screen"
    expect(Outside.acts("ByAgent")).toBe(false);
    expect(Outside.opens("ByAgent")).toBe(false);
    expect(SignIn.canBegin(SignIn.initial, "ByAgent")).toBe(false);

    // spec/app/account/signIn.md, "A text goes to the number in international form, an email to the address as typed, and the same number written another way waits its minute"
    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "sendCode", method: "Phone", address: "(415) 555-0100", now: untimed, online: true })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Code" && s.address === "+14155550100");
    expect(scene.sentPhones).toEqual(["+14155550100"]);

    const codeState = await runtime.runPromise(SignIn.Machine.use((m) => m.get()));
    expect(SignIn.canResend(codeState, Math.floor(scene.now / 1000), true)).toBe(false);
    await advance(61_000);
    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "resend", now: untimed, online: true })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Code" && s.attempt === 2 && s.work === "Resting");

    // spec/app/account/signIn.md, "The phone's answer hands the sign-in over, asks for a second check, counts a wrong code, or ends the attempt"
    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "checkCode", code: "000000", now: untimed, online: true })));
    await waitFor(runtime, SignIn.Machine, (s) => s.trouble === "WrongCode" && s.wrong === 1);

    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "checkCode", code: "123456", now: untimed, online: true })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Closed" && s.ended === "HandedOver");
    await waitFor(runtime, Session.Machine, (s) => s.account > 0 && s.work === "Resting" && s.how === "Phone");
    await waitFor(runtime, Resident.Machine, (s) => s.phase === "Up" && !s.forSignIn);

    // spec/app/account/signIn.md, "Story: Sign in with Google"
    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "begin", origin: "ByOwner" })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Choose" && s.google);
    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "chooseGoogle", now: untimed, online: true })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Browser" && s.tab.open);
    scene.emitSignInSettled?.({ request: 99, attempt: 99, verdict: "signed-in-as", credentialId: "cred-google-2", google: "connected" });
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Closed" && s.ended === "HandedOver");
    await waitFor(runtime, Session.Machine, (s) => s.how === "Google" && s.work === "Resting");
  });

  it("keeps stored sign-in intact when Back interrupts a code or second-factor check (spec/app/account/signIn.md, \"Story: Change my mind\")", async () => {
    const { scene, runtime } = await bootAccount({ signedIn: true, nextCodeRequiresSecondFactor: "totp" });
    await waitFor(runtime, Session.Machine, (s) => s.account > 0 && s.known && s.work === "Resting");
    const storedBefore = await runtime.runPromise(Session.Machine.use((m) => m.get()));

    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "begin", origin: "ByOwner" })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Choose" && s.readiness.status === "Loaded");
    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "sendCode", method: "Email", address: "renew@alpha.test", now: untimed, online: true })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Code");
    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "checkCode", code: "123456", now: untimed, online: true })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Second" && s.factor === "Totp");

    await runtime.runPromise(SignIn.Machine.use((m) => m.send({ type: "cancel" })));
    await waitFor(runtime, SignIn.Machine, (s) => s.step === "Choose" && s.work === "Resting");

    const storedAfter = await runtime.runPromise(Session.Machine.use((m) => m.get()));
    expect(storedAfter.account).toBe(storedBefore.account);
    expect(storedAfter.signIn).toBe(storedBefore.signIn);
    expect(scene.signOutCalls).toBe(0);
    expect(scene.signInCancelledAttempts.length).toBeGreaterThan(0);
  });

  it("adopts an offline-completed sign-in on returning to the app and wipes bound state on sign-out (spec/app/account/session.md, \"Story: Keep my sign-in across a restart\")", async () => {
    const { scene, runtime } = await bootAccount({ signedIn: false });
    await waitFor(runtime, Session.Machine, (s) => s.known && s.account === 0);

    scene.signedIn = true;
    scene.userId = "user-offline";
    scene.credentialId = "cred-offline-1";
    await seen(false);
    await seen(true);
    await waitFor(runtime, Session.Machine, (s) => s.account > 0 && s.known && s.restored);
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Member");
    await waitFor(runtime, Binding.Machine, (b) => b.status === "Bound" && b.cloud);

    // spec/app/account/session.md, "Story: Sign out"
    await runtime.runPromise(Session.Machine.use((m) => m.send({ type: "askSignOut" })));
    await runtime.runPromise(Session.Machine.use((m) => m.send({ type: "confirmSignOut", busy: false, now: untimed })));
    await waitFor(runtime, Session.Machine, (s) => s.account === 0 && s.notice === "SignedOut" && s.work === "Resting");
    await waitFor(runtime, Binding.Machine, (b) => b.status === "Unbound" && !b.cloud && b.signIn === 0);
    await waitFor(runtime, Google.Machine, (g) => g.links.length === 0);
    expect(scene.signOutCalls).toBe(1);
  });

  it("changes voice key without retyping Cerebras key and never switches to Cloud on key removal (spec/app/account/provider.md, \"Story: Use my own key\")", async () => {
    const { runtime } = await bootAccount({ signedIn: true });
    await waitFor(runtime, Provider.Machine, (p) => p.report.status === "Loaded");
    await waitFor(runtime, Resident.Machine, (r) => r.phase === "Up");

    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "openKeyForm", kind: "TextKey" })));
    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "enterKey", key: "csk-valid-key-1234" })));
    await waitFor(runtime, Provider.Machine, (p) => p.choice.showing && p.offer === "UseText");
    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "choose", busy: false, origin: "ByOwner", now: untimed })));
    await waitFor(runtime, Provider.Machine, (p) => p.mode === "OwnKey" && p.text && !p.voice && p.work === "Resting");
    await waitFor(runtime, Binding.Machine, (b) => b.status === "Bound" && !b.cloud);

    // spec/app/account/provider.md, "A confirmed change to what the agent runs on waits for a reply in flight, then holds the agent; a voice key, or a text key saved beside Cloud, is used at once"
    const residentBefore = await runtime.runPromise(Resident.Machine.use((m) => m.get()));
    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "openKeyForm", kind: "VoiceKey" })));
    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "enterKey", key: "vk-voice-key-5678" })));
    await waitFor(runtime, Provider.Machine, (p) => p.choice.showing && p.offer === "UseVoice");
    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "choose", busy: false, origin: "ByOwner", now: untimed })));
    await waitFor(runtime, Provider.Machine, (p) => p.mode === "OwnKey" && p.text && p.voice && p.work === "Resting");
    const residentAfter = await runtime.runPromise(Resident.Machine.use((m) => m.get()));
    expect(residentAfter.halt).toBe(residentBefore.halt);

    // spec/app/account/provider.md, "A key the provider accepts is kept aside and offered with what it sends; one it refuses, or that could not be checked, changes nothing"
    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "openKeyForm", kind: "VoiceKey" })));
    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "enterKey", key: "bad-key" })));
    await waitFor(runtime, Provider.Machine, (p) => p.trouble === "KeyRefused" && p.voice && p.text);
    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "closeKeyForm" })));

    // spec/app/account/provider.md, "Removing a key leaves no provider chosen rather than switching to Cloud, removing the key in use waits for a reply in flight and holds the agent, and a removal the phone could not confirm keeps the key"
    await runtime.runPromise(Provider.Machine.use((m) => m.send({ type: "removeKey", kind: "TextKey", busy: false, origin: "ByOwner", now: untimed })));
    await waitFor(runtime, Provider.Machine, (p) => p.mode === "Undecided" && !p.text && p.voice && p.work === "Resting");
  });

  it("honors the 7-day offline grace window and ends sign-in on Cloud 401 (spec/app/account/plan.md, \"Story: Know my plan\")", async () => {
    const { scene, runtime, advance } = await bootAccount({ signedIn: true });
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Member" && Plan.aiOn(p));

    const signIn = Session.currentSignIn(await runtime.runPromise(Session.Machine.use((m) => m.get())));
    scene.online = false;
    await runtime.runPromise(AccountShelf.use((s) => s.setOnline(false)));
    await runtime.runPromise(Plan.Machine.use((m) => m.send({ type: "checkNow", signIn })));
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Member");

    await advance(31 * 86_400_000);
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Lapsed");

    scene.online = true;
    await runtime.runPromise(AccountShelf.use((s) => s.setOnline(true)));
    scene.snapshot = makeSnapshot({ nowMs: scene.now, planKey: "plus_monthly", source: "subscription" });
    await runtime.runPromise(Plan.Machine.use((m) => m.send({ type: "checkNow", signIn })));
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Member" && p.kept.until > p.seen);

    const keptPlan = await runtime.runPromise(Plan.Machine.use((m) => m.get()));
    expect(keptPlan.kept.until - keptPlan.seen).toBe(Plan.graceWindow);

    scene.online = false;
    await runtime.runPromise(AccountShelf.use((s) => s.setOnline(false)));
    await runtime.runPromise(Plan.Machine.use((m) => m.send({ type: "restart", signIn, now: untimed })));
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Grace" && Plan.aiOn(p));

    await advance((Plan.graceWindow + 10) * 1000);
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Unavailable" && !Plan.aiOn(p));

    scene.online = true;
    await runtime.runPromise(AccountShelf.use((s) => s.setOnline(true)));
    scene.snapshotStatus = 401;
    await runtime.runPromise(Plan.Machine.use((m) => m.send({ type: "checkNow", signIn })));
    await waitFor(runtime, Session.Machine, (s) => s.account === 0 && s.notice === "Ended");
  });

  it("handles checkout, plan upgrade/cancel/keep quotes, gift redemption, and referrals (spec/app/account/billing.md, \"Story: Pay in the browser\")", async () => {
    const startNow = 1_700_000_000_000;
    const { scene, runtime } = await bootAccount({
      now: startNow,
      signedIn: true,
      snapshot: makeSnapshot({ nowMs: startNow, planKey: "free", source: "free", balanceUsdMicros: 0 }),
    });
    await waitFor(runtime, Session.Machine, (s) => s.account > 0);
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Unfunded");
    const signIn = Session.currentSignIn(await runtime.runPromise(Session.Machine.use((m) => m.get())));

    await runtime.runPromise(Billing.Machine.use((m) => m.send({ type: "askOffers", signIn })));
    await waitFor(runtime, Billing.Machine, (b) => b.offers.status === "Loaded");

    await runtime.runPromise(Billing.Machine.use((m) => m.send({ type: "choosePlan", tier: "Pro", signIn, standing: "Unfunded", origin: "ByOwner", elsewhere: false, now: untimed })));
    await waitFor(runtime, Billing.Machine, (b) => b.visit.open && b.goal === "Subscribe");
    await vi.waitFor(() => expect(scene.openedExternalUrls.some((u) => u.includes("checkout.stripe.test"))).toBe(true));

    await runtime.runPromise(Billing.Machine.use((m) => m.send({ type: "stopWaiting", now: untimed })));
    await waitFor(runtime, Billing.Machine, (b) => b.notice === "PlanActive" && !b.pending);
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Member" && p.tier === "Pro");

    // spec/app/account/change.md, "Story: Change or cancel my plan"
    const memberPlan = await runtime.runPromise(Plan.Machine.use((m) => m.get()));
    await runtime.runPromise(Change.Machine.use((m) => m.send({ type: "reviewChange", tier: "Plus", member: true, tierNow: "Pro", revision: memberPlan.revision, authorized: true, elsewhere: false })));
    await waitFor(runtime, Change.Machine, (c) => c.step === "Quoted" && c.change.showing);
    await runtime.runPromise(Change.Machine.use((m) => m.send({ type: "confirmChange", now: untimed, authorized: true })));
    await waitFor(runtime, Change.Machine, (c) => c.notice === "ChangesAtRenewal" && c.step === "Idle");
    await waitFor(runtime, Plan.Machine, (p) => p.standing === "Member" && p.tier === "Plus");

    const plusPlan = await runtime.runPromise(Plan.Machine.use((m) => m.get()));
    await runtime.runPromise(Change.Machine.use((m) => m.send({ type: "askCancel", member: true, ending: false, elsewhere: false })));
    await runtime.runPromise(Change.Machine.use((m) => m.send({ type: "cancelPlan", revision: plusPlan.revision, authorized: true })));
    await waitFor(runtime, Change.Machine, (c) => c.notice === "Ending");
    await waitFor(runtime, Plan.Machine, (p) => p.ending);

    const endingPlan = await runtime.runPromise(Plan.Machine.use((m) => m.get()));
    await runtime.runPromise(Change.Machine.use((m) => m.send({ type: "keepPlan", member: true, ending: true, revision: endingPlan.revision, authorized: true, elsewhere: false })));
    await waitFor(runtime, Change.Machine, (c) => c.notice === "Continues");
    await waitFor(runtime, Plan.Machine, (p) => !p.ending);

    // spec/app/account/codes.md, "Story: Redeem a code"
    await runtime.runPromise(Codes.Machine.use((m) => m.send({ type: "redeem", code: "gift-50-abc", signIn, origin: "ByOwner", elsewhere: false })));
    await waitFor(runtime, Codes.Machine, (c) => c.notice === "Redeemed");

    // spec/app/account/codes.md, "Story: Share or apply a referral"
    await runtime.runPromise(Codes.Machine.use((m) => m.send({ type: "readReferral", signIn })));
    await waitFor(runtime, Codes.Machine, (c) => c.referral.status === "Loaded");
    const shelfSnap = runtime.runSync(AccountShelf.use((s) => Effect.succeed(s.snapshot())));
    expect(shelfSnap.referral?.code).toBe("ALPHA-REF");

    await runtime.runPromise(Codes.Machine.use((m) => m.send({ type: "applyReferral", code: "FRIEND-2026", signIn, origin: "ByOwner", elsewhere: false })));
    await waitFor(runtime, Codes.Machine, (c) => c.notice === "ReferralApplied");
  });

  it("manages connected Google accounts, narrowing notices, disconnect sync pause, and agent write toggles (spec/app/account/google.md, \"Story: See my Google accounts\")", async () => {
    const { scene, runtime } = await bootAccount({ signedIn: true });
    await waitFor(runtime, Google.Machine, (g) => g.list.status === "Loaded" && g.links.length === 1);
    await waitFor(runtime, Access.Machine, (a) => a.read.status === "Loaded");
    const signIn = Session.currentSignIn(await runtime.runPromise(Session.Machine.use((m) => m.get())));
    const firstLink = (await runtime.runPromise(Google.Machine.use((m) => m.get()))).links[0];
    const firstId = firstLink.id;

    // spec/app/account/access.md, "Story: Decide what the agent may change in Google"
    scene.agentConsentCalls.length = 0;
    await runtime.runPromise(Access.Machine.use((m) => m.send({ type: "setAccess", which: "MailChanges", on: true, origin: "ByOwner" })));
    await waitFor(runtime, Access.Machine, (a) => Access.shown(a).mail && !Access.shown(a).calendar && !a.saving);
    await runtime.runPromise(Access.Machine.use((m) => m.send({ type: "setAccess", which: "CalendarEdits", on: true, origin: "ByOwner" })));
    await waitFor(runtime, Access.Machine, (a) => Access.shown(a).mail && Access.shown(a).calendar && !a.saving);
    expect(scene.agentConsentCalls).toEqual([
      { gmailChanges: true, calendarEdits: false },
      { gmailChanges: true, calendarEdits: true },
    ]);

    // spec/app/account/google.md, "Story: Connect a Google account"
    await runtime.runPromise(Google.Machine.use((m) => m.send({ type: "connect", read: true, modify: false, send: false, signIn, origin: "ByOwner", now: untimed })));
    await waitFor(runtime, Google.Machine, (g) => g.tab.open);
    expect(scene.openedExternalUrls.some((u) => u.includes("accounts.google.test"))).toBe(true);
    const existingGoogle = scene.googleAccounts[0];
    scene.googleAccounts = [{ ...existingGoogle, grantedCapabilities: ["google.basic_identity", "google.gmail.triage"] }];
    await runtime.runPromise(Google.Machine.use((m) => m.send({ type: "stopWaiting" })));
    await waitFor(runtime, Google.Machine, (g) => g.note === "Narrowed" && !Google.maySend(g, firstId));

    // spec/app/account/google.md, "Story: Disconnect a Google account"
    await runtime.runPromise(Google.Machine.use((m) => m.send({ type: "askDisconnect", account: firstId })));
    await runtime.runPromise(Google.Machine.use((m) => m.send({ type: "confirmDisconnect" })));
    await waitFor(runtime, Google.Machine, (g) => g.note === "Disconnected" && g.links.length === 0);
    expect(scene.disconnectedGrantIds).toEqual(["conn-1"]);
    const shelfAfter = runtime.runSync(AccountShelf.use((s) => Effect.succeed(s.snapshot())));
    expect(shelfAfter.pausedSyncAccounts).toContain(firstId);
    expect(shelfAfter.forgottenMailAccounts).toContain(firstId);
  });

  it("reviews and archives kept records after an agent storage failure and renders Account sheet UI (spec/app/account/records.md, \"Story: Restart after a failure that kept records\")", async () => {
    const { alpha, scene, runtime } = await bootAccount({
      signedIn: true,
      agentState: "failed",
      agentFailure: "storage",
      retainedRecords: 3,
      archivedRecords: 3,
    });
    await waitFor(runtime, Resident.Machine, (r) => r.phase === "Review");
    await waitFor(runtime, Records.Machine, (r) => r.showing && r.review.status === "Loaded" && r.kept === 3);

    const rec = await runtime.runPromise(Records.Machine.use((m) => m.get()));
    await runtime.runPromise(Records.Machine.use((m) => m.send({ type: "archive", review: rec.review.ticket, reviewing: true, held: false })));
    await waitFor(runtime, Records.Machine, (r) => r.attempt.outcome === "Confirmed" && !r.showing);
    await waitFor(runtime, Resident.Machine, (r) => r.phase === "Up");
    expect(scene.agentState).toBe("running");

    // spec/app/account/index.md, "Story: Have the agent running"
    await drawn(() => alpha.runtime.runPromise(openAccount()));
    await waitFor(alpha.runtime, Layers.Machine, (l) => Layers.listed(l, accountLayer));
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Account");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Alpha Cloud session");
    await press("Close Account");
    await waitFor(alpha.runtime, Layers.Machine, (l) => !Layers.listed(l, accountLayer));
  });
});
