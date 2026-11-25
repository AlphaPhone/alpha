import { spawnSync } from "node:child_process";
import { basename } from "node:path";

const bunFiles = new Set(["bun.lock", "bun.lockb", "bunfig.toml"]);
const before = "(^|[^[:alnum:]_/-])";
const after = "([^[:alnum:]_-]|$)";
const commands = [
  String.raw`${before}bunx?([[:space:]]+[-[:alnum:]_./@~$"']|["'])`,
  String.raw`(^|[;|&][[:space:]]*|:[[:space:]]+)[[:space:]]*bunx?([[:space:]]*[;|&]|[[:space:]]*$)`,
  String.raw`/bin/bunx?${after}`,
  String.raw`^#!.*[[:space:]/]bun${after}`,
  String.raw`${before}bun:[[:alnum:]_/-]+`,
  String.raw`${before}Bun[[:space:]]*(\??\.[[:space:]]*[[:alpha:]_$]|\[)`,
  String.raw`["'](bun|@oven/bun[^"']*)["'][[:space:]]*:`,
  String.raw`["']packageManager["'][[:space:]]*:[[:space:]]*["']bun@`,
  String.raw`setup-bun@|bun\.sh/install|github\.com/oven-sh/bun/releases|(^|[/[:space:]"'])(oven|oven-sh)/bun${after}`,
].join("|");

const excluded = [
  ":(top,exclude)legacy",
  ":(top,exclude,glob)**/pnpm-lock.yaml",
  ":(top,exclude)packages/eliza-harness/scripts/no-bun.ts",
  ":(top,exclude)packages/eliza-harness/test/fixtures/bun",
];

function git(args: readonly string[], emptyMatches = false): string {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0 && !(emptyMatches && result.status === 1)) {
    throw new Error(`git ${args[0]}: ${result.stderr.trim() || result.signal || result.status}`);
  }
  return result.stdout;
}

const files = git(["ls-files", "-z", "--", ".", ":(top,exclude)legacy"]).split("\0");
const findings = [
  ...files.filter((file) => bunFiles.has(basename(file))).map((file) => `${file}: Bun lock or config`),
  ...git(["grep", "-nIE", "-e", commands, "--", ".", ...excluded], true).trimEnd().split("\n").filter(Boolean),
];
if (findings.length === 0) {
  process.stdout.write("No Bun commands, runtime APIs, setup, or lockfiles found in tracked files outside legacy/.\n");
} else {
  process.stderr.write(`Bun usage found. Use Node 26 and pnpm (AGENTS.md, "This project"):\n${findings.join("\n")}\n`);
  process.exitCode = 1;
}
