// spec/cloud/rollout.md, "Reading the secrets generates each missing internal secret once, except in a frozen rollout, and they are complete only when every one is there and fits its environment"
import { createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes } from "node:crypto";

/**
 * Thirty-two random bytes, base64url: a digest or email-code key.
 * @throws {never}
 */
export function randomKey(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Thirty-two random bytes, 64 lower-case hex characters: the Google connector token key.
 * @throws {never}
 */
export function hexKey(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Thirty-two random bytes, standard base64: the Cloud sealing key.
 * @throws {never}
 */
export function base64Key(): string {
  return randomBytes(32).toString("base64");
}

/**
 * A new P-256 entitlement signing key, as PKCS #8 DER in base64.
 * @throws {never}
 */
export function entitlementKey(): string {
  return generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
}

/**
 * The public JWK of an entitlement signing key, which the operator records in the inputs.
 * @throws {Error} the key is not PKCS #8 DER
 */
export function entitlementPublicKey(signingKey: string): { kty?: string; crv?: string; x?: string; y?: string } {
  const { kty, crv, x, y } = createPublicKey(createPrivateKey({ key: Buffer.from(signingKey, "base64"), format: "der", type: "pkcs8" })).export({ format: "jwk" });
  return { kty, crv, x, y };
}

/**
 * Whether a JWK is the committed example placeholder entitlement key that must never be deployed.
 * @throws {never}
 */
export function isExampleEntitlementPublicKey(key: { readonly x?: string; readonly y?: string } | undefined): boolean {
  return key?.x === "RwIpsg2vaG6Q8pJcPP8rnReb71VKZqTlEMeF14ahp-E" && key?.y === "rzJhMHg6SUtsGH4dntUcMgkpnt8qM_ITn_REryydY5U";
}

/**
 * Whether `signingKey`'s derived public JWK matches the profile's published public key for `keyId`.
 * @throws {never}
 */
export function entitlementPublicKeyMatches(
  signingKey: string,
  publicKeys: ReadonlyArray<{ readonly kid?: string; readonly kty?: string; readonly crv?: string; readonly x?: string; readonly y?: string }>,
  keyId: string,
): boolean {
  try {
    const derived = entitlementPublicKey(signingKey);
    const listed = publicKeys.find((entry) => entry.kid === keyId);
    return listed !== undefined
      && derived.kty === "EC"
      && derived.crv === "P-256"
      && listed.kty === derived.kty
      && listed.crv === derived.crv
      && listed.x === derived.x
      && listed.y === derived.y;
  } catch {
    return false;
  }
}

/**
 * How many bytes a valid base64url value holds, or 0 when malformed.
 * @throws {never}
 */
export function base64urlBytes(value: string): number {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return 0;
  return Buffer.from(value, "base64url").length;
}

/**
 * How many bytes a valid hexadecimal value holds, or 0 when malformed.
 * @throws {never}
 */
export function hexBytes(value: string): number {
  if (value.length === 0 || value.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(value)) return 0;
  return value.length / 2;
}

/**
 * How many bytes a valid standard base64 value holds, or 0 when malformed.
 * @throws {never}
 */
export function base64Bytes(value: string): number {
  if (value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return 0;
  return Buffer.from(value, "base64").length;
}

/**
 * Whether a JWK is a usable public P-256 key.
 * @throws {never}
 */
export function publicP256(key: unknown): boolean {
  if (key === null || typeof key !== "object") return false;
  const jwk = key as Record<string, unknown>;
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || typeof jwk.kid !== "string" || jwk.d !== undefined) return false;
  try {
    createPublicKey({ key: jwk, format: "jwk" });
    return true;
  } catch {
    return false;
  }
}
