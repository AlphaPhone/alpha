#!/usr/bin/env node
import path from "node:path";
import { startSlackProvider } from "./slack-provider.ts";
import { startTelegramProvider } from "./telegram-provider.ts";

interface CliOptions {
  readonly slackPort: number;
  readonly telegramPort: number;
  readonly stateDir?: string;
}

function readArgValue(argv: readonly string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index < 0) return undefined;
  return argv[index + 1];
}

function parsePort(raw: string | undefined, fallback: number, label: string): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Invalid ${label} port: ${raw}`);
  }
  return parsed;
}

function parseCliOptions(argv: readonly string[]): CliOptions {
  const slackPort = parsePort(readArgValue(argv, "--slack-port"), 4101, "--slack-port");
  const telegramPort = parsePort(readArgValue(argv, "--telegram-port"), 4102, "--telegram-port");
  const stateDir = readArgValue(argv, "--state-dir");
  return {
    slackPort,
    telegramPort,
    ...(stateDir !== undefined && stateDir.trim() !== "" ? { stateDir: path.resolve(stateDir) } : {}),
  };
}

const options = parseCliOptions(process.argv.slice(2));
const slack = await startSlackProvider({
  port: options.slackPort,
  ...(options.stateDir ? { stateFile: path.join(options.stateDir, "slack-state.json") } : {}),
});
const telegram = await startTelegramProvider({
  port: options.telegramPort,
  ...(options.stateDir ? { stateFile: path.join(options.stateDir, "telegram-state.json") } : {}),
});

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
