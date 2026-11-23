// spec/cloud/deployment.md, "Story: Configure a deployment from one reviewed profile"
import { Schema } from "effect";
import { OperatorInputs } from "../src/profile.vibe";
import operator from "./fixtures/operator.json" with { type: "json" };
import resources from "./fixtures/resources.json" with { type: "json" };

/** Test-only operator inputs: every value is fictitious and accepted by the profile schema. */
export const operatorInputs: OperatorInputs = Schema.decodeUnknownSync(OperatorInputs, { onExcessProperty: "error" })(operator);

/** Test-only Cloudflare resources: production provisioned, staging still a placeholder. */
export const testResources = resources;

/** A release signer record with an approved rotation. */
export const rotatedSigner = {
  signerSha256: "edbfcacb1da689008bf4e7d675176c302decf83161a877eb8b1de4ffae0445ed",
  apkSigningRotation: { approval: "approved", previousSignerSha256: "1111111111111111111111111111111111111111111111111111111111111111" },
};

/** Alpha Phone's identity as app.config.json records it. */
export const identity = { appId: "ai.alphacompute.alphaphone", appName: "Alpha Phone", slug: "alphaphone" };
