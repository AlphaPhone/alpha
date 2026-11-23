#!/usr/bin/env node
/**
 * Is over-the-air app updating working for this build's package right now?
 *
 *   node scripts/update-channel-status.ts [--download] [--json]
 *
 * Reads the channel the installed app reads (app.config.json updateManifestUrl, the same URL Gradle
 * compiles into BuildConfig.ALPHA_UPDATE_MANIFEST_URL) anonymously, exactly as a phone does, and
 * checks what the phone's updater would require before it installs: a complete alpha-update/v1
 * launcher offer, newer than the retained legacy channel's version floor, signed by this
 * repository's release certificate (android/release-signer.json), with its APK on the canonical
 * release. --download also fetches the APK and checks its size and SHA-256.
 *
 * Read-only: it never publishes. Publication is the protected Release workflow (`publish`), see
 * docs/alpha-cloud.md "OTA". A pass here is channel evidence, not device acceptance.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {parseOffer, publicObject} from './deliver-app-update.ts';
import {APP_UPDATE_TAG, LEGACY_APP_UPDATE_TAG, appUpdateManifestUrl, isPublishedUpdateApkUrl} from './update-channel.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export interface ChannelRow { gate: string; passed: boolean; detail: string }

export async function channelStatus({download = false, read = publicObject, directory = root}: {download?: boolean; read?: typeof publicObject; directory?: string} = {}): Promise<ChannelRow[]> {
  const config = JSON.parse(fs.readFileSync(path.join(directory, 'app.config.json'), 'utf8')) as {appId: string; updateManifestUrl: string};
  const signer = JSON.parse(fs.readFileSync(path.join(directory, 'android/release-signer.json'), 'utf8')) as {signerSha256: string; apkSigningRotation?: {approval?: string; previousSignerSha256?: string}};
  const rows: ChannelRow[] = [];
  const row = (gate: string, passed: boolean, detail: string) => { rows.push({gate, passed, detail}); return passed; };

  row('package', config.appId === 'ai.alphacompute.alphaphone', config.appId);
  const url = config.updateManifestUrl;
  if (!row('channel', url === appUpdateManifestUrl(APP_UPDATE_TAG), url)) return rows;
  const manifest = await read(url, {maxBytes: 32 * 1024, missing: true});
  if (!row('manifest published', !!manifest, manifest ? `${manifest.size} bytes` : `nothing at ${APP_UPDATE_TAG}: installed ${config.appId} phones see no update`)) return rows;
  let offer;
  try { offer = parseOffer(manifest!.bytes!); } catch (error) { row('offer', false, (error as Error).message); return rows; }
  row('offer', true, `launcher versionCode ${offer.versionCode}`);
  const legacy = await read(appUpdateManifestUrl(LEGACY_APP_UPDATE_TAG), {maxBytes: 32 * 1024, missing: true}).catch(() => null);
  const floor = legacy?.bytes ? (() => { try { return parseOffer(legacy.bytes!).versionCode; } catch { return 0; } })() : 0;
  row('above legacy floor', offer.versionCode > floor, `offer ${offer.versionCode}, retained legacy ${floor || 'none'}`);
  row('release signer', offer.signerSha256 === signer.signerSha256, offer.signerSha256 === signer.signerSha256 ? 'android/release-signer.json' : `offer ${offer.signerSha256.slice(0, 12)}…, expected ${signer.signerSha256.slice(0, 12)}…`);
  row('canonical APK', isPublishedUpdateApkUrl(offer.apkUrl, APP_UPDATE_TAG, offer.versionCode), offer.apkUrl);
  if (download) {
    const apk = await read(offer.apkUrl, {maxBytes: offer.sizeBytes, missing: true});
    row('APK bytes', !!apk && apk.size === offer.sizeBytes && apk.sha256 === offer.sha256, apk ? `${apk.size} bytes, sha256 ${apk.sha256.slice(0, 12)}…` : 'APK missing');
  }
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values} = parseArgs({options: {download: {type: 'boolean', default: false}, json: {type: 'boolean', default: false}}});
  const rows = await channelStatus({download: values.download});
  if (values.json) console.log(JSON.stringify(rows, null, 1));
  else for (const row of rows) console.log(`${row.passed ? 'PASS' : 'FAIL'}  ${row.gate.padEnd(20)} ${row.detail}`);
  process.exit(rows.every(row => row.passed) ? 0 : 1);
}
