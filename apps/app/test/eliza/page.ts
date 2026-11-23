import { spawn } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { chromium } from "playwright";

const root = path.join(import.meta.dirname, "../..");
const started = Date.now();
const dev = spawn("pnpm", ["run", "dev"], { cwd: root, env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", BROWSER: "none" }, stdio: ["ignore", "pipe", "inherit"], detached: true });
const origin = await new Promise<string>((done, fail) => {
  readline.createInterface({ input: dev.stdout }).on("line", (line) => {
    const at = /https?:\/\/localhost:\d+/.exec(line)?.[0];
    if (at) done(at);
  });
  dev.once("close", (code) => fail(new Error(`pnpm dev ended with ${code}`)));
});
process.stdout.write(`pnpm dev serves ${origin} after ${Date.now() - started} ms\n`);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(600_000);
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") problems.push(message.text()); });
  await page.goto(origin);
  const ask = page.getByRole("region", { name: "Ask Alpha" });
  await ask.getByRole("textbox", { name: "Ask Alpha" }).fill("Hello from the browser");
  await ask.getByRole("button", { name: "Send" }).click();
  await ask.getByText("You said: Hello from the browser").waitFor();
  const lines = await ask.getByRole("listitem").allTextContents();
  const seen = [...problems];
  const conversations = JSON.parse(await page.evaluate(async () => (await fetch("/agent/api/conversations")).text())) as { conversations: { title: string }[] };
  const account = JSON.parse(await page.evaluate(async () => (await fetch("/cloud/api/v1/user")).text())) as { data?: { email?: string } };
  process.stdout.write(`${JSON.stringify({ lines, agentHolds: conversations.conversations.map((one) => one.title), cloudAccount: account.data?.email, problems: seen })}\n`);
  if (seen.length || lines.at(-1) !== "You said: Hello from the browser" || account.data?.email !== "owner@alpha.test") process.exitCode = 1;
} finally {
  await browser.close();
  process.kill(-dev.pid!, "SIGTERM");
}
