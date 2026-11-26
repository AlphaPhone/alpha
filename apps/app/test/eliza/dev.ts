import { spawn } from "node:child_process";
import path from "node:path";
import readline from "node:readline";

/** Start `pnpm dev` in apps/app with `env` added, once it says where it serves: that origin, and how to stop it. */
export async function pnpmDev(env: Record<string, string> = {}): Promise<{ origin: string; stop: () => void }> {
  const root = path.join(import.meta.dirname, "../..");
  const dev = spawn("pnpm", ["run", "dev"], { cwd: root, env: { ...process.env, ...env, FORCE_COLOR: "0", NO_COLOR: "1", BROWSER: "none" }, stdio: ["ignore", "pipe", "inherit"], detached: true });
  const origin = await new Promise<string>((done, fail) => {
    readline.createInterface({ input: dev.stdout }).on("line", (line) => {
      const at = /https?:\/\/localhost:\d+/.exec(line)?.[0];
      if (at) done(at);
    });
    dev.once("close", (code) => fail(new Error(`pnpm dev ended with ${code}`)));
  });
  return { origin, stop: () => process.kill(-dev.pid!, "SIGTERM") };
}
