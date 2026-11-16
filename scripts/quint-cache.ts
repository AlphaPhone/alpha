import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createConnection } from 'node:net';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { assertQuintCacheUntracked, importedModelPaths, quintCacheDirectory, quintCacheDisabled, quintPackageDigest } from './quint-lib.ts';
import { sha256 } from './sha256.ts';

export { quintCacheDirectory, quintCacheDisabled };

/**
 * Content-addressed memory of Quint runs.
 *
 * A run is remembered under exactly what decides its answer: the Quint program (its package bytes, every package it
 * loads, the Bun or Node that runs it, and the QUINT_* environment it reads), the arguments it was launched with and
 * the time limit it ran under, the model checker it reaches (the Apalache distribution's bytes and the Java that runs
 * it), and the bytes of every file it reads: the model and its transitive imports, plus the configuration files a
 * `verify` names. Each run executes in a fresh directory
 * holding only those files, so a file left out of the key is one Quint cannot find: a missed import fails loudly and
 * is never served stale. Only a run the checker accepted is stored, and a remembered output is judged again by the
 * current checker before it is reused, so a stricter checker reruns rather than trusting an old verdict.
 */
export const quintCacheSchema = 2;
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

/** The JavaScript runtime that launches Quint: Bun when the checker runs under Bun, otherwise Node. */
function runtimeIdentity() {
  const bun = (globalThis as {Bun?: {version: string; revision: string}}).Bun;
  return {bun: bun ? `${bun.version}+${bun.revision}` : null, node: process.versions.node, platform: process.platform, arch: process.arch};
}

/**
 * Quint reads QUINT_HOME (which Apalache distribution runs) and QUINT_RETRY_NONDET_SMALLER_THAN (how the simulator
 * retries a disabled nondeterministic choice, which changes verdicts). Every QUINT_* variable is keyed so a future one
 * is covered too.
 */
export function quintEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return Object.entries(env).filter(([name]) => name.startsWith('QUINT_')).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
}

/** What tells this Quint from another: its own bytes, the packages it loads, its environment and the runtime that runs it. */
export function quintToolchain(root: string) {
  const quint = realpathSync(join(root, 'node_modules/@informalsystems/quint'));
  return sha256(JSON.stringify({
    schema: quintCacheSchema,
    quint: quintPackageDigest(root),
    packages: [...packageClosure(quint).values()].sort(),
    runtime: runtimeIdentity(),
    environment: quintEnvironment(),
  }));
}

/**
 * The model checker a `verify` reaches: the pinned Apalache distribution's jar bytes (which also hold TLC) and the Java
 * that runs it. Undefined while the distribution is not yet installed; such a run is neither recalled nor stored, and
 * the next run, after Quint has installed it, keys it. A present identity is computed once per process.
 */
const engines = new Map<string, unknown>();
export function checkerEngine(root: string, apalacheVersion: string) {
  if (engines.has(apalacheVersion)) return engines.get(apalacheVersion);
  let jar: string;
  try {
    // Quint's own resolution of its distribution directory, which honours QUINT_HOME.
    const require = createRequire(join(root, 'node_modules/@informalsystems/quint/package.json'));
    const {apalacheDistDir} = require('@informalsystems/quint/dist/src/config.js') as {apalacheDistDir(version: string): string};
    jar = join(apalacheDistDir(apalacheVersion), 'apalache/lib/apalache.jar');
  } catch { return undefined; }
  if (!existsSync(jar)) return undefined;
  const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
  const version = spawnSync(java, ['-version'], {encoding: 'utf8', timeout: 30000});
  const engine = {apalache: apalacheVersion, jar: sha256(readFileSync(jar)), java,
    javaVersion: version.error ? `unavailable: ${version.error.message}` : `${version.stdout}${version.stderr}`,
    javaOptions: ['JAVA_TOOL_OPTIONS', '_JAVA_OPTIONS', 'JDK_JAVA_OPTIONS'].map(name => [name, process.env[name] ?? null])};
  engines.set(apalacheVersion, engine);
  return engine;
}

/**
 * Whether something already listens where Quint would start its own Apalache server. Quint then uses that server
 * whatever its version, and the server Quint starts itself exits with Quint, so a listener found before a run is one
 * this checker did not start: its answers are used but never remembered.
 */
export function serverListening(endpoint: string, timeoutMs = 500): Promise<boolean> {
  const separator = endpoint.lastIndexOf(':');
  const host = endpoint.slice(0, separator), port = Number(endpoint.slice(separator + 1));
  if (!host || !Number.isInteger(port)) return Promise.resolve(false);
  return new Promise(resolveListening => {
    const socket = createConnection({host, port});
    const settle = (listening: boolean) => { socket.destroy(); resolveListening(listening); };
    socket.setTimeout(timeoutMs, () => settle(false));
    socket.once('connect', () => settle(true));
    socket.once('error', () => settle(false));
  });
}

export function openQuintCache(root: string, enabled = !quintCacheDisabled()): QuintCache {
  const dir = quintCacheDirectory(root);
  let toolchain = '';
  // Fails the whole check, loudly: a committed entry would otherwise be reported as a remembered pass.
  if (enabled) assertQuintCacheUntracked(root);
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
    // Cut short by a kill or a full disk: a miss, and never read again where the cache may be written.
    try { rmSync(file, {force: true}); } catch { /* a read-only cache stays a miss */ }
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

const liveSandboxes = new Set<string>();
// An interrupt exits the process without running pending finally blocks; remove every sandbox still in use.
process.on('exit', () => { for (const directory of liveSandboxes) try { rmSync(directory, {recursive: true, force: true}); } catch { /* best effort */ } });

/** A fresh directory holding exactly the snapshot, at the same repository-relative paths. Remove it with `release`. */
export function materialize(files: ReadonlyMap<string, Buffer>) {
  const directory = mkdtempSync(join(tmpdir(), 'alpha-quint-run-'));
  liveSandboxes.add(directory);
  try {
    for (const [path, bytes] of files) {
      mkdirSync(dirname(join(directory, path)), {recursive: true});
      writeFileSync(join(directory, path), bytes);
    }
  } catch (error) { release(directory); throw error; }
  return directory;
}
export function release(directory: string) {
  liveSandboxes.delete(directory);
  rmSync(directory, {recursive: true, force: true});
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
      if (name.endsWith('.tmp') ? stat.mtimeMs < Date.now() - 60 * 60 * 1000 : stat.mtimeMs < expired) {
        try { rmSync(file, {force: true}); } catch { /* another owner's entry */ }
      } else retained.push({file, size: stat.size, touched: stat.mtimeMs});
    }
    if (sub !== 'runs') continue;
    let bytes = retained.reduce((total, entry) => total + entry.size, 0);
    for (const entry of retained.sort((a, b) => a.touched - b.touched)) {
      if (bytes <= maxBytes) break;
      try { rmSync(entry.file, {force: true}); } catch { continue; }
      bytes -= entry.size;
    }
  }
}
