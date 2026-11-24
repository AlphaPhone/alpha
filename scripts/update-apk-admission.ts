/** Bind a release offer to the actual APK and its verified signer. Alpha signs with one key and
 * no signing-key rotation, so the APK's original signer must be its active release signer;
 * neither is accepted from apk-manifest.json alone. */
import {execFileSync} from 'node:child_process';
import type {ReleaseSigner} from './build-android.ts';
import {retiredReleaseSignerProblems} from './release-signer-record.ts';
import {sha256} from './sha256.ts';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {requireConsistentApk, PACKAGE} from './provision-unit.ts';
import {androidEnv, tool} from './toolchain.ts';
import {withApkEvidence} from './apk-evidence.ts';
import {parseXmlTree} from './apk.ts';
import {apkUpdateChannel, type UpdateChannel} from './update-channel.ts';

const HEX = /^[0-9a-f]{64}$/;
const verifier = fileURLToPath(new URL('./owner/InspectUpdateApk.java', import.meta.url));
function requireValue(value: unknown, message: string): asserts value {
  if (!value) throw Error(`Update APK admission: ${message}`);
}
interface UpdateApk {
  file: string;
  sha256: string;
  build: 'debug' | 'release';
  variant: 'launcher';
  versionCode: number;
  updateChannel: UpdateChannel | null;
}
type UpdateSigner = Pick<ReleaseSigner, 'signerSha256'>;
interface UpdateSigning {
  verified?: boolean;
  activeSignerSha256: string;
  signerRootSha256: string;
  packageName: string;
  versionCode: number;
  targetSdkVersion?: number;
  lineageSize?: number;
  lineageSha256?: string | null;
}
interface ArchiveFacts {
  packageName?: string | null;
  home: boolean;
  launcher: boolean;
  xml: string;
}

/** Public distribution must inspect the compiled channel, not a release row's claim. */
export function admitPublicUpdateChannel(xml: string, publicUrl: string) {
  requireValue(typeof publicUrl === 'string' && publicUrl.length > 0, 'the configured public manifest URL is required');
  const channel = apkUpdateChannel(parseXmlTree(xml), {appId: PACKAGE});
  requireValue(channel.manifestUrlSha256 === sha256(publicUrl),
    'compiled channel is not the configured public update channel');
  return channel;
}

/** Only policy over independently inspected facts; fixtures exercise refusals
 * without pretending their JSON is native signing evidence. */
export function admitUpdateApkIdentity(apk: Pick<UpdateApk, 'build' | 'variant' | 'versionCode'>, descriptor: UpdateSigner | undefined, archive: ArchiveFacts, signing: UpdateSigning) {
  requireValue(apk.build === 'release' && apk.variant === 'launcher', 'a release distribution is required');
  requireValue(descriptor && HEX.test(descriptor.signerSha256 ?? ''), 'an enrolled release signer is required');
  const retired = retiredReleaseSignerProblems(descriptor);
  requireValue(!retired.length, retired.join(' '));
  requireValue(signing?.verified === true && HEX.test(signing.activeSignerSha256 ?? '') && HEX.test(signing.signerRootSha256 ?? ''), 'verified signer and family are required');
  requireValue(signing.activeSignerSha256 === descriptor.signerSha256, 'active signer differs from the enrolled release signer');
  requireValue(signing.packageName === PACKAGE && archive?.packageName === PACKAGE, 'archive package differs from Alpha');
  requireValue(Number.isSafeInteger(apk.versionCode) && apk.versionCode > 0 && signing.versionCode === apk.versionCode, 'archive versionCode differs from its release row');
  const launcher = apk.variant === 'launcher';
  requireValue(archive.home === launcher && archive.launcher === true &&
    typeof archive.xml === 'string' && archive.xml.includes('android.permission.READ_CONTACTS') === launcher,
    'archive HOME or flavor marker differs from its release row');
  requireValue(signing.signerRootSha256 === signing.activeSignerSha256 && !signing.lineageSize,
    'the APK carries a signing-key rotation; Alpha releases are signed with one key and no lineage');
  return {signerRootSha256: signing.signerRootSha256};
}

export function verifiedUpdateSigning(apk: Pick<UpdateApk, 'file' | 'sha256'>): UpdateSigning {
  const env = androidEnv();
  const jar = path.join(path.dirname(tool('apksigner')), 'lib/apksigner.jar');
  const result = execFileSync(path.join(env.JAVA_HOME, 'bin/java'),
    ['-cp',jar,verifier,apk.file,apk.sha256,PACKAGE],
    {env,encoding:'utf8',timeout:120_000,maxBuffer:1 << 20,stdio:['ignore','pipe','pipe']});
  return JSON.parse(result);
}

/** Inspect one snapshot and report the original signer Android exposes for it. */
export async function inspectUpdateApk(apk: UpdateApk, {descriptor}: {descriptor?: ReleaseSigner} = {}) {
  return withApkEvidence(apk.file, async evidence => {
    requireValue(evidence.sha256 === apk.sha256, 'APK bytes changed during admission');
    const snapshot = {...apk, file: evidence.toolFile};
    await requireConsistentApk(snapshot, {descriptor});
    const {xml, facts} = await evidence.manifest();
    const {updateManifestUrl} = JSON.parse(fs.readFileSync(new URL('../app.config.json', import.meta.url),'utf8'));
    admitPublicUpdateChannel(xml, updateManifestUrl);
    const archive = {
      xml,
      packageName: facts.packageName,
      home: xml.includes('android.intent.category.HOME'),
      launcher: xml.includes('android.intent.category.LAUNCHER'),
    };
    return admitUpdateApkIdentity(apk, descriptor, archive, verifiedUpdateSigning(snapshot));
  });
}
