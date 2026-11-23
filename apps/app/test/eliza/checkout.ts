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
  /** `packages/cloud`, with the cloud's own command built to `dist/src/main.js`. */
  readonly cloud: string;
}

const lock = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../../../../eliza.lock.json"), "utf8")) as Lock;

/** @throws {never} */
export function checkout(): Checkout {
  const root = process.env.ALPHA_ELIZA_DIR ?? path.join(os.homedir(), ".cache/alpha/eliza-vibestack", lock.commit.slice(0, 12));
  return { commit: lock.commit, root, bundle: path.join(root, ".alpha/agent"), cloud: path.join(root, "packages/cloud") };
}

const stamp = (at: Checkout) => path.join(at.root, ".alpha/ready.json");

const versionOf = (file: string, name: string) => (JSON.parse(fs.readFileSync(file, "utf8")) as { dependencies?: Record<string, string> }).dependencies?.[name];

/**
 * `.eliza` at the repository root names the checkout, so that `link:` dependencies and tools find the pinned packages.
 * The page runs eliza's client on its own copy of Effect, so the two must be one version: a pin that moves eliza's
 * Effect is refused here, and not found out in a browser.
 */
function linked(at: Checkout) {
  const [theirs, ours] = [versionOf(path.join(at.root, "packages/agent/package.json"), "effect"), versionOf(path.join(import.meta.dirname, "../../package.json"), "effect")];
  if (theirs !== ours) throw new Error(`eliza ${at.commit.slice(0, 12)} is on effect ${theirs} and Alpha on ${ours}: move both together`);
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
  if (!ready(at)) throw new Error(`eliza ${at.commit.slice(0, 12)} is not built at ${at.root}: run \`pnpm eliza\` once (a few minutes; worktrees share the build)`);
  linked(at);
  return at;
}

function run(cwd: string, command: string, ...args: string[]) {
  const started = Date.now();
  process.stdout.write(`$ ${command} ${args.join(" ")}\n`);
  execFileSync(command, args, { cwd, stdio: "inherit", env: { ...process.env, CI: "1" } });
  process.stdout.write(`  ${Math.round((Date.now() - started) / 1000)} s\n`);
}

/** Only one worktree builds the checkout all of them share: the others wait for it, and then find it ready. */
async function alone<A>(at: Checkout, work: () => Promise<A>): Promise<A> {
  const lock = `${at.root}.building`;
  fs.mkdirSync(path.dirname(at.root), { recursive: true });
  for (let waited = 0; ; waited += 1) {
    try { fs.mkdirSync(lock); break; } catch { /* Another worktree holds it. */ }
    const held = fs.statSync(lock, { throwIfNoEntry: false })?.mtimeMs;
    if (held !== undefined && Date.now() - held > 3_600_000) fs.rmSync(lock, { recursive: true, force: true });
    if (waited % 12 === 0) process.stdout.write(`another worktree is building eliza ${at.commit.slice(0, 12)}: waiting\n`);
    await new Promise((done) => setTimeout(done, 5_000));
  }
  try { return await work(); } finally { fs.rmSync(lock, { recursive: true, force: true }); }
}

/** Clone eliza at the pinned commit, install it, and build its packages and the agent bundle. Each step is skipped once it is done. */
async function prepare() {
  const at = checkout();
  if (!ready(at)) await alone(at, () => build(at));
  linked(at);
  process.stdout.write(`eliza ${at.commit.slice(0, 12)} is ready at ${at.root}\n`);
}

async function build(at: Checkout) {
  if (ready(at)) return;
  const source = process.env.ALPHA_ELIZA_SOURCE ?? lock.remote;
  if (!fs.existsSync(path.join(at.root, ".git"))) {
    fs.mkdirSync(path.dirname(at.root), { recursive: true });
    run(path.dirname(at.root), "git", "clone", "-q", ...(fs.existsSync(source) ? ["--local"] : ["--branch", lock.branch]), source, at.root);
  }
  run(at.root, "git", "checkout", "-q", "--detach", at.commit);
  run(at.root, "pnpm", "install", "--frozen-lockfile", "--prefer-offline");
  for (const name of ["core", "cloud", "agent", "os"]) run(at.root, "pnpm", "--filter", `@elizaos/${name}`, "build");
  fs.rmSync(at.bundle, { recursive: true, force: true });
  const started = Date.now();
  const { buildAgentBundle } = await import(pathToFileURL(path.join(at.root, "packages/agent/dist/src/bundle/build.js")).href) as {
    buildAgentBundle: (options: { plugins: string[]; outDir: string; sourceCommit: string; sourceRoot: string }) => Promise<unknown>;
  };
  await buildAgentBundle({ plugins: [], outDir: at.bundle, sourceCommit: at.commit, sourceRoot: at.root });
  process.stdout.write(`agent bundle: ${Math.round((Date.now() - started) / 1000)} s\n`);
  fs.writeFileSync(stamp(at), JSON.stringify({ commit: at.commit }));
}

/** After `pnpm install`: link the checkout where it is built, and say the one command where it is not. Installing never builds it. */
function link() {
  const at = checkout();
  if (ready(at)) return linked(at);
  process.stdout.write(`eliza ${at.commit.slice(0, 12)} is not built yet: run \`pnpm eliza\` once (a few minutes) before typecheck, test, build or dev\n`);
}

/** Before a command that needs the checkout: say the one command that makes it, and stop, where it is not built. */
function required() {
  try { prepared(); } catch (cause) {
    process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === import.meta.filename) await (process.argv.includes("--link") ? link() : process.argv.includes("--ready") ? required() : prepare());
