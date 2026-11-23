import fs from 'node:fs';
import path from 'node:path';

/** upstream.lock.json: the shared elizaOS vibestack revision vendor/eliza is checked out at, and where each source lives in it. */
export interface UpstreamPin {
  url: string;
  branch: string;
  commit: string;
  appSource: string;
  osSource: string;
  androidSource: string;
  aospSource: string;
  agentSource: string;
  agentBundle: string;
  cloudSource: string;
  vibestackSource: string;
}

/** The placeholder recorded until the coordinator advances the submodule to the reviewed vibestack migration commit. */
export const PENDING_COMMIT = 'PENDING_VIBESTACK_MIGRATION_COMMIT';

/** The recorded pin of the product checkout at `root`, read as committed (no validation). */
export function readUpstreamPin(root: string): UpstreamPin {
  return JSON.parse(fs.readFileSync(path.join(root, 'upstream.lock.json'), 'utf8'));
}

/** The pin's exact commit, refused while it is still the migration placeholder or not a full SHA. */
export function pinnedCommit(root: string): string {
  const {commit} = readUpstreamPin(root);
  if (commit === PENDING_COMMIT) throw new Error('upstream.lock.json still records the pending vibestack migration commit; advance vendor/eliza to the reviewed commit and record it');
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('upstream.lock.json commit must be a full lower-case SHA');
  return commit;
}

/** An upstream source directory named by the pin, inside the vendor/eliza checkout. */
export function upstreamPath(root: string, key: 'appSource' | 'osSource' | 'androidSource' | 'aospSource' | 'agentSource' | 'cloudSource' | 'vibestackSource', ...rest: string[]) {
  return path.join(root, 'vendor/eliza', readUpstreamPin(root)[key], ...rest);
}
