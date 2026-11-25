// spec/cloud/index.md, "Story: Know which cloud the app talks to"
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { deployment } from "../src/deployment.vibe";

describe(`the deployments (spec/cloud/index.md, "Story: Know which cloud the app talks to")`, () => {
  it("names the cloud of each environment, and refuses a name it does not hold", async () => {
    const rows = await Effect.runPromise(Effect.all(["local", "staging", "production"].map(deployment)));
    expect(rows.map((row) => (row.kind === "hosted" ? [row.profile, row.cloud, row.appLinkHost, row.cutoverCandidate.cloud, row.cutoverCandidate.appLinkHost] : [row.profile]))).toEqual([
      ["staging"],
      ["staging", "https://api-staging.eliza.app", "staging.eliza.app", "https://api-staging.alphaphone.dev", "cloud-staging.alphaphone.dev"],
      ["production", "https://api.eliza.app", "eliza.app", "https://api.alphaphone.dev", "cloud.alphaphone.dev"],
    ]);
    const refused = await Effect.runPromise(Effect.flip(deployment("preview")));
    expect(refused).toMatchObject({ _tag: "UnknownDeployment", name: "preview" });
  });
});
