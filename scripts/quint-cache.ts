import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { importedModelPaths, quintCacheDirectory, quintCacheDisabled } from './quint-lib.ts';
import { sha256 } from './sha256.ts';

export { quintCacheDirectory, quintCacheDisabled };

/**
 * Content-addressed memory of Quint runs.
 *
 * A run is remembered under exactly what decides its answer: the Quint program (its package bytes, every package it
 * loads, Node and the platform), the arguments it was launched with, and the bytes of every file it reads: the model
 * and its transitive imports, plus the TLC configuration a `verify` names. Each run executes in a fresh directory
 * holding only those files, so a file left out of the key is one Quint cannot find: a missed import fails loudly and
 * is never served stale. Only a run the checker accepted is stored, and a remembered output is judged again by the
 * current checker before it is reused, so a stricter checker reruns rather than trusting an old verdict.
 */
export const quintCacheSchema = 1;
const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
const maxBytes = 512 * 2 ** 20;

export interface CachedRun {
  schemaVersion: number;
  key: string;
  argv: string[];
  startedAt: string;
  finishedAt: string;
  status: number;
  stdout: string;
  stderr: string;
  /** Proof-scope evidence a TLC translation reports beside its output. */
  evidence?: Record<string, unknown>;
}
export interface QuintCache {
  dir: string;
  enabled: boolean;
  toolchain: string;
  used: Set<string>;
  hits: number;
  misses: number;
  stored: number;
}

/** A package and every package it may load, by name and version, resolved as Node resolves them. */
function packageClosure(directory: string, found = new Map<string, string>()) {
  if (found.has(directory)) return found;
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  found.set(directory, `${manifest.name}@${manifest.version}`);
  const require = createRequire(join(directory, 'package.json'));
  for (const name of Object.keys({...manifest.dependencies, ...manifest.optionalDependencies})) {
    let at: string | undefined;
    for (const candidate of require.resolve.paths(name) || []) {
      if (existsSync(join(candidate, name, 'package.json'))) { at = realpathSync(join(candidate, name)); break; }
    }
    if (at) packageClosure(at, found);
  }
  return found;
}

function treeDigest(directory: string): string {
  const parts: string[] = [];
  const walk = (path: string) => {
    for (const entry of readdirSync(path, {withFileTypes: true}).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(child); }
      else if (entry.isFile()) parts.push(`${relative(directory, child)}\0${sha256(readFileSync(child))}`);
    }
  };
  walk(directory);
  return sha256(parts.join('\n'));
}

/** The JavaScript runtime that launches Quint: Bun when the checker runs under Bun, otherwise Node. */
function runtimeIdentity() {
  const bun = (globalThis as {Bun?: {version: string; revision: string}}).Bun;
  return {bun: bun ? `${bun.version}+${bun.revision}` : null, node: process.versions.node, platform: process.platform, arch: process.arch};
}

/** What tells this Quint from another: its own bytes, the packages it loads, and the runtime that runs it. */
export function quintToolchain(root: string) {
  const quint = realpathSync(join(root, 'node_modules/@informalsystems/quint'));
  return sha256(JSON.stringify({
    schema: quintCacheSchema,
    quint: treeDigest(quint),
    packages: [...packageClosure(quint).values()].sort(),
    runtime: runtimeIdentity(),
  }));
}

export function openQuintCache(root: string, enabled = !quintCacheDisabled()): QuintCache {
  const dir = quintCacheDirectory(root);
  let toolchain = '';
  if (enabled) {
    try { toolchain = quintToolchain(root); }
    catch (error) {
      // Without a fingerprint there is no safe key: run everything.
      console.warn(`Quint cache disabled: ${error instanceof Error ? error.message : String(error)}`);
      enabled = false;
    }
  }
  return {dir, enabled, toolchain, used: new Set(), hits: 0, misses: 0, stored: 0};
}

/** The model and every model it imports, transitively, as repository-relative paths. */
export function modelClosure(root: string, path: string) {
  const seen = new Set<string>();
  const pending = [path];
  while (pending.length) {
    const next = pending.pop()!;
    if (seen.has(next)) continue;
    if (!resolve(root, next).startsWith(resolve(root) + sep)) throw Error(`Model import escapes the repository: ${next}`);
    seen.add(next);
    const text = readFileSync(join(root, next), 'utf8');
    for (const imported of importedModelPaths({path: next}, text, root)) if (!seen.has(imported)) pending.push(imported);
  }
  return [...seen].sort();
}

