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
  /** `packages/cloud-worker`, with the cloud's own command built to `dist/src/main.js`. */
  readonly cloud: string;
}

/** The repository root: the nearest directory above this file that holds `eliza.lock.json`, from `src/` and from `dist/src/` alike. */
export const repository =(function rootOf(directory: string): string {
  return fs.existsSync(path.join(directory, "eliza.lock.json")) || path.dirname(directory) === directory ? directory : rootOf(path.dirname(directory));
})(import.meta.dirname);

const lock = JSON.parse(fs.readFileSync(path.join(repository, "eliza.lock.json"), "utf8")) as Lock;

/** @throws {never} */
export function checkout(): Checkout {
  const root = process.env.ALPHA_ELIZA_DIR ?? path.join(os.homedir(), ".cache/alpha/eliza-vibestack", lock.commit.slice(0, 12));
  return { commit: lock.commit, root, bundle: path.join(root, ".alpha/agent"), cloud: path.join(root, "packages/cloud-worker") };
}

const stamp = (at: Checkout) => path.join(at.root, ".alpha/ready.json");

const clientPackages = [
  { name: "@elizaos/plugin-files-client", entry: "packages/plugin-files-client/dist/src/index.js" },
  { name: "@elizaos/plugin-inbox-client", entry: "packages/plugin-inbox-client/dist/src/index.js" },
  { name: "@elizaos/plugin-notes-client", entry: "packages/plugin-notes-client/dist/src/index.js" },
  { name: "@elizaos/plugin-workflow-client", entry: "packages/plugin-workflow-client/dist/src/index.js" },
];

interface ReadyStamp {
  readonly commit?: string;
  readonly clients?: readonly string[];
}

function readStamp(at: Checkout): ReadyStamp {
  const file = stamp(at);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) as ReadyStamp : {};
}

function missingClients(at: Checkout, before: ReadyStamp) {
  return clientPackages.filter(({ name, entry }) =>
    before.commit !== at.commit || before.clients?.includes(name) !== true || !fs.existsSync(path.join(at.root, entry)));
}

const versionOf = (file: string, name: string) => (JSON.parse(fs.readFileSync(file, "utf8")) as { dependencies?: Record<string, string> }).dependencies?.[name];

/**
 * `.eliza` at the repository root names the checkout, so that `link:` dependencies and tools find the pinned packages.
 * The page runs eliza's client on its own copy of Effect, so the two must be one version: a pin that moves eliza's
 * Effect is refused here, and not found out in a browser.
 */
function linked(at: Checkout) {
  const [theirs, ours] = [versionOf(path.join(at.root, "packages/agent/package.json"), "effect"), versionOf(path.join(repository, "package.json"), "effect")];
  if (theirs !== ours) throw new Error(`eliza ${at.commit.slice(0, 12)} is on effect ${theirs} and Alpha on ${ours}: move both together`);
  const link = path.join(repository, ".eliza");
  if (fs.existsSync(link) && fs.realpathSync(link) === fs.realpathSync(at.root)) return;
  fs.rmSync(link, { force: true });
  fs.symlinkSync(at.root, link, "dir");
}

export function ready(at: Checkout = checkout()): boolean {
  const before = readStamp(at);
  return before.commit === at.commit && missingClients(at, before).length === 0;
}

/** The checkout, or the command that makes it. */
export function prepared(): Checkout {
  const at = checkout();
  if (!ready(at)) throw new Error(`eliza ${at.commit.slice(0, 12)} is not built at ${at.root}: run \`pnpm eliza\` once (a few minutes; worktrees share the build)`);
  linked(at);
  return at;
}

export function run(cwd: string, command: string, ...args: string[]) {
  const started = Date.now();
  process.stdout.write(`$ ${command} ${args.join(" ")}\n`);
  execFileSync(command, args, { cwd, stdio: "inherit", env: { ...process.env, CI: "1" } });
  process.stdout.write(`  ${Math.round((Date.now() - started) / 1000)} s\n`);
}

/** Only one worktree builds the checkout all of them share: the others wait for it, and then find it ready. */
export async function alone<A>(at: Pick<Checkout, "commit" | "root">, work: () => Promise<A>): Promise<A> {
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
export async function prepare() {
  const at = checkout();
  if (!ready(at)) await alone(at, () => build(at));
  linked(at);
  process.stdout.write(`eliza ${at.commit.slice(0, 12)} is ready at ${at.root}\n`);
}

async function build(at: Checkout) {
  const before = readStamp(at);
  const clients = missingClients(at, before);
  if (before.commit !== at.commit) await buildBase(at);
  else if (clients.length === 0) return;
  for (const { name } of clients) run(at.root, "pnpm", "--filter", name, "build");
  fs.writeFileSync(stamp(at), JSON.stringify({ commit: at.commit, clients: clientPackages.map(({ name }) => name) }));
}

async function buildBase(at: Checkout) {
  const source = process.env.ALPHA_ELIZA_SOURCE ?? lock.remote;
  if (!fs.existsSync(path.join(at.root, ".git"))) {
    fs.mkdirSync(path.dirname(at.root), { recursive: true });
    run(path.dirname(at.root), "git", "clone", "-q", ...(fs.existsSync(source) ? ["--local"] : ["--branch", lock.branch]), source, at.root);
  }
  run(at.root, "git", "checkout", "-q", "--detach", at.commit);
  run(at.root, "pnpm", "install", "--frozen-lockfile", "--prefer-offline");
  for (const name of ["core", "core-node", "cloud", "agent", "os-bridges", "os", "agent-host", "cloud-worker"]) run(at.root, "pnpm", "--filter", `@elizaos/${name}`, "build");
  fs.rmSync(at.bundle, { recursive: true, force: true });
  const started = Date.now();
  const { buildAgentBundle } = await import(pathToFileURL(path.join(at.root, "packages/agent-host/dist/src/bundle/build.js")).href) as {
    buildAgentBundle: (options: { plugins: string[]; outDir: string; sourceCommit: string; sourceRoot: string }) => Promise<unknown>;
  };
  await buildAgentBundle({ plugins: [], outDir: at.bundle, sourceCommit: at.commit, sourceRoot: at.root });
  process.stdout.write(`agent bundle: ${Math.round((Date.now() - started) / 1000)} s\n`);
}

/** After `pnpm install`: link the checkout where it is built, and say the one command where it is not. Installing never builds it. */
export function link() {
  const at = checkout();
  if (ready(at)) return linked(at);
  process.stdout.write(`eliza ${at.commit.slice(0, 12)} is not built yet: run \`pnpm eliza\` once (a few minutes) before typecheck, test, build or dev\n`);
}

/** Before a command that needs the checkout: say the one command that makes it, and stop, where it is not built. */
export function required() {
  try { prepared(); } catch (cause) {
    process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exitCode = 1;
  }
}
