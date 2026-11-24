// Ported for Alpha from elizaOS/eliza 8d11e27371859ee83e54494b1a995d8eea9a5ce8 (packages/os/android/apk-distribution.mjs, MIT).
// Plain-Node release operators share the signing read and signer selection.
import { execFileSync } from "node:child_process";

/**
 * The first signer's certificate SHA-256 from `apksigner verify --print-certs`.
 * Rotated (ranged) output needs an explicit API level and must name exactly
 * one signer for it; ambiguous or multi-signer output is refused.
 */
export function parseApkSignerDigest(output, { apiLevel } = {}) {
  const legacy = [
    ...output.matchAll(
      /Signer #([0-9]+) certificate SHA-256 digest:\s*([a-fA-F0-9]{64})/g,
    ),
  ];
  const ranged = [
    ...output.matchAll(
      /Signer \(minSdkVersion=([0-9]+), maxSdkVersion=([0-9]+)\) certificate SHA-256 digest:\s*([a-fA-F0-9]{64})/g,
    ),
  ];
  if (legacy.length && ranged.length)
    throw new Error("Ambiguous APK signer output");
  if (legacy.length === 1 && legacy[0][1] === "1")
    return legacy[0][2].toLowerCase();
  if (legacy.length)
    throw new Error("Multiple or unrecognized APK signers are not supported");
  if (!ranged.length)
    throw new Error("apksigner reported no SHA-256 signer digest");
  if (!Number.isInteger(apiLevel) || apiLevel < 1)
    throw new Error(
      "Rotated APK signer requires an explicit Android API level",
    );
  const matches = ranged.filter(
    (row) => Number(row[1]) <= apiLevel && apiLevel <= Number(row[2]),
  );
  if (matches.length !== 1)
    throw new Error("No unique APK signer for the requested Android API level");
  return matches[0][3].toLowerCase();
}

/** Run apksigner and return {@link parseApkSignerDigest} of its output. */
export function readApkSignerDigest(file, { apksigner, apiLevel, env } = {}) {
  if (!apksigner)
    throw new TypeError("readApkSignerDigest needs the apksigner path");
  if (apiLevel !== undefined && (!Number.isInteger(apiLevel) || apiLevel < 1))
    throw new Error("Invalid Android API level");
  const scope =
    apiLevel === undefined
      ? []
      : [
          "--min-sdk-version",
          String(apiLevel),
          "--max-sdk-version",
          String(apiLevel),
        ];
  const output = execFileSync(
    apksigner,
    ["verify", "--print-certs", ...scope, file],
    { encoding: "utf8", timeout: 120_000, ...(env ? { env } : {}) },
  );
  return parseApkSignerDigest(output, { apiLevel });
}
