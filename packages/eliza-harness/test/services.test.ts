import { spawn } from "node:child_process";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { awaitChildService } from "../src/services.ts";

describe("eliza harness services", () => {
  // spec/cloud/local.md, "Story: Check Alpha's contract on my computer"
  it("fails awaitChildService promptly when the child process is killed by a signal, and resolves when healthy", async () => {
    const killed = spawn(process.execPath, ["-e", 'require("node:net").createServer().listen(0, "127.0.0.1");'], {
      stdio: ["ignore", "ignore", "pipe"],
    });
    try {
      const waiting = awaitChildService(killed, "http://127.0.0.1:1/api/health", "the agent", () => "").then(
        () => "started",
        (cause: unknown) => `rejected:${cause instanceof Error ? cause.message : String(cause)}`,
      );
      killed.kill("SIGKILL");
      const outcome = await Promise.race([
        waiting,
        Effect.runPromise(Effect.sleep(2_500)).then(() => "hung"),
      ]);
      expect(outcome).toMatch(/^rejected:the agent stopped with SIGKILL:/);
    } finally {
      if (killed.exitCode === null && killed.signalCode === null) killed.kill("SIGKILL");
    }

    const server = http.createServer((_req, res) => { res.writeHead(200).end("ok"); });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const port = (server.address() as AddressInfo).port;
    const healthy = spawn(process.execPath, ["-e", 'require("node:net").createServer().listen(0, "127.0.0.1");'], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    try {
      await expect(awaitChildService(healthy, `http://127.0.0.1:${port}/api/health`, "the agent", () => "")).resolves.toBeUndefined();
    } finally {
      healthy.kill("SIGKILL");
      await new Promise<void>((done) => server.close(() => done()));
    }
  });
});
