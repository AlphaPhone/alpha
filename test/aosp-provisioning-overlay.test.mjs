// Provisioning overlay rendering from a fabricated aapt xmltree; not image or boot evidence.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { provisioningComponents, renderProvisioningOverlay, requestsAllFilesAccess, writeProvisioningOverlay } from "../scripts/aosp-provisioning-overlay.ts";

const PKG = "ai.alphacompute.alphaphone";
const str = value => `"${value}" (Raw: "${value}")`;
const element = (indent, tag, attrs = {}) => [`${" ".repeat(indent)}E: ${tag} (line=1)`,
  ...Object.entries(attrs).map(([key, value]) => `${" ".repeat(indent + 2)}A: android:${key}(0x01010003)=${value.startsWith("(") ? value : str(value)}`)];
const filter = (indent, action, categories = []) => [...element(indent, "intent-filter"), ...element(indent + 2, "action", { name: action }),
  ...categories.flatMap(name => element(indent + 2, "category", { name }))];
function tree({ homes = 1, autofillPermission = "android.permission.BIND_AUTOFILL_SERVICE", allFiles = true } = {}) {
  return ["N: android=http://schemas.android.com/apk/res/android", "  E: manifest (line=2)",
    ...element(4, "uses-permission", { name: "android.permission.RECORD_AUDIO" }),
    ...(allFiles ? element(4, "uses-permission", { name: "android.permission.MANAGE_EXTERNAL_STORAGE" }) : []),
    "    E: application (line=3)",
    ...Array.from({ length: homes }, (_, i) => [...element(6, "activity", { name: `${PKG}.${i ? "Other" : "Main"}Activity`, exported: "(type 0x12)0xffffffff" }),
      ...filter(8, "android.intent.action.MAIN", ["android.intent.category.LAUNCHER"]),
      ...filter(8, "android.intent.action.MAIN", ["android.intent.category.HOME", "android.intent.category.DEFAULT"])]).flat(),
    ...element(6, "activity", { name: `${PKG}.AlphaAssistActivity`, exported: "(type 0x12)0xffffffff" }), ...filter(8, "android.intent.action.ASSIST", ["android.intent.category.DEFAULT"]),
    ...element(6, "service", { name: "ai.eliza.plugins.passwords.ElizaPasswordAutofillService", permission: autofillPermission, exported: "(type 0x12)0xffffffff" }), ...filter(8, "android.service.autofill.AutofillService"),
    ...element(6, "service", { name: `${PKG}.ElizaAgentService` }),
  ].join("\n");
}

test("components come from the APK manifest and must be unique", () => {
  assert.deepEqual(provisioningComponents(tree(), PKG), {
    home: `${PKG}.MainActivity`, assistant: `${PKG}.AlphaAssistActivity`, autofill: "ai.eliza.plugins.passwords.ElizaPasswordAutofillService",
  });
  assert.throws(() => provisioningComponents(tree({ homes: 0 }), PKG), /HOME/);
  assert.throws(() => provisioningComponents(tree({ homes: 2 }), PKG), /exactly one/);
  assert.throws(() => provisioningComponents(tree({ autofillPermission: "none" }), PKG), /AUTOFILL/);
});

