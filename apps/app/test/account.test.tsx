// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import * as AccountResident from "../gen/app__account.ts";
import * as Billing from "../gen/app__account__billing.ts";
import * as Google from "../gen/app__account__google.ts";
import * as Plan from "../gen/app__account__plan.ts";
import * as Provider from "../gen/app__account__provider.ts";
import * as Session from "../gen/app__account__session.ts";
import * as SignIn from "../gen/app__account__signIn.ts";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import * as Layers from "../gen/app__shell__layers.effect.vibe";
import { button, closeAll, hardware, only, open as openAlpha, press, underAct, until } from "./alpha.tsx";
import { account } from "./fakes/cloud.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

describe("Account", () => {
  it("Uses milliseconds consistently across all timed account machines (spec/app/account/index.md, \"Story: Come back after a failure\"; spec/app/account/plan.md, \"Story: Know my plan\"; spec/app/account/signIn.md, \"Story: Sign in to Alpha Cloud\")", () => {
    // spec/app/account/index.md, "A down agent that failed is started again after 3, 10, 30 and then 60 seconds, four times at most"
    expect([
      AccountResident.wait(0),
      AccountResident.wait(1),
      AccountResident.wait(2),
      AccountResident.wait(3),
      AccountResident.livenessGap,
    ]).toEqual([3_000, 10_000, 30_000, 60_000, 10_000]);
    // spec/app/account/billing.md, "Coming back from the browser, giving up on it, or waiting too long for it, confirms a checkout of this sign-in with Cloud and checks the plan; the return itself changes nothing"
    expect([Billing.checkoutLife, Billing.visitLimit]).toEqual([86_400_000, 1_800_000]);
    // spec/app/account/google.md, "The owner can stop waiting for the browser, and a visit not back within ten minutes ends; either way the accounts are read back"
    expect(Google.consentLimit).toBe(600_000);
    // spec/app/account/plan.md, "Story: Know my plan"
    expect([Plan.graceWindow, Plan.recheckGap, Plan.renewMargin]).toEqual([604_800_000, 60_000, 60_000]);
    // spec/app/account/provider.md, "Story: Choose where AI runs"; spec/app/account/session.md, "Story: Stay signed in"
    expect([Provider.holdLimit, Session.holdLimit, Session.renewWindow]).toEqual([120_000, 120_000, 259_200_000]);
    // spec/app/account/signIn.md, "Story: Sign in to Alpha Cloud"
    expect([SignIn.codeLife, SignIn.cooldown, SignIn.browserGrace, SignIn.secondLife]).toEqual([600_000, 60_000, 600_000, 600_000]);
  });

  it("Shows verified account and Cloud plan in Settings Account without losing status on Back (spec/app/account/plan.md, \"Story: Know my plan\"; spec/app/shell/layers.md, \"Story: Keep a sheet or a dialog above the phone\")", async () => {
    const { alpha } = await openAlpha({ ...scene(), phone: true }, only("home", "view:Settings", "overlay"));
    await press("Settings");
    await until(alpha, alpha.runtime, Shell, (shell) => shell.trail.at(-1) === "Settings");
    const row = () => button(/^Account/)?.textContent ?? "";
    const dialogText = () => document.querySelector("[role=dialog]")?.textContent ?? "";
    const planText = () => document.querySelector("[aria-label='Cloud plan']")?.textContent ?? "";
    await vi.waitFor(() => expect(row()).toContain(account.email));
    await press(/^Account/);
    await until(alpha, alpha.runtime, Layers.Machine, (layers) => Layers.listed(layers, "account"));
    const balance = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(12.5);
    await vi.waitFor(() => {
      expect(dialogText()).toContain(account.email);
      expect(planText()).toContain(balance);
    });
    await hardware("back");
    await until(alpha, alpha.runtime, Layers.Machine, (layers) => !Layers.listed(layers, "account"));
    expect(row()).toContain(account.email);
  });
});
