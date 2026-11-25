#!/usr/bin/env node
import path from "node:path";
import { startSlackProvider } from "./slack-provider.ts";
import { startTelegramProvider } from "./telegram-provider.ts";

interface CliOptions {
  readonly slackPort: number;
  readonly telegramPort: number;
  readonly stateDir?: string;
}

function parsePort(raw: string, label: string): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Invalid ${label} port: ${raw}`);
  }
  return parsed;
}

function parseCliOptions(argv: readonly string[]): CliOptions {
  let slackPort = 4101;
  let telegramPort = 4102;
  let stateDir: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index] ?? "";
    const value = argv[index + 1];
    if (flag !== "--slack-port" && flag !== "--telegram-port" && flag !== "--state-dir") {
      throw new Error(`Unknown CLI argument: ${flag}`);
    }
    if (value === undefined || value.trim() === "" || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}`);
    }
    index += 1;
    if (flag === "--slack-port") slackPort = parsePort(value, "--slack-port");
    else if (flag === "--telegram-port") telegramPort = parsePort(value, "--telegram-port");
    else stateDir = path.resolve(value);
  }
  return {
    slackPort,
    telegramPort,
    ...(stateDir !== undefined ? { stateDir } : {}),
  };
}

const options = parseCliOptions(process.argv.slice(2));
const slack = await startSlackProvider({
  port: options.slackPort,
  ...(options.stateDir ? { stateFile: path.join(options.stateDir, "slack-state.json") } : {}),
});
let telegram: Awaited<ReturnType<typeof startTelegramProvider>>;
try {
  telegram = await startTelegramProvider({
    port: options.telegramPort,
    ...(options.stateDir ? { stateFile: path.join(options.stateDir, "telegram-state.json") } : {}),
  });
} catch (cause) {
  await slack.stop().catch(() => undefined);
  throw cause;
}

process.stdout.write(
  `${JSON.stringify({
    slackOrigin: slack.origin,
    telegramOrigin: telegram.origin,
    ...(options.stateDir ? { stateDir: options.stateDir } : {}),
  })}\n`,
);

let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  void Promise.allSettled([slack.stop(), telegram.stop()]).finally(() => {
    process.exit(0);
  });
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