test("Files all-files access: the launcher must request MANAGE_EXTERNAL_STORAGE (granted as preinstalled)", () => {
  assert.equal(requestsAllFilesAccess(tree()), true);
  assert.equal(requestsAllFilesAccess(tree({ allFiles: false })), false);
  assert.throws(() => provisioningComponents(tree({ allFiles: false }), PKG), /MANAGE_EXTERNAL_STORAGE/);
  const files = renderProvisioningOverlay(PKG, provisioningComponents(tree(), PKG));
  assert.match(files["provisioning/README.md"], /MANAGE_EXTERNAL_STORAGE/);
  assert.match(fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8"), /<uses-permission android:name="android\.permission\.MANAGE_EXTERNAL_STORAGE"/);
});

test("the overlay sets default HOME, assistant and Autofill offer additively", t => {
  const files = renderProvisioningOverlay(PKG, provisioningComponents(tree(), PKG));
  assert.match(files["provisioning/overlay/frameworks/base/core/res/res/values/config.xml"], new RegExp(`config_defaultAssistant" translatable="false">${PKG}<`));
  assert.match(files["provisioning/overlay/frameworks/base/core/res/res/values/config.xml"], /config_defaultAutofillService" translatable="false">ai\.alphacompute\.alphaphone\/ai\.eliza\.plugins\.passwords\.ElizaPasswordAutofillService</);
  assert.match(files["provisioning/preferred-apps/launcher-home.xml"], /<item name="ai\.alphacompute\.alphaphone\/ai\.alphacompute\.alphaphone\.MainActivity"/);
  assert.match(files["provisioning/preferred-apps/launcher-home.xml"], /android\.intent\.category\.HOME/);
  assert.doesNotMatch(files.productMakefile, /LOCAL_OVERRIDES_PACKAGES|Launcher3/, "the stock launcher stays as a recovery path");
  assert.doesNotMatch(files.productMakefile, /\bALPHA_/);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-provision-"));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  fs.writeFileSync(path.join(out, "product.mk"), "PRODUCT_PACKAGES += AlphaPhone\n");
  writeProvisioningOverlay(out, PKG, provisioningComponents(tree(), PKG));
  assert.match(fs.readFileSync(path.join(out, "product.mk"), "utf8"), /PRODUCT_PACKAGE_OVERLAYS \+= \$\(launcher_provisioning_dir\)\/overlay/);
  assert.ok(fs.existsSync(path.join(out, "provisioning/preferred-apps/launcher-home.xml")));
  assert.throws(() => writeProvisioningOverlay(out, PKG, provisioningComponents(tree(), PKG)), /EEXIST/);
});

test("stage-aosp gates the overlay behind --production, never with --development", () => {
  const source = fs.readFileSync("scripts/stage-aosp.ts", "utf8");
  assert.match(source, /if \(production && development\) throw/);
  assert.match(source, /const tree = execFileSync\(tool\("aapt"\), \["dump", "xmltree", apk, "AndroidManifest\.xml"\]/);
  assert.match(source, /if \(production\) \{\n  const components = provisioningComponents\(tree, identity\.appId\);/);
});

test("the image grants the launcher its runtime permissions on first boot, revocably, alongside the one privileged permission", async () => {
  const { LAUNCHER_DEFAULT_PERMISSIONS, LAUNCHER_PRIVILEGED_PERMISSIONS } = await import("../scripts/stage-aosp.ts");
  const { renderOverlay } = await import("../vendor/eliza/packages/os/scripts/android/stage-launcher-overlay.ts");
  // The shared stager refuses a grant the APK does not declare; the launcher build merges these two manifests.
  const declared = ["main", "launcher"].map(flavor => fs.readFileSync(`android/app/src/${flavor}/AndroidManifest.xml`, "utf8")).join("\n");
  for (const permission of LAUNCHER_DEFAULT_PERMISSIONS)
    assert.match(declared, new RegExp(`<uses-permission android:name="${permission.replaceAll(".", "\\.")}"(?![^>]*tools:node="remove")`), permission);
  // Every step of the startup access walkthrough that is an Android runtime permission is covered.
  for (const name of ["POST_NOTIFICATIONS", "RECORD_AUDIO", "CAMERA", "ACCESS_FINE_LOCATION", "READ_CALENDAR", "READ_MEDIA_IMAGES"])
    assert.ok(LAUNCHER_DEFAULT_PERMISSIONS.includes(`android.permission.${name}`), name);
  const overlay = renderOverlay({ schemaVersion: 1, brand: "alphaphone", moduleName: "AlphaPhone", packageName: PKG, apkSha256: "a".repeat(64), certificateSha256: "b".repeat(64), defaultPermissions: LAUNCHER_DEFAULT_PERMISSIONS, privilegedPermissions: LAUNCHER_PRIVILEGED_PERMISSIONS });
  assert.match(overlay.permissions, new RegExp(`<exception package="${PKG}">`));
  for (const permission of LAUNCHER_DEFAULT_PERMISSIONS) assert.ok(overlay.permissions.includes(`<permission name="${permission}" fixed="false"/>`), permission);
  assert.match(overlay.blueprint, /sub_dir: "default-permissions"/);
  assert.match(overlay.blueprint, /privileged: true/);
  assert.match(overlay.product, /AlphaPhoneDefaultPermissions/);
});
