// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Billing from "../gen/app__account__billing.ts";
import * as SignIn from "../gen/app__account__signIn.ts";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import * as Layers from "../gen/app__shell__layers.effect.vibe";
import { button, closeAll, hardware, only, open as openAlpha, press, underAct, until } from "./alpha.tsx";
import { account } from "./fakes/cloud.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

describe("Account", () => {
  it("Uses milliseconds consistently across timed account machines (spec/app/account/billing.md, \"Story: Pay in the browser\"; spec/app/account/signIn.md, \"Story: Sign in with a code\")", () => {
    // spec/app/account/billing.md, "Coming back from the browser, giving up on it, or waiting too long for it, confirms a checkout of this sign-in with Cloud and checks the plan; the return itself changes nothing"
    expect([Billing.checkoutLife, Billing.visitLimit]).toEqual([86_400_000, 1_800_000]);
    // spec/app/account/signIn.md, "Story: Sign in with a code"
    expect([SignIn.codeLife, SignIn.cooldown, SignIn.browserGrace, SignIn.secondLife]).toEqual([600_000, 60_000, 600_000, 600_000]);
  });

  it("Shows verified account and Cloud plan in Settings Account without losing status on Back (spec/app/account/billing.md, \"Story: Pay in the browser\"; spec/app/shell/layers.md, \"Story: Keep a sheet or a dialog above the phone\")", async () => {
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
