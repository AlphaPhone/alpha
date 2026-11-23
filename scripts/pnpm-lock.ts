/**
 * Reads pnpm-lock.yaml (lockfile v9) as the flat, installed-path view the licence and SBOM inventories
 * consume: one entry per package snapshot reached from the shipping importer (apps/app, following
 * workspace links into vendor/eliza packages), with its registry integrity and whether only development
 * or optional edges reach it.
 */
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const LOCKFILE = 'pnpm-lock.yaml';
/** The workspace importer whose dependencies ship in the web bundle and the APK. */
export const SHIPPING_IMPORTER = 'apps/app';

export interface LockedPackage {
  name?: string;
  version: string;
  resolved?: string;
  integrity?: string;
  license?: string;
  dev?: boolean;
  optional?: boolean;
  devOptional?: boolean;
  link?: boolean;
}
export interface PackageLock {
  packages?: Record<string, LockedPackage>;
}
interface ImporterDependency { specifier?: string; version: string }
interface Importer {
  dependencies?: Record<string, ImporterDependency>;
  devDependencies?: Record<string, ImporterDependency>;
  optionalDependencies?: Record<string, ImporterDependency>;
}
interface Snapshot { dependencies?: Record<string, string>; optionalDependencies?: Record<string, string> }
interface PnpmLock {
  lockfileVersion: string;
  importers: Record<string, Importer>;
  packages?: Record<string, {resolution?: {integrity?: string; tarball?: string}}>;
  snapshots?: Record<string, Snapshot>;
}

/** pnpm's virtual-store directory name for a dependency path (depPathToFilename). */
export function storeDirectory(depPath: string) {
  const filename = depPath.replace(/[\\/:*?"<>|]/g, '+').replace(/\)\(/g, '_').replace(/\(/g, '_').replace(/\)$/, '').replace(/\)/g, '_');
  if (filename.length <= 120) return filename;
  return `${filename.slice(0, 120 - 33)}_${createHash('sha256').update(filename).digest('hex').slice(0, 32)}`;
}

const baseKey = (depPath: string) => depPath.replace(/\(.*$/, '');
const nameOf = (key: string) => { const at = key.lastIndexOf('@'); return at > 0 ? key.slice(0, at) : key; };

export function parsePnpmLock(text: string, importer = SHIPPING_IMPORTER): PackageLock {
  const lock = YAML.parse(text) as PnpmLock;
  if (!lock || typeof lock !== 'object' || !String(lock.lockfileVersion).startsWith('9') || !lock.importers?.[importer]) throw new Error(`${LOCKFILE} is not a pnpm v9 lockfile with the ${importer} importer`);
  const snapshots = lock.snapshots ?? {};
  const edge = (from: string, name: string, version: string) => {
    if (version.startsWith('link:')) return {link: path.posix.normalize(path.posix.join(from, version.slice(5)))};
    return {snapshot: `${name}@${version}`};
  };
  const reach = (optionalEdges: boolean) => {
    const seen = new Set<string>(), importers = new Set<string>();
    const queue: ({snapshot: string} | {link: string})[] = [];
    const visitImporter = (key: string) => {
      if (importers.has(key) || !lock.importers[key]) return;
      importers.add(key);
      const entry = lock.importers[key];
      for (const [name, dependency] of Object.entries({...entry.dependencies, ...(optionalEdges ? entry.optionalDependencies : {})})) queue.push(edge(key, name, dependency.version));
    };
    visitImporter(importer);
    while (queue.length) {
      const next = queue.pop()!;
      if ('link' in next) { visitImporter(next.link); continue; }
      if (seen.has(next.snapshot)) continue;
      seen.add(next.snapshot);
      const snapshot = snapshots[next.snapshot] ?? {};
      for (const [name, version] of Object.entries({...snapshot.dependencies, ...(optionalEdges ? snapshot.optionalDependencies : {})})) queue.push(edge('', name, version));
    }
    return seen;
  };
  const required = reach(false), withOptional = reach(true);
  const packages: Record<string, LockedPackage> = {};
  for (const depPath of Object.keys(snapshots)) {
    const key = baseKey(depPath), name = nameOf(key), version = key.slice(name.length + 1);
    const resolution = lock.packages?.[key]?.resolution ?? {};
    packages[`node_modules/.pnpm/${storeDirectory(depPath)}/node_modules/${name}`] = {
      name, version, integrity: resolution.integrity,
      resolved: resolution.tarball ?? `https://registry.npmjs.org/${name}/-/${name.slice(name.lastIndexOf('/') + 1)}-${version}.tgz`,
      dev: !withOptional.has(depPath) || undefined,
      optional: (withOptional.has(depPath) && !required.has(depPath)) || undefined,
    };
  }
  return {packages};
}

/** The lock, with each installed package's declared licence when node_modules is present. */
export function readPnpmLock(root: string, importer = SHIPPING_IMPORTER): PackageLock {
  const lock = parsePnpmLock(fs.readFileSync(path.join(root, LOCKFILE), 'utf8'), importer);
  for (const [key, meta] of Object.entries(lock.packages ?? {})) {
    try {
      const license = JSON.parse(fs.readFileSync(path.join(root, key, 'package.json'), 'utf8')).license;
      if (typeof license === 'string') meta.license = license;
    } catch { /* not installed: the caller reports a missing manifest where it needs one */ }
  }
  return lock;
}