/** The files one run reads, read once: the run executes against this snapshot and is keyed by it. */
export function snapshotInputs(root: string, modelPath: string, extra: string[] = []) {
  const files = new Map<string, Buffer>();
  for (const path of [...modelClosure(root, modelPath), ...extra].sort()) files.set(path, readFileSync(join(root, path)));
  return files;
}

/** The arguments that decide an answer; where a server listens does not. */
const keyedArguments = (argv: string[]) => argv.filter(arg => !arg.startsWith('--server-endpoint='));

/**
 * `runner` names anything besides Quint that turns these arguments into an answer, such as the TLC translation and
 * its pinned distribution; a plain Quint launch has none.
 */
export function runKey(cache: QuintCache, argv: string[], files: ReadonlyMap<string, Buffer>, runner: unknown = null) {
  return sha256(JSON.stringify({
    schema: quintCacheSchema,
    toolchain: cache.toolchain,
    runner,
    argv: keyedArguments(argv),
    files: [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([path, bytes]) => [path, sha256(bytes)]),
  }));
}

const entryName = (key: string) => `run-${key}.json.gz`;
const entryFile = (cache: QuintCache, key: string) => join(cache.dir, 'runs', entryName(key));

export function recallRun(cache: QuintCache, key: string): CachedRun | undefined {
  if (!cache.enabled) return undefined;
  const file = entryFile(cache, key);
  let bytes: Buffer;
  try { bytes = readFileSync(file); } catch { return undefined; }
  try {
    const value = JSON.parse(gunzipSync(bytes).toString('utf8')) as CachedRun;
    if (value.schemaVersion !== quintCacheSchema || value.key !== key || !Number.isInteger(value.status)
      || typeof value.stdout !== 'string' || typeof value.stderr !== 'string') throw Error('Malformed entry');
    cache.used.add(entryName(key));
    try { const now = new Date(); utimesSync(file, now, now); } catch { /* still a hit */ }
    return value;
  } catch {
    // Cut short by a kill or a full disk: a miss, and never read again.
    rmSync(file, {force: true});
    return undefined;
  }
}

function writeAtomically(file: string, bytes: Buffer) {
  mkdirSync(dirname(file), {recursive: true});
  const temporary = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  writeFileSync(temporary, bytes);
  renameSync(temporary, file);
}

export function storeRun(cache: QuintCache, run: CachedRun) {
  if (!cache.enabled) return;
  try {
    writeAtomically(entryFile(cache, run.key), gzipSync(JSON.stringify(run)));
    cache.used.add(entryName(run.key));
    cache.stored++;
  } catch (error) {
    console.warn(`Could not store Quint result: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** A fresh directory holding exactly the snapshot, at the same repository-relative paths. */
export function materialize(files: ReadonlyMap<string, Buffer>) {
  const directory = mkdtempSync(join(tmpdir(), 'alpha-quint-run-'));
  for (const [path, bytes] of files) {
    mkdirSync(dirname(join(directory, path)), {recursive: true});
    writeFileSync(join(directory, path), bytes);
  }
  return directory;
}

/** Keep a month of entries within 512 MiB; never evict what this run used. */
export function collectGarbage(cache: QuintCache) {
  if (!cache.enabled) return;
  const expired = Date.now() - maxAgeMs;
  for (const sub of ['runs', 'metadata']) {
    const directory = join(cache.dir, sub);
    let names: string[];
    try { names = readdirSync(directory); } catch { continue; }
    const retained: {file: string; size: number; touched: number}[] = [];
    for (const name of names) {
      const file = join(directory, name);
      let stat;
      try { stat = statSync(file); } catch { continue; }
      if (cache.used.has(name)) continue;
      if (name.endsWith('.tmp') ? stat.mtimeMs < Date.now() - 60 * 60 * 1000 : stat.mtimeMs < expired) rmSync(file, {force: true});
      else retained.push({file, size: stat.size, touched: stat.mtimeMs});
    }
    if (sub !== 'runs') continue;
    let bytes = retained.reduce((total, entry) => total + entry.size, 0);
    for (const entry of retained.sort((a, b) => a.touched - b.touched)) {
      if (bytes <= maxBytes) break;
      rmSync(entry.file, {force: true});
      bytes -= entry.size;
    }
  }
}
