// spec/cloud/index.md, "Story: Serve one reviewed profile"
import type { CloudProfile } from "@elizaos/cloud/profile";
import { Schema } from "effect";
import { OperatorInputs } from "../src/profile.vibe";
import operator from "./fixtures/operator.json" with { type: "json" };
import resources from "./fixtures/resources.json" with { type: "json" };

/** Operator inputs whose every value is fictitious and accepted by the inputs' shape. */
export const operatorInputs = Schema.decodeUnknownSync(OperatorInputs, { onExcessProperty: "error" })(operator);

/** Cloudflare resources: production provisioned, staging still a placeholder. */
export const testResources = resources;

/** A release signer whose rotation was approved: its previous certificate is still registered. */
export const rotatedSigner = {
  signerSha256: "edbfcacb1da689008bf4e7d675176c302decf83161a877eb8b1de4ffae0445ed",
  apkSigningRotation: { approval: "approved", previousSignerSha256: "1".repeat(64) },
};

/** The staging environment as a loopback Cloud serves it in a journey: loopback mail, and billing at the payment provider's fake. */
export function loopbackProfile(profile: CloudProfile, billingApi: string): CloudProfile {
  const staging = profile.environments.staging;
  return { ...profile, environments: { ...profile.environments, staging: { ...staging, mail: { kind: "loopback" }, billing: staging.billing === undefined ? undefined : { ...staging.billing, apiUrl: billingApi } } } };
}
