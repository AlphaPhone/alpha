// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Passwords } from "../gen/app__passwords.effect.vibe";
import {
  PasswordVault,
  closePasswords,
  focusSignInField,
  openPasswords,
} from "../src/passwords/passwords.vibe";
import { button, closeAll, fill, later, only, open, press, pressOnTop, seen, underAct, until } from "./alpha.tsx";
import { passwordsHarness } from "./fakes/passwords.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const passwordMounts = () => only("home", "overlay", "notice");

describe("passwords", () => {
  it("pauses observation on sensitive pages, unlocks, adds, edits, deletes and auto-locks on timeout or background (spec/app/passwords/index.md, \"Story: Unlock my passwords\"; spec/app/passwords/index.md, \"Story: Add, change and delete a password\"; spec/app/passwords/entry.md, \"Story: Write a password entry\")", async () => {
    const world = scene();
    const { alpha } = await open(world, passwordMounts());
    const harness = passwordsHarness();
    await alpha.runtime.runPromise(Effect.flatMap(PasswordVault, (v) => Effect.sync(() => v.setBackend(harness.backend))));

    await alpha.runtime.runPromise(openPasswords());
    await until(alpha, alpha.runtime, Passwords, (s) => s.open && s.status.status === "Loaded");
    expect(document.documentElement.getAttribute("data-alpha-sensitive")).toBe("passwords");

    await pressOnTop("Unlock passwords");
    await until(alpha, alpha.runtime, Passwords, (s) => s.lock === "Unlocked" && s.listing.status === "Loaded");
    expect(document.body.textContent).toContain("No saved passwords");

    await pressOnTop("Add password");
    await until(alpha, alpha.runtime, Passwords, (s) => s.entry.form === "New");

    await fill("Name", "Example Bank");
    await fill("Username", "alex@example.com");
    await fill("Website", "bank.example.com");
    await fill("Password", "correct-horse-battery");
    await pressOnTop("Save password");
    await until(alpha, alpha.runtime, Passwords, (s) => s.notice === "Saved" && s.count === 1 && s.entry.form === "Closed");
    expect(harness.savedSecrets.size).toBe(1);

    await pressOnTop("Example Bank");
    await until(alpha, alpha.runtime, Passwords, (s) => s.entry.form === "Edit");
    await pressOnTop("Delete");
    await until(alpha, alpha.runtime, Passwords, (s) => s.entry.confirmDelete);
    await pressOnTop("Confirm delete");
    await until(alpha, alpha.runtime, Passwords, (s) => s.notice === "Removed" && s.count === 0);

    await later(alpha, 60_000);
    await until(alpha, alpha.runtime, Passwords, (s) => s.lock === "Locked" && s.notice === "Expired");

    await pressOnTop("Unlock passwords");
    await until(alpha, alpha.runtime, Passwords, (s) => s.lock === "Unlocked");
    await seen(false);
    await until(alpha, alpha.runtime, Passwords, (s) => !s.foreground && s.lock === "Locked");
    await seen(true);
    await until(alpha, alpha.runtime, Passwords, (s) => s.foreground && s.lock === "Locked");

    await alpha.runtime.runPromise(closePasswords());
    await until(alpha, alpha.runtime, Passwords, (s) => !s.open);
    expect(document.documentElement.getAttribute("data-alpha-sensitive")).toBeNull();
  });

  it("recovers a damaged vault only after explicit owner confirmation and checks backup v2 identity binding (spec/app/passwords/index.md, \"Story: Recover a damaged vault\")", async () => {
    const world = scene();
    const { alpha } = await open(world, passwordMounts());
    const harness = passwordsHarness();
    harness.seed({ id: "old-1", name: "Mail", username: "a@b.c", websites: ["mail.example.com"], revision: 1 }, "secret");
    harness.setDamaged(true);
    await alpha.runtime.runPromise(Effect.flatMap(PasswordVault, (v) => Effect.sync(() => v.setBackend(harness.backend))));

    await alpha.runtime.runPromise(openPasswords());
    await until(alpha, alpha.runtime, Passwords, (s) => s.open);

    await pressOnTop("Unlock passwords");
    await until(alpha, alpha.runtime, Passwords, (s) => s.damaged && s.lock === "Locked");

    const backupBlocked = await alpha.runtime.runPromise(Effect.flatMap(PasswordVault, (v) => Effect.sync(() =>
      v.evaluateBackup({ googleLinked: false, damaged: false, locked: false }),
    )));
    expect(backupBlocked).toEqual({ contractVersion: 2, ready: false, reason: "identity_unlinked" });

    await pressOnTop("Reset vault");
    await until(alpha, alpha.runtime, Passwords, (s) => s.reset.showing);
    await pressOnTop("Reset vault");
    await until(alpha, alpha.runtime, Passwords, (s) => !s.damaged && s.notice === "ResetDone");
    expect(harness.savedSecrets.size).toBe(0);
  });

  it("offers Android autofill settings and fills a password strictly for the focused Browser origin (spec/app/passwords/index.md, \"Story: Fill passwords in\")", async () => {
    const world = scene();
    const { alpha } = await open(world, passwordMounts());
    const harness = passwordsHarness();
    harness.setService("Other", true);
    await alpha.runtime.runPromise(Effect.flatMap(PasswordVault, (v) => Effect.sync(() => v.setBackend(harness.backend))));

    await alpha.runtime.runPromise(openPasswords());
    await until(alpha, alpha.runtime, Passwords, (s) => s.open && s.service === "Other");

    await pressOnTop("Use for autofill");
    await until(alpha, alpha.runtime, Passwords, (s) => s.service === "Alpha");
    expect(harness.autofillSettingsOpened()).toBe(1);

    await alpha.runtime.runPromise(closePasswords());
    await until(alpha, alpha.runtime, Passwords, (s) => !s.open);

    await alpha.runtime.runPromise(focusSignInField(7, "shop.example.com"));
    await until(alpha, alpha.runtime, Passwords, (s) => s.field === 7);
    expect(Boolean(button("Fill password"))).toBe(true);

    await press("Fill password");
    await until(alpha, alpha.runtime, Passwords, (s) => s.field === 0 && s.notice === "Filled");
    expect(harness.filledHosts).toEqual(["shop.example.com"]);
  });
});
