#!/usr/bin/env node
/**
 * Alpha Phone binding of the shared operator OTA update client
 * (@elizaos/os/image otaMain; issue #400). The channel
 * defaults to android/aosp/pixel10a-ota-channel.json and the stock recovery source lock to the
 * shared stallion inventory:
 *
 *   node --conditions=eliza-source --import vibelang/register scripts/aosp-ota-update.ts check --from INSTALLED_RECORD --to CANDIDATE_RECORD
 *   node --conditions=eliza-source --import vibelang/register scripts/aosp-ota-update.ts apply --serial S --from INSTALLED_RECORD --to CANDIDATE_RECORD \
 *     --ota OTA.zip --journal FILE [--execute --confirm-update]
 *   node --conditions=eliza-source --import vibelang/register scripts/aosp-ota-update.ts status --serial S --journal FILE
 *   node --conditions=eliza-source --import vibelang/register scripts/aosp-ota-update.ts fallback --serial S --journal FILE [--execute --confirm-fallback]
 *   node --conditions=eliza-source --import vibelang/register scripts/aosp-ota-update.ts stock-archive --archive FACTORY.zip [--known-good DIR]
 *   node --conditions=eliza-source --import vibelang/register scripts/aosp-ota-update.ts retain-known-good --record RECORD --signed-target-files ZIP \
 *     --signed-image IMAGE.zip --archive-dir NEW_DIR
 *   node --conditions=eliza-source --import vibelang/register scripts/aosp-ota-update.ts verify-stock --serial S
 *
 * `apply` enters recovery with `adb reboot recovery`; the operator chooses "Apply update from
 * ADB" when asked (a user build's adbd cannot enter sideload itself). Results are observations
 * for the release owner's drill record; the channel's drills are recorded from executed
 * drills, never by this tool.
 */
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const ALPHA_OTA_DEFAULTS = Object.freeze({
  channel: path.join(ROOT, 'android/aosp/pixel10a-ota-channel.json'),
  sourceLock: path.join(ROOT, 'vendor/eliza/packages/os/aosp/sources/pixel10a-stallion.json'),
});

const CHANNEL_COMMANDS = new Set(['check', 'apply', 'stock-archive', 'retain-known-good']);
const SOURCE_LOCK_COMMANDS = new Set(['stock-archive', 'verify-stock']);

/** The operator's arguments with Alpha's channel and stock recovery source lock where the command reads one and none was given. */
export function withAlphaDefaults(argv: readonly string[], defaults = ALPHA_OTA_DEFAULTS): string[] {
  const command = argv[0] ?? '';
  const args = [...argv];
  if (CHANNEL_COMMANDS.has(command) && !args.includes('--channel')) args.push('--channel', defaults.channel);
  if (SOURCE_LOCK_COMMANDS.has(command) && !args.includes('--source-lock')) args.push('--source-lock', defaults.sourceLock);
  return args;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const {otaMain} = await import('./upstream-os.ts');
    const result = await otaMain(withAlphaDefaults(process.argv.slice(2))) as {problems?: readonly unknown[]; passed?: boolean};
    console.log(JSON.stringify(result, null, 2));
    if (result?.problems?.length || result?.passed === false) process.exitCode = 1;
  } catch (error) {
    const failure = error as {reason?: unknown; message?: unknown};
    console.error(typeof failure?.reason === 'string' ? failure.reason : error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
