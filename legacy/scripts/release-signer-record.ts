/**
 * Fields of android/release-signer.json that no release reads any more. Alpha version 49 phones,
 * signed by the old key, are wiped rather than upgraded in place (owner decision 2026-11-15), so
 * Alpha signs with one key and no signing-key rotation. A record that carries apkSigningRotation
 * again is refused, never silently ignored. A standalone pin left in an existing
 * privateProducerApproval is inert: admission is launcher-only, so that approval matches no plan.
 * scripts/ci/app_update_producer.py retired_signer_problems applies the same rule in Python.
 */
export const RELEASE_SIGNER_RECORD = "android/release-signer.json";

export function retiredReleaseSignerProblems(input: unknown): string[] {
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const problems: string[] = [];
  if (Object.hasOwn(record, "apkSigningRotation"))
    problems.push(`${RELEASE_SIGNER_RECORD} still has apkSigningRotation; Alpha no longer rotates its signing key for version 49 phones. Delete the apkSigningRotation object from ${RELEASE_SIGNER_RECORD}.`);
  return problems;
}
