import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { checkout, prepared } from "../src/checkout.ts";
import { bunIn } from "../src/no-bun.vibe";
import { pinnedCheckout } from "../src/pinned.vibe";
import { said, scratch, startCloud } from "../src/services.ts";

const repository = path.join(import.meta.dirname, "../../..");

describe("the eliza harness", () => {
  it("finds the pinned checkout built and linked as .eliza", async () => {
    const lock = JSON.parse(fs.readFileSync(path.join(repository, "eliza.lock.json"), "utf8")) as { commit: string };
    const at = prepared();
    expect(at.commit).toBe(lock.commit);
    expect(fs.realpathSync(path.join(repository, ".eliza"))).toBe(fs.realpathSync(at.root));
    expect(await Effect.runPromise(pinnedCheckout())).toEqual({ commit: lock.commit, dir: checkout().root });
  });

  it("starts eliza's cloud on a free loopback port, which answers until it is stopped", async () => {
    const state = scratch();
    try {
      const cloud = await startCloud(state, [], 0);
      const health = `${cloud.local}/api/public/service`;
      expect(new URL(cloud.local).hostname).toBe("127.0.0.1");
      await expect(said(health)).resolves.toBeDefined();
      await cloud.stop();
      await expect(said(health)).rejects.toThrow();
    } finally {
      fs.rmSync(state, { recursive: true, force: true });
    }
  }, 300_000);

  it("names each Bun lock, command, import, action and shebang outside legacy/", async () => {
    const tree = scratch();
    try {
      fs.cpSync(path.join(import.meta.dirname, "fixtures/bun"), tree, { recursive: true });
      for (const file of ["bun.lock", "apps/agent/bun.lockb", "bunfig.toml", "legacy/bun.lock"]) {
        fs.mkdirSync(path.dirname(path.join(tree, file)), { recursive: true });
        fs.writeFileSync(path.join(tree, file), "");
      }
      execFileSync("git", ["init", "-q"], { cwd: tree });
      execFileSync("git", ["add", "-A"], { cwd: tree });
      const found = await Effect.runPromise(Effect.provide(bunIn(tree), NodeServices.layer));
      expect(found.map((line) => line.slice(0, line.indexOf(":"))).sort()).toEqual([
        ".github/workflows/ci.yml",
        "apps/agent/bun.lockb",
        "bun.lock",
        "bunfig.toml",
        "scripts/build.sh",
        "scripts/hello.ts",
        "scripts/setup.sh",
        "scripts/store.ts",
      ]);
    } finally {
      fs.rmSync(tree, { recursive: true, force: true });
    }
  });
});
