// spec/app/image/index.md, "Story: Stage Alpha into an image"
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { production, signInCallbackPath, updateManifestUrl } from "../capacitor.config.ts";
import { hostProfile } from "../scripts/android.ts";

const appDir = join(import.meta.dirname, "..");

/** Placeholder names referenced in Android manifests other than Gradle's built-in applicationId. */
function manifestPlaceholderRefs(file: string): string[] {
  const xml = readFileSync(join(appDir, file), "utf8");
  return [...new Set([...xml.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((m) => m[1] ?? ""))]
    .filter((name) => name !== "" && name !== "applicationId")
    .toSorted();
}

describe("Android host profile manifest placeholders (spec/app/image/index.md, \"Story: Stage Alpha into an image\")", () => {
  it("supplies every manifest placeholder required by main and launcher Android manifests and deduplicates computed BuildConfig fields", () => {
    const profile = hostProfile();
    const placeholders = profile.manifestPlaceholders as Record<string, string>;
    const required = [
      ...manifestPlaceholderRefs("android/app/manifests/main/AndroidManifest.xml"),
      ...manifestPlaceholderRefs("android/app/manifests/launcher/AndroidManifest.xml"),
    ];
    for (const name of required) {
      expect(typeof placeholders[name], `missing manifest placeholder ${name}`).toBe("string");
      expect(placeholders[name]?.length ?? 0, `empty manifest placeholder ${name}`).toBeGreaterThan(0);
    }

    const expectedManifestDigest = `sha256:${createHash("sha256").update(updateManifestUrl).digest("hex")}`;
    expect(placeholders).toMatchObject({
      appOrientation: "unspecified",
      appLinkHost: production.appLinkHost,
      signInCallbackPath,
      alphaUpdateChannel: "public",
      alphaUpdateManifestSha256: expectedManifestDigest,
    });

    const fields = profile.buildConfigFields as readonly { readonly name: string; readonly type: string; readonly value: unknown }[];
    const updateUrlFields = fields.filter((field) => field.name === "ALPHA_UPDATE_MANIFEST_URL");
    expect(updateUrlFields).toEqual([{ name: "ALPHA_UPDATE_MANIFEST_URL", type: "String", value: updateManifestUrl }]);
    expect(fields.filter((field) => field.name === "CLOUD_API_ORIGIN")).toEqual([{ name: "CLOUD_API_ORIGIN", type: "String", value: production.cloud }]);
    expect(fields.filter((field) => field.name === "CLOUD_APP_LINK_HOST")).toEqual([{ name: "CLOUD_APP_LINK_HOST", type: "String", value: production.appLinkHost }]);
  });
});
