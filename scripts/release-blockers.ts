/**
 * Named reasons a verify-apks release row may not be distributed: Alpha's policy binding of
 * the shared judgement (vendor/eliza/packages/os/scripts/android/apk-release-record.mjs).
 * This is the one release admission decision: verify-apks records `distributable` as "no
 * blockers", and provisioning, image staging and update publication judge rows with it.
 *
 * The shared function reads one recorded row back and names every blocker (test mocks, the
 * flag-off bundle audit, signing, the packaged runtime and its notices, on-device voice and,
 * for an image, the reviewed platform certificate). Alpha supplies only its policy:
 * - signer: `releaseSigner` (the committed android/release-signer.json) recomputes admission
 *   with build-android's releaseAdmission, so an unset signer always blocks;
 * - on-device voice: a packaged voice bundle must carry its ASR slot (`voiceHost.asr`);
 * - licences: open-source licence flags never block (decision P-09). The single item that can
 *   is the separately named `unresolved-font-licence` check for a proprietary font with no
 *   recorded licence, and only while UNRESOLVED_FONT_LICENCE_BLOCKS_DISTRIBUTION
 *   (scripts/licence-policy.ts) is true.
 *
 */
import { apkReleaseBlockers } from "../vendor/eliza/packages/os/scripts/android/apk-release-record.mjs";
import { UNRESOLVED_FONT_LICENCE_BLOCKS_DISTRIBUTION } from "./licence-policy.ts";
import { releaseAdmission } from "./build-android.ts";

// The shared judgement's generic item, named only when nothing else is.
const NOT_RECORDED = "verify-apks did not record this release as distributable";
const FONT_CHECK = /^(unresolved-font-licence: |font licence check failed: )/;

interface ReleaseBlockerOptions {
  manifestTestMocks?: unknown;
  admission?: ReturnType<typeof releaseAdmission>;
  releaseSigner?: unknown;
  image?: {platformCertificateSha256?: unknown};
  fontLicenceBlocks?: boolean;
}
const assessReleaseBlockers = apkReleaseBlockers as (
  row: Record<string, unknown>, options: Omit<ReleaseBlockerOptions, 'fontLicenceBlocks'> & {
    admitSigner: typeof releaseAdmission; signerFile: string; cloudVoiceProvider: 'cartesia'; licenceBlocks: (item: string) => boolean;
  },
) => string[];

export function releaseBlockers(row: Record<string, unknown>, { fontLicenceBlocks = UNRESOLVED_FONT_LICENCE_BLOCKS_DISTRIBUTION, ...options }: ReleaseBlockerOptions = {}) {
  const blockers = assessReleaseBlockers(row, {
    ...options,
    admitSigner: releaseAdmission,
    signerFile: "android/release-signer.json",
    cloudVoiceProvider: "cartesia",
    licenceBlocks: item => fontLicenceBlocks && FONT_CHECK.test(item),
  });
  const voice = row.voiceHost as {packaged?: unknown; asr?: unknown} | undefined;
  const named = (row.runtimeProfile ?? "native") === "native" && voice?.packaged === true && voice.asr !== true
    ? [...blockers.filter(item => item !== NOT_RECORDED), "on-device voice has no ASR"] : blockers;
  // Device acceptance is observed separately; a checked-in approval flag is not a build gate.
  return named.filter(item => item !== 'unqualified on-device voice (device qualification pending)');
}
