// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import * as Layers from "../gen/app__shell__layers.effect.vibe";
import { button, closeAll, drawn, hardware, only, open as openAlpha, press, underAct, until } from "./alpha.tsx";
import { account } from "./fakes/cloud.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

describe("Account", () => {
  // spec/app/account/plan.md, "Story: Know my plan"; spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"
  it("Shows verified account and Cloud plan in Settings Account without losing status on Back", async () => {
    const { alpha, close } = await openAlpha({ ...scene(), phone: true }, only("home", "view:Settings", "overlay"));
    await press("Settings");
    await until(alpha, alpha.runtime, Shell, (shell) => shell.trail.at(-1) === "Settings");
    const row = () => button(/^Account/)?.textContent ?? "";
    const dialogText = () => document.querySelector("[role=dialog]")?.textContent ?? "";
    const planText = () => document.querySelector("[aria-label='Cloud plan']")?.textContent ?? "";
    await drawn(() => vi.waitFor(() => expect(row()).toContain(account.email)));
    await press(/^Account/);
    await until(alpha, alpha.runtime, Layers.Machine, (layers) => Layers.listed(layers, "account"));
    const balance = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(12.5);
    await drawn(() => vi.waitFor(() => {
      expect(dialogText()).toContain(account.email);
      expect(planText()).toContain(balance);
    }));
    await hardware("back");
    await until(alpha, alpha.runtime, Layers.Machine, (layers) => !Layers.listed(layers, "account"));
    await drawn(() => vi.waitFor(() => expect(document.querySelector("[role=dialog]")).toBeNull()));
    await drawn(() => alpha.runtime.runPromise(Effect.yieldNow));
    expect(row()).toContain(account.email);
    await close();
  });
});
