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
 * Thirty-two random bytes, standard base64: a 256-bit AES-GCM sealing key.
 * @throws {never}
 */
export function sealingKey(): string {
  return randomBytes(32).toString("base64");
}

/**
 * Thirty-two random bytes as 64 lower-case hex characters: the Google connector token encryption key.
 * @throws {never}
 */
export function hexKey(): string {
  return randomBytes(32).toString("hex");
}

/**
 * A new P-256 entitlement signing key, as PKCS #8 DER in base64.
 * @throws {never}
 */
export function entitlementKey(): string {
  return generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
}

/**
 * The public JWK of an EC P-256 entitlement signing key, which the operator records in the inputs.
 * @throws {Error} the key is not PKCS #8 DER EC P-256
 */
export function entitlementPublicKey(signingKey: string): { kty: "EC"; crv: "P-256"; x: string; y: string } {
  const { kty, crv, x, y } = createPublicKey(createPrivateKey({ key: Buffer.from(signingKey, "base64"), format: "der", type: "pkcs8" })).export({ format: "jwk" });
  if (kty !== "EC" || crv !== "P-256" || typeof x !== "string" || typeof y !== "string") {
    throw new RangeError("the entitlement key is not EC P-256");
  }
  return { kty, crv, x, y };
}

/**
 * Whether a value parses as a PKCS #8 DER EC P-256 entitlement signing key.
 * @throws {never}
 */
export function isEntitlementKey(signingKey: string): boolean {
  try {
    entitlementPublicKey(signingKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * How many bytes a base64url value holds.
 * @throws {never}
 */
export function base64urlBytes(value: string): number {
  return Buffer.from(value, "base64url").length;
}

/**
 * Decoded byte length of a base64 sealing key, or -1 if it contains non-base64 characters.
 * @throws {never}
 */
export function sealingKeyBytes(value: string): number {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return -1;
  return Buffer.from(value, "base64").length;
}

/**
 * Whether a value is a 64-character hex string representing a 32-byte key.
 * @throws {never}
 */
export function isHexKey(value: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(value);
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
