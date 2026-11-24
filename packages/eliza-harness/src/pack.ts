import fs from "node:fs";
import path from "node:path";
import { alone, checkout, repository, run } from "./checkout.ts";

/**
 * A private clone of the pinned eliza that the agent pack is built from, as Alpha's old phone build prepared its own
 * copy of the pinned source: the shared checkout every worktree links as `.eliza` is never written, and the plugins the
 * pack carries are built here, with an entry package inside the clone that names them.
 */
export interface Pack {
  readonly commit: string;
  readonly root: string;
  /** Each workspace package of the clone by its name, with its directory. */
  readonly packages: ReadonlyMap<string, string>;
}

/** The name of the one package the pack's entry is, inside the clone. */
export const packEntryName = "@repo/agent-pack-entry";

const always = ["@elizaos/core", "@elizaos/cloud", "@elizaos/agent", "@elizaos/os"];

/** Where this worktree keeps its clone for `commit`. @throws {never} */
export function packRoot(commit = checkout().commit): string {
  return path.join(repository, "apps/agent/.cache/eliza-pack", commit.slice(0, 12));
}

const stampOf = (root: string) => path.join(root, ".alpha/pack.json");

interface Stamp {
  readonly commit?: string;
  readonly plugins?: readonly string[];
}

function stamped(root: string): Stamp {
  try {
    return JSON.parse(fs.readFileSync(stampOf(root), "utf8")) as Stamp;
  } catch {
    return {};
  }
}

/** The clone holds `commit` with every one of `plugins` built. @throws {never} */
export function packReady(plugins: readonly string[], commit = checkout().commit): boolean {
  const stamp = stamped(packRoot(commit));
  return stamp.commit === commit && plugins.every((name) => stamp.plugins?.includes(name) === true);
}

function workspace(root: string): Map<string, string> {
  const found = new Map<string, string>();
  const packages = path.join(root, "packages");
  for (const directory of fs.readdirSync(packages)) {
    const manifest = path.join(packages, directory, "package.json");
    if (!fs.existsSync(manifest)) continue;
    const name = (JSON.parse(fs.readFileSync(manifest, "utf8")) as { name?: string }).name;
    if (name !== undefined) found.set(name, path.join(packages, directory));
  }
  return found;
}

function install(root: string) {
  try {
    run(root, "pnpm", "install", "--frozen-lockfile", "--offline");
  } catch {
    run(root, "pnpm", "install", "--frozen-lockfile", "--prefer-offline");
  }
}

async function prepare(root: string, commit: string, plugins: readonly string[]) {
  if (packReady(plugins, commit)) return;
  const shared = checkout().root;
  const source = process.env.ALPHA_ELIZA_SOURCE ?? (fs.existsSync(path.join(shared, ".git")) ? shared : undefined);
  if (!fs.existsSync(path.join(root, ".git"))) {
    fs.rmSync(root, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(root), { recursive: true });
    const lock = JSON.parse(fs.readFileSync(path.join(repository, "eliza.lock.json"), "utf8")) as { remote: string; branch: string };
    run(path.dirname(root), "git", "clone", "-q", "--no-checkout", ...(source === undefined ? ["--branch", lock.branch, lock.remote] : ["--local", source]), root);
  }
  run(root, "git", "checkout", "-q", "--detach", commit);
  const before = stamped(root);
  if (before.commit !== commit) install(root);
  const names = workspace(root);
  const unknown = plugins.filter((name) => !names.has(name));
  if (unknown.length > 0) throw new Error(`eliza ${commit.slice(0, 12)} has no package ${unknown.join(", ")}`);
  const built = [...always, ...plugins];
  run(root, "pnpm", "-r", "--workspace-concurrency=2", ...built.flatMap((name) => ["--filter", name]), "run", "build");
  fs.mkdirSync(path.dirname(stampOf(root)), { recursive: true });
  fs.writeFileSync(stampOf(root), JSON.stringify({ commit, plugins: [...new Set([...(before.commit === commit ? before.plugins ?? [] : []), ...plugins])].sort() }));
}

/** The pack's clone at the pinned commit with `plugins` built in it, made once per worktree and commit, and only by one process at a time. */
export async function packCheckout(plugins: readonly string[]): Promise<Pack> {
  const { commit } = checkout();
  const root = packRoot(commit);
  if (!packReady(plugins, commit)) await alone({ commit, root }, () => prepare(root, commit, plugins));
  return { commit, root, packages: workspace(root) };
}

/** The pack's clone, if `packCheckout` made it for `plugins`; it builds nothing. @throws {Error} */
export function packPrepared(plugins: readonly string[]): Pack {
  const { commit } = checkout();
  const root = packRoot(commit);
  if (!packReady(plugins, commit)) throw new Error(`the agent pack's eliza ${commit.slice(0, 12)} is not prepared at ${root}`);
  return { commit, root, packages: workspace(root) };
}

/**
 * Write the pack's entry package inside the clone: its `package.json`, `entry.js` with `source`, and each `@elizaos`
 * package of the clone linked in its `node_modules`, so the entry's imports resolve to the clone's own packages.
 * The whole package replaces the last one at once. Returns the entry file.
 */
export function stagePackEntry(pack: Pack, source: string): string {
  const parent = path.join(pack.root, ".alpha");
  fs.mkdirSync(parent, { recursive: true });
  const target = path.join(parent, "pack-entry");
  const staging = fs.mkdtempSync(path.join(parent, ".pack-entry-"));
  try {
    fs.writeFileSync(path.join(staging, "package.json"), `${JSON.stringify({ name: packEntryName, version: "0.0.0", private: true, type: "module" }, null, 2)}\n`);
    fs.writeFileSync(path.join(staging, "entry.js"), source);
    const scope = path.join(staging, "node_modules/@elizaos");
    fs.mkdirSync(scope, { recursive: true });
    for (const [name, directory] of pack.packages) {
      if (name.startsWith("@elizaos/")) fs.symlinkSync(directory, path.join(scope, name.slice("@elizaos/".length)), "dir");
    }
    fs.rmSync(target, { recursive: true, force: true });
    fs.renameSync(staging, target);
  } catch (cause) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw cause;
  }
  return path.join(target, "entry.js");
}
