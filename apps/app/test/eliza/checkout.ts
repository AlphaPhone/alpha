import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface Lock {
  readonly remote: string;
  readonly branch: string;
  readonly commit: string;
}

/** The eliza checkout Alpha's services run from: built once per pinned commit, outside every worktree. */
export interface Checkout {
  readonly commit: string;
  readonly root: string;
  /** `agent.mjs` and its PGlite files, as the device carries them. */
  readonly bundle: string;
  /** `packages/cloud`, with the Worker built to `dist/`. */
  readonly cloud: string;
}

const lock = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../../../../eliza.lock.json"), "utf8")) as Lock;

/** @throws {never} */
export function checkout(): Checkout {
  const root = process.env.ALPHA_ELIZA_DIR ?? path.join(os.homedir(), ".cache/alpha/eliza-vibestack", lock.commit.slice(0, 12));
  return { commit: lock.commit, root, bundle: path.join(root, ".alpha/agent"), cloud: path.join(root, "packages/cloud") };
}

const stamp = (at: Checkout) => path.join(at.root, ".alpha/ready.json");

/** `.eliza` at the repository root names the checkout, so that `link:` dependencies and tools find the pinned packages. */
function linked(at: Checkout) {
  const link = path.join(import.meta.dirname, "../../../../.eliza");
  if (fs.existsSync(link) && fs.realpathSync(link) === fs.realpathSync(at.root)) return;
  fs.rmSync(link, { force: true });
  fs.symlinkSync(at.root, link, "dir");
}

export function ready(at: Checkout = checkout()): boolean {
  return fs.existsSync(stamp(at)) && (JSON.parse(fs.readFileSync(stamp(at), "utf8")) as { commit?: string }).commit === at.commit;
}

/** The checkout, or the command that makes it. */
export function prepared(): Checkout {
  const at = checkout();
  if (!ready(at)) throw new Error(`eliza ${at.commit.slice(0, 12)} is not built at ${at.root}: run \`pnpm --filter @repo/app eliza\``);
  linked(at);
  return at;
}

function run(cwd: string, command: string, ...args: string[]) {
  const started = Date.now();
  process.stdout.write(`$ ${command} ${args.join(" ")}\n`);
  execFileSync(command, args, { cwd, stdio: "inherit", env: { ...process.env, CI: "1" } });
  process.stdout.write(`  ${Math.round((Date.now() - started) / 1000)} s\n`);
}

/** Clone eliza at the pinned commit, install it, and build the agent bundle and the cloud Worker. Each step is skipped once it is done. */
async function prepare() {
  const at = checkout();
  if (ready(at)) {
    linked(at);
    return void process.stdout.write(`eliza ${at.commit.slice(0, 12)} is ready at ${at.root}\n`);
  }
  const source = process.env.ALPHA_ELIZA_SOURCE ?? lock.remote;
  if (!fs.existsSync(path.join(at.root, ".git"))) {
    fs.mkdirSync(path.dirname(at.root), { recursive: true });
    run(path.dirname(at.root), "git", "clone", "-q", ...(fs.existsSync(source) ? ["--shared"] : ["--branch", lock.branch]), source, at.root);
  }
  run(at.root, "git", "checkout", "-q", "--detach", at.commit);
  run(at.root, "pnpm", "install", "--frozen-lockfile", "--prefer-offline");
  run(at.root, "pnpm", "--filter", "@elizaos/core", "build");
  run(at.root, "pnpm", "--filter", "@elizaos/agent", "build");
  run(at.root, "pnpm", "--filter", "@elizaos/cloud", "build:worker");
  fs.rmSync(at.bundle, { recursive: true, force: true });
  const started = Date.now();
  const { buildAgentBundle } = await import(pathToFileURL(path.join(at.root, "packages/agent/dist/src/bundle/build.js")).href) as {
    buildAgentBundle: (options: { plugins: string[]; outDir: string; sourceCommit: string; sourceRoot: string }) => Promise<unknown>;
  };
  await buildAgentBundle({ plugins: [], outDir: at.bundle, sourceCommit: at.commit, sourceRoot: at.root });
  process.stdout.write(`agent bundle: ${Math.round((Date.now() - started) / 1000)} s\n`);
  fs.writeFileSync(stamp(at), JSON.stringify({ commit: at.commit }));
  linked(at);
}

if (process.argv[1] === import.meta.filename) await prepare();
