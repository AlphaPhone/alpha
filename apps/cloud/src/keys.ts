// spec/cloud/rollout.md, "Reading the secrets generates each missing internal secret once, except in a frozen rollout, and they are complete only when every one is there and fits its environment"
import { createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes } from "node:crypto";

/**
 * Thirty-two random bytes, base64url: a digest, sealing, email-code or connector-token key.
 * @throws {never}
 */
export function randomKey(): string {
  return randomBytes(32).toString("base64url");
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
 * How many bytes a base64url value holds.
 * @throws {never}
 */
export function base64urlBytes(value: string): number {
  return Buffer.from(value, "base64url").length;
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
    createPublicKey({ key: jwk as never, format: "jwk" });
    return true;
  } catch {
    return false;
  }
}
