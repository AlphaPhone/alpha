#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type AssetsProfile = "core" | "thin" | "ocr";
export type SurfaceKind = "overlay" | "app";

export interface IntentFilterSpec {
  readonly action: string;
  readonly category?: string;
  readonly browsable?: boolean;
  readonly scheme?: string;
  readonly mimeType?: string;
}

export interface SuiteAppEntry {
  readonly id: string;
  readonly view: string | null;
  readonly surface: SurfaceKind;
  readonly applicationId: string;
  readonly label: string;
  readonly defaultRoles: readonly string[];
  readonly intentFilters: readonly IntentFilterSpec[];
  readonly permissions: readonly string[];
  readonly allowedAgentRoutePrefixes: readonly string[];
  readonly allowedCloudRoutePrefixes: readonly string[];
  readonly allowedSecureStoreSlots: readonly string[];
  readonly assetsProfile: AssetsProfile;
  readonly imageOnly: boolean;
  readonly taskAffinity: string;
}

export interface SuiteRegistry {
  readonly schemaVersion: 1;
  readonly corePackage: string;
  readonly ipcPermission: string;
  readonly apps: readonly SuiteAppEntry[];
}

export interface GeneratedOutput {
  readonly relativePath: string;
  readonly content: string;
  readonly sha256: string;
}

const SUITE_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REGISTRY_PATH = join(SUITE_DIR, "apps.json");
const DEFAULT_OUT_DIR = join(SUITE_DIR, "generated");
const DEFAULT_IPC_POLICY_PATH = resolve(SUITE_DIR, "../alpha-ipc/src/main/assets/alpha-suite-policy.json");
const EXPECTED_VIEWS = new Set([
  "Phone", "Messages", "Contacts", "Browser", "Inbox", "Telegram", "Slack",
  "Calendar", "Clock", "Reminders", "Camera", "Photos", "Maps", "Notes",
  "Files", "Workflows", "Wallet", "Settings",
]);

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(obj: Record<string, unknown>, key: string, context: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${context}: expected non-empty string for "${key}"`);
  }
  return value;
}

function requireStringArray(obj: Record<string, unknown>, key: string, context: string): readonly string[] {
  const value = obj[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${context}: expected string[] for "${key}"`);
  }
  return value as readonly string[];
}

function parseIntentFilter(raw: unknown, context: string): IntentFilterSpec {
  if (!isRecord(raw)) throw new Error(`${context}: intent filter must be an object`);
  const action = requireString(raw, "action", context);
  const category = raw.category === undefined ? undefined : requireString(raw, "category", context);
  const browsable = raw.browsable === undefined ? undefined : Boolean(raw.browsable);
  const scheme = raw.scheme === undefined ? undefined : requireString(raw, "scheme", context);
  const mimeType = raw.mimeType === undefined ? undefined : requireString(raw, "mimeType", context);
  return {
    action,
    ...(category === undefined ? {} : { category }),
    ...(browsable === undefined ? {} : { browsable }),
    ...(scheme === undefined ? {} : { scheme }),
    ...(mimeType === undefined ? {} : { mimeType }),
  };
}

function parseAppEntry(raw: unknown, index: number): SuiteAppEntry {
  const context = `apps[${index}]`;
  if (!isRecord(raw)) throw new Error(`${context}: must be an object`);
  const id = requireString(raw, "id", context);
  if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new Error(`${context}: invalid id "${id}"`);
  const rawView = raw.view;
  const view = rawView === null ? null : typeof rawView === "string" && rawView.trim() !== "" ? rawView : null;
  if (rawView !== null && view === null) throw new Error(`${context}: view must be string or null`);
  const surfaceRaw = requireString(raw, "surface", context);
  if (surfaceRaw !== "overlay" && surfaceRaw !== "app") {
    throw new Error(`${context}: surface must be "overlay" or "app", got "${surfaceRaw}"`);
  }
  const applicationId = requireString(raw, "applicationId", context);
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(applicationId)) {
    throw new Error(`${context}: invalid applicationId "${applicationId}"`);
  }
  const label = requireString(raw, "label", context);
  const defaultRoles = requireStringArray(raw, "defaultRoles", context);
  if (!Array.isArray(raw.intentFilters)) throw new Error(`${context}: intentFilters must be an array`);
  const intentFilters = raw.intentFilters.map((item, idx) => parseIntentFilter(item, `${context}.intentFilters[${idx}]`));
  const permissions = requireStringArray(raw, "permissions", context);
  const allowedAgentRoutePrefixes = requireStringArray(raw, "allowedAgentRoutePrefixes", context);
  const allowedCloudRoutePrefixes = requireStringArray(raw, "allowedCloudRoutePrefixes", context);
  const allowedSecureStoreSlots = requireStringArray(raw, "allowedSecureStoreSlots", context);
  for (const prefix of [...allowedAgentRoutePrefixes, ...allowedCloudRoutePrefixes]) {
    if (prefix !== "*" && !prefix.startsWith("/")) {
      throw new Error(`${context}: route prefix "${prefix}" must be "*" or start with "/"`);
    }
  }
  const profileRaw = requireString(raw, "assetsProfile", context);
  if (profileRaw !== "core" && profileRaw !== "thin" && profileRaw !== "ocr") {
    throw new Error(`${context}: invalid assetsProfile "${profileRaw}"`);
  }
  if (typeof raw.imageOnly !== "boolean") throw new Error(`${context}: imageOnly must be boolean`);
  const taskAffinity = requireString(raw, "taskAffinity", context);
  return {
    id,
    view,
    surface: surfaceRaw,
    applicationId,
    label,
    defaultRoles,
    intentFilters,
    permissions,
    allowedAgentRoutePrefixes,
    allowedCloudRoutePrefixes,
    allowedSecureStoreSlots,
    assetsProfile: profileRaw,
    imageOnly: raw.imageOnly,
    taskAffinity,
  };
}

/** Reads and rigorously validates {@code apps/app/android/suite/apps.json}. */
export function loadSuiteRegistry(registryPath: string = DEFAULT_REGISTRY_PATH): SuiteRegistry {
  const raw: unknown = JSON.parse(readFileSync(registryPath, "utf8"));
  if (!isRecord(raw)) throw new Error("apps.json root must be an object");
  if (raw.schemaVersion !== 1) throw new Error(`Unsupported schemaVersion: ${String(raw.schemaVersion)}`);
  const corePackage = requireString(raw, "corePackage", "root");
  const ipcPermission = requireString(raw, "ipcPermission", "root");
  if (!Array.isArray(raw.apps)) throw new Error("root.apps must be an array");
  const apps = raw.apps.map((entry, index) => parseAppEntry(entry, index));

  const seenIds = new Set<string>();
  const seenPackages = new Set<string>();
  const seenViews = new Set<string>();
  let coreCount = 0;

  for (const app of apps) {
    if (seenIds.has(app.id)) throw new Error(`Duplicate app id: ${app.id}`);
    seenIds.add(app.id);
    if (seenPackages.has(app.applicationId)) throw new Error(`Duplicate applicationId: ${app.applicationId}`);
    seenPackages.add(app.applicationId);
    if (app.id === "core") {
      coreCount += 1;
      if (app.applicationId !== corePackage) throw new Error("core entry applicationId must match corePackage");
      if (app.view !== null || app.surface !== "overlay") throw new Error("core entry must have view=null and surface=overlay");
    } else {
      if (app.view === null || app.surface !== "app") throw new Error(`App "${app.id}" must have non-null view and surface="app"`);
      if (!EXPECTED_VIEWS.has(app.view)) throw new Error(`App "${app.id}" references unknown view "${app.view}"`);
      if (seenViews.has(app.view)) throw new Error(`Duplicate view "${app.view}"`);
      seenViews.add(app.view);
    }
  }
  if (coreCount !== 1) throw new Error(`Expected exactly 1 core entry, found ${coreCount}`);
  for (const expectedView of EXPECTED_VIEWS) {
    if (!seenViews.has(expectedView)) throw new Error(`Missing required view in apps.json: ${expectedView}`);
  }
  return { schemaVersion: 1, corePackage, ipcPermission, apps };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function renderIntentFilter(filter: IntentFilterSpec): string {
  const lines: string[] = ["            <intent-filter>"];
  lines.push(`                <action android:name="${escapeXml(filter.action)}" />`);
  if (filter.category !== undefined) {
    lines.push(`                <category android:name="${escapeXml(filter.category)}" />`);
  }
  if (filter.browsable === true) {
    lines.push(`                <category android:name="android.intent.category.BROWSABLE" />`);
  }
  if (filter.scheme !== undefined && filter.mimeType !== undefined) {
    lines.push(`                <data android:scheme="${escapeXml(filter.scheme)}" android:mimeType="${escapeXml(filter.mimeType)}" />`);
  } else if (filter.scheme !== undefined) {
    lines.push(`                <data android:scheme="${escapeXml(filter.scheme)}" />`);
  } else if (filter.mimeType !== undefined) {
    lines.push(`                <data android:mimeType="${escapeXml(filter.mimeType)}" />`);
  }
  lines.push("            </intent-filter>");
  return lines.join("\n");
}

interface FlavorPluginProfile {
  readonly modules: readonly string[];
  readonly sourceDirs: readonly string[];
  readonly resDirs?: readonly string[];
  readonly pluginClasses: readonly string[];
}

const FLAVOR_PLUGIN_PROFILES: Readonly<Record<string, FlavorPluginProfile>> = {
  phone: {
    modules: [":eliza-messages", ":eliza-phone", ":eliza-contacts"],
    sourceDirs: ["src/plugins/telephony/java", "src/plugins/contacts/java"],
    pluginClasses: ["ai.alphacompute.thinapp.ThinTelephonyPlugin", "ai.alphacompute.thinapp.ThinContactsPlugin"],
  },
  messages: {
    modules: [":eliza-messages", ":eliza-phone", ":eliza-contacts"],
    sourceDirs: ["src/plugins/telephony/java", "src/plugins/contacts/java"],
    pluginClasses: ["ai.alphacompute.thinapp.ThinTelephonyPlugin", "ai.alphacompute.thinapp.ThinContactsPlugin"],
  },
  contacts: {
    modules: [":eliza-messages", ":eliza-phone", ":eliza-contacts"],
    sourceDirs: ["src/plugins/telephony/java", "src/plugins/contacts/java"],
    pluginClasses: ["ai.alphacompute.thinapp.ThinTelephonyPlugin", "ai.alphacompute.thinapp.ThinContactsPlugin"],
  },
  browser: {
    modules: [":eliza-browser-surface"],
    sourceDirs: ["src/plugins/browser/java"],
    resDirs: ["src/plugins/browser/res"],
    pluginClasses: [
      "ai.eliza.plugins.browsersurface.ElizaSurfaceManagerPlugin",
      "ai.alphacompute.thinapp.ThinBrowserPlugin",
    ],
  },
  calendar: {
    modules: [":eliza-calendar"],
    sourceDirs: ["src/plugins/calendar/java"],
    pluginClasses: ["ai.alphacompute.thinapp.ThinCalendarPlugin"],
  },
  clock: {
    modules: [":eliza-system"],
    sourceDirs: ["src/plugins/system/java"],
    pluginClasses: ["ai.alphacompute.thinapp.ThinSystemPlugin"],
  },
  reminders: {
    modules: [":eliza-reminders"],
    sourceDirs: ["src/plugins/reminders/java"],
    pluginClasses: ["ai.alphacompute.thinapp.ThinRemindersPlugin"],
  },
  camera: {
    modules: [":eliza-camera", ":eliza-media"],
    sourceDirs: ["src/plugins/media/java"],
    pluginClasses: [
      "ai.eliza.plugins.camera.CameraPlugin",
      "ai.alphacompute.thinapp.ThinPhotosPlugin",
      "ai.alphacompute.thinapp.ThinPhotoLibraryPlugin",
      "ai.alphacompute.thinapp.ThinPhotosPermissionsPlugin",
    ],
  },
  photos: {
    modules: [":eliza-media"],
    sourceDirs: ["src/plugins/media/java"],
    pluginClasses: [
      "ai.alphacompute.thinapp.ThinPhotosPlugin",
      "ai.alphacompute.thinapp.ThinPhotoLibraryPlugin",
      "ai.alphacompute.thinapp.ThinPhotosPermissionsPlugin",
    ],
  },
  maps: {
    modules: [":eliza-location"],
    sourceDirs: [],
    pluginClasses: ["ai.eliza.plugins.location.LocationPlugin"],
  },
  files: {
    modules: [":eliza-filesystem", ":eliza-media"],
    sourceDirs: ["src/plugins/files/java", "src/plugins/media/java"],
    pluginClasses: [
      "ai.alphacompute.thinapp.ThinFilesPlugin",
      "ai.alphacompute.thinapp.ThinPhotosPermissionsPlugin",
    ],
  },
  workflows: {
    modules: [":eliza-system", ":eliza-calendar"],
    sourceDirs: ["src/plugins/system/java", "src/plugins/calendar/java"],
    pluginClasses: [
      "ai.alphacompute.thinapp.ThinSystemPlugin",
      "ai.alphacompute.thinapp.ThinCalendarPlugin",
    ],
  },
  settings: {
    modules: [
      ":eliza-system",
      ":eliza-wifi",
      ":eliza-location",
      ":eliza-filesystem",
      ":eliza-media",
      ":eliza-calendar",
      ":eliza-contacts",
    ],
    sourceDirs: [
      "src/plugins/system/java",
      "src/plugins/files/java",
      "src/plugins/media/java",
      "src/plugins/calendar/java",
      "src/plugins/contacts/java",
    ],
    pluginClasses: [
      "ai.alphacompute.thinapp.ThinSystemPlugin",
      "ai.eliza.plugins.system.SensePlugin",
      "ai.eliza.plugins.wifi.WiFiPlugin",
      "ai.eliza.plugins.location.LocationPlugin",
      "ai.alphacompute.thinapp.ThinFilesPlugin",
      "ai.alphacompute.thinapp.ThinPhotosPermissionsPlugin",
      "ai.alphacompute.thinapp.ThinCalendarPlugin",
      "ai.alphacompute.thinapp.ThinContactsPlugin",
    ],
  },
};

function renderOptionalFeatures(permissions: readonly string[]): readonly string[] {
  const permSet = new Set(permissions);
  const features: string[] = [];
  if (permSet.has("android.permission.CAMERA")) {
    features.push("android.hardware.camera", "android.hardware.camera.autofocus");
  }
  if (permSet.has("android.permission.RECORD_AUDIO")) {
    features.push("android.hardware.microphone");
  }
  if (permSet.has("android.permission.ACCESS_FINE_LOCATION") || permSet.has("android.permission.ACCESS_COARSE_LOCATION")) {
    features.push("android.hardware.location", "android.hardware.location.gps");
  }
  if (permSet.has("android.permission.ACCESS_WIFI_STATE")) {
    features.push("android.hardware.wifi");
  }
  if (permSet.has("android.permission.CALL_PHONE") || permSet.has("android.permission.SEND_SMS")) {
    features.push("android.hardware.telephony");
  }
  return features.map((name) => `    <uses-feature android:name="${name}" android:required="false" />`);
}

function renderQueries(registry: SuiteRegistry, app: SuiteAppEntry): readonly string[] {
  const packages = new Set<string>([
    registry.corePackage,
    "proton.android.pass",
    "ai.alphacompute.alphaphone.sense",
    "com.android.systemui",
  ]);
  for (const sibling of registry.apps) {
    if (sibling.applicationId !== app.applicationId) {
      packages.add(sibling.applicationId);
    }
  }
  const packageLines = [...packages].map((pkg) => `        <package android:name="${escapeXml(pkg)}" />`);
  return [
    `    <queries>`,
    ...packageLines,
    `        <intent>`,
    `            <action android:name="android.intent.action.VIEW" />`,
    `            <category android:name="android.intent.category.BROWSABLE" />`,
    `            <data android:scheme="https" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.intent.action.VIEW" />`,
    `            <data android:scheme="geo" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.intent.action.DIAL" />`,
    `            <data android:scheme="tel" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.intent.action.SENDTO" />`,
    `            <data android:scheme="mailto" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.intent.action.SENDTO" />`,
    `            <data android:scheme="smsto" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.intent.action.SET_ALARM" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.intent.action.SHOW_ALARMS" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.intent.action.DISMISS_ALARM" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.intent.action.SNOOZE_ALARM" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.support.customtabs.action.CustomTabsService" />`,
    `        </intent>`,
    `        <intent>`,
    `            <action android:name="android.settings.SETTINGS" />`,
    `        </intent>`,
    `    </queries>`,
  ];
}

function renderFlavorComponents(app: SuiteAppEntry): readonly string[] {
  if (app.id === "browser") {
    return [
      `        <provider`,
      `            android:name="androidx.core.content.FileProvider"`,
      `            android:authorities="\${applicationId}.browser.fileprovider"`,
      `            android:exported="false"`,
      `            android:grantUriPermissions="true">`,
      `            <meta-data`,
      `                android:name="android.support.FILE_PROVIDER_PATHS"`,
      `                android:resource="@xml/alpha_browser_file_paths" />`,
      `        </provider>`,
    ];
  }
  if (app.id === "reminders") {
    return [
      `        <receiver`,
      `            android:name="ai.alphacompute.thinapp.ThinReminderReceiver"`,
      `            android:exported="false">`,
      `            <intent-filter>`,
      `                <action android:name="android.intent.action.BOOT_COMPLETED" />`,
      `                <action android:name="android.intent.action.TIME_SET" />`,
      `                <action android:name="android.intent.action.TIMEZONE_CHANGED" />`,
      `            </intent-filter>`,
      `        </receiver>`,
    ];
  }
  if (app.id === "phone" || app.id === "messages" || app.id === "contacts") {
    return [
      `        <receiver`,
      `            android:name="ai.alphacompute.thinapp.ThinSmsSendReceiver"`,
      `            android:exported="false" />`,
    ];
  }
  return [];
}

function renderFlavorPluginsJava(app: SuiteAppEntry): string {
  const profile = FLAVOR_PLUGIN_PROFILES[app.id];
  const calls = (profile?.pluginClasses ?? []).map(
    (cls) => `        activity.registerThinPlugin(${cls}.class);`,
  );
  return [
    `package ai.alphacompute.thinapp;`,
    ``,
    `/** Generated per-flavor native Capacitor plugin registrar for {@code ${app.id}}. */`,
    `final class FlavorPlugins {`,
    `    private FlavorPlugins() {}`,
    ``,
    `    static void register(ThinAppActivity activity) {`,
    ...calls,
    `    }`,
    `}`,
    ``,
  ].join("\n");
}

function renderThinManifest(registry: SuiteRegistry, app: SuiteAppEntry): string {
  const permSet = new Set(app.permissions);
  const permissionLines = [
    registry.ipcPermission,
    ...app.permissions.filter((perm) => perm !== registry.ipcPermission),
  ].map((perm) => `    <uses-permission android:name="${escapeXml(perm)}" />`);

  if (permSet.has("android.permission.READ_MEDIA_IMAGES") && !permSet.has("android.permission.READ_EXTERNAL_STORAGE")) {
    permissionLines.push(
      `    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" tools:replace="android:maxSdkVersion" />`,
    );
  }
  if (app.id === "files" && !permSet.has("android.permission.WRITE_EXTERNAL_STORAGE")) {
    permissionLines.push(
      `    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" tools:replace="android:maxSdkVersion" />`,
    );
  }

  const featureLines = renderOptionalFeatures(app.permissions);
  const queryLines = renderQueries(registry, app);
  const extraFilters = app.intentFilters.map(renderIntentFilter);
  const flavorComponents = renderFlavorComponents(app);

  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<manifest xmlns:android="http://schemas.android.com/apk/res/android"`,
    `    xmlns:tools="http://schemas.android.com/tools">`,
    ...permissionLines,
    ...featureLines,
    ...queryLines,
    `    <application android:label="${escapeXml(app.label)}">`,
    `        <activity`,
    `            android:name="ai.alphacompute.thinapp.ThinAppActivity"`,
    `            android:label="${escapeXml(app.label)}"`,
    `            android:exported="true"`,
    `            android:launchMode="singleTask"`,
    `            android:taskAffinity="${escapeXml(app.taskAffinity)}"`,
    `            android:windowSoftInputMode="adjustResize"`,
    `            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|density|navigation"`,
    `            android:theme="@style/AlphaTheme.Launch">`,
    `            <intent-filter>`,
    `                <action android:name="android.intent.action.MAIN" />`,
    `                <category android:name="android.intent.category.LAUNCHER" />`,
    `            </intent-filter>`,
    ...extraFilters,
    `        </activity>`,
    `        <activity`,
    `            android:name="ai.alphacompute.runtime.AlphaAgentOpenActivity"`,
    `            android:exported="true"`,
    `            android:permission="${escapeXml(registry.ipcPermission)}"`,
    `            android:excludeFromRecents="true"`,
    `            android:noHistory="true"`,
    `            android:theme="@android:style/Theme.Translucent.NoTitleBar">`,
    `            <intent-filter>`,
    `                <action android:name="ai.alphacompute.action.AGENT_OPEN" />`,
    `                <category android:name="android.intent.category.DEFAULT" />`,
    `                <data android:scheme="alpha" android:host="${escapeXml(app.id)}" />`,
    `            </intent-filter>`,
    `        </activity>`,
    ...flavorComponents,
    `    </application>`,
    `</manifest>`,
    "",
  ].join("\n");
}

function renderFlavorsGradle(registry: SuiteRegistry): string {
  const thinApps = registry.apps.filter((app) => app.surface === "app");
  const blocks = thinApps.map((app) => [
    `        ${app.id} {`,
    `            dimension 'alphaApp'`,
    `            applicationId '${app.applicationId}'`,
    `            resValue 'string', 'app_name', '${app.label.replaceAll("'", "\\'")}'`,
    `            buildConfigField 'String', 'ALPHA_APP_ID', '"${app.id}"'`,
    `            buildConfigField 'String', 'ALPHA_VIEW', '"${app.view ?? ""}"'`,
    `            buildConfigField 'String', 'ALPHA_SURFACE', '"${app.surface}"'`,
    `            buildConfigField 'String', 'ALPHA_ASSETS_PROFILE', '"${app.assetsProfile}"'`,
    `            buildConfigField 'boolean', 'ALPHA_IMAGE_ONLY', '${String(app.imageOnly)}'`,
    `            manifestPlaceholders = [`,
    `                alphaAppId: '${app.id}',`,
    `                alphaAppLabel: '${app.label.replaceAll("'", "\\'")}',`,
    `                alphaTaskAffinity: '${app.taskAffinity}',`,
    `            ]`,
    `        }`,
  ].join("\n"));

  const sourceSetBlocks = thinApps.map((app) => {
    const profile = FLAVOR_PLUGIN_PROFILES[app.id];
    const javaDirs = [
      `file('../generated/flavors/${app.id}/java')`,
      ...(profile?.sourceDirs ?? []).map((dir) => `file('${dir}')`),
    ];
    const resLines = (profile?.resDirs ?? []).length > 0
      ? [`            res.srcDirs += [${(profile?.resDirs ?? []).map((dir) => `file('${dir}')`).join(", ")}]`]
      : [];
    return [
      `        ${app.id} {`,
      `            manifest.srcFile file('../generated/flavors/${app.id}/AndroidManifest.xml')`,
      `            java.srcDirs += [${javaDirs.join(", ")}]`,
      ...resLines,
      `            assets.srcDirs += [file('src/${app.id}/assets')]`,
      `        }`,
    ].join("\n");
  });

  const dependencyLines: string[] = [];
  for (const app of thinApps) {
    const profile = FLAVOR_PLUGIN_PROFILES[app.id];
    if (!profile) continue;
    for (const moduleName of profile.modules) {
      dependencyLines.push(`    ${app.id}Implementation project('${moduleName}')`);
    }
  }

  return [
    `android {`,
    `    flavorDimensions += 'alphaApp'`,
    `    productFlavors {`,
    ...blocks,
    `    }`,
    `    sourceSets {`,
    ...sourceSetBlocks,
    `    }`,
    `}`,
    ``,
    `dependencies {`,
    ...dependencyLines,
    `}`,
    "",
  ].join("\n");
}

/** Computes all deterministic generated files for the Alpha NEXT multi-APK suite. */
export function buildSuiteOutputs(registry: SuiteRegistry, registryRaw: string): readonly GeneratedOutput[] {
  const outputs: GeneratedOutput[] = [];
  const push = (relativePath: string, content: string) => {
    outputs.push({ relativePath, content, sha256: sha256Hex(content) });
  };

  for (const app of registry.apps) {
    if (app.surface !== "app") continue;
    push(`flavors/${app.id}/AndroidManifest.xml`, renderThinManifest(registry, app));
    push(`flavors/${app.id}/java/ai/alphacompute/thinapp/FlavorPlugins.java`, renderFlavorPluginsJava(app));
  }

  push("suite-flavors.gradle", renderFlavorsGradle(registry));

  const policyJson = `${JSON.stringify({
    schemaVersion: registry.schemaVersion,
    corePackage: registry.corePackage,
    ipcPermission: registry.ipcPermission,
    apps: registry.apps.map((app) => ({
      id: app.id,
      view: app.view,
      surface: app.surface,
      applicationId: app.applicationId,
      allowedAgentRoutePrefixes: app.allowedAgentRoutePrefixes,
      allowedCloudRoutePrefixes: app.allowedCloudRoutePrefixes,
      allowedSecureStoreSlots: app.allowedSecureStoreSlots,
      imageOnly: app.imageOnly,
    })),
  }, null, 2)}\n`;
  push("alpha-suite-policy.json", policyJson);

  const manifestJson = `${JSON.stringify({
    schemaVersion: 1,
    registrySha256: sha256Hex(registryRaw),
    corePackage: registry.corePackage,
    ipcPermission: registry.ipcPermission,
    counts: {
      total: registry.apps.length,
      core: registry.apps.filter((app) => app.surface === "overlay").length,
      thinApps: registry.apps.filter((app) => app.surface === "app").length,
      imageOnly: registry.apps.filter((app) => app.imageOnly).length,
      ocrApps: registry.apps.filter((app) => app.assetsProfile === "ocr").length,
    },
    apps: registry.apps.map((app) => ({
      id: app.id,
      view: app.view,
      surface: app.surface,
      applicationId: app.applicationId,
      label: app.label,
      defaultRoles: app.defaultRoles,
      assetsProfile: app.assetsProfile,
      imageOnly: app.imageOnly,
      viteEnv: app.surface === "overlay"
        ? { VITE_ALPHA_SURFACE: "overlay" }
        : { VITE_ALPHA_SURFACE: "app", VITE_ALPHA_VIEW: app.view },
      webOutDir: app.surface === "overlay" ? "dist-suite/overlay" : `dist-suite/${app.id}`,
      gradleTask: app.surface === "overlay" ? ":app:assembleLauncherRelease" : `:thin-app:assemble${app.id[0]?.toUpperCase() ?? ""}${app.id.slice(1)}Release`,
    })),
  }, null, 2)}\n`;
  push("suite-manifest.json", manifestJson);

  return outputs;
}

function main(argv: readonly string[]): number {
  const checkOnly = argv.includes("--check");
  const jsonOutput = argv.includes("--json");
  const outIndex = argv.indexOf("--out");
  const outDir = outIndex >= 0 && argv[outIndex + 1] ? resolve(argv[outIndex + 1] ?? DEFAULT_OUT_DIR) : DEFAULT_OUT_DIR;
  const registryIndex = argv.indexOf("--registry");
  const registryPath = registryIndex >= 0 && argv[registryIndex + 1]
    ? resolve(argv[registryIndex + 1] ?? DEFAULT_REGISTRY_PATH)
    : DEFAULT_REGISTRY_PATH;

  const registryRaw = readFileSync(registryPath, "utf8");
  const registry = loadSuiteRegistry(registryPath);
  const outputs = buildSuiteOutputs(registry, registryRaw);

  const drifted: string[] = [];
  const written: string[] = [];

  for (const output of outputs) {
    const target = join(outDir, output.relativePath);
    const current = existsSync(target) ? readFileSync(target, "utf8") : undefined;
    if (current === output.content) continue;
    if (checkOnly) {
      drifted.push(output.relativePath);
    } else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, output.content, "utf8");
      written.push(output.relativePath);
    }
  }

  const policyOutput = outputs.find((item) => item.relativePath === "alpha-suite-policy.json");
  if (policyOutput !== undefined && outDir === DEFAULT_OUT_DIR) {
    const currentIpcPolicy = existsSync(DEFAULT_IPC_POLICY_PATH)
      ? readFileSync(DEFAULT_IPC_POLICY_PATH, "utf8")
      : undefined;
    if (currentIpcPolicy !== policyOutput.content) {
      if (checkOnly) {
        drifted.push("../alpha-ipc/src/main/assets/alpha-suite-policy.json");
      } else {
        mkdirSync(dirname(DEFAULT_IPC_POLICY_PATH), { recursive: true });
        writeFileSync(DEFAULT_IPC_POLICY_PATH, policyOutput.content, "utf8");
        written.push("../alpha-ipc/src/main/assets/alpha-suite-policy.json");
      }
    }
  }

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify({
      ok: drifted.length === 0,
      mode: checkOnly ? "check" : "write",
      registryPath,
      outDir,
      apps: registry.apps.length,
      generatedFiles: outputs.length,
      written,
      drifted,
    }, null, 2)}\n`);
  } else if (checkOnly) {
    if (drifted.length > 0) {
      process.stderr.write(`Suite outputs drifted (${drifted.length}): ${drifted.join(", ")}\n`);
    } else {
      process.stdout.write(`Suite registry valid (${registry.apps.length} apps, ${outputs.length} generated files up to date)\n`);
    }
  } else {
    process.stdout.write(`Generated ${outputs.length} suite files (${written.length} updated) for ${registry.apps.length} apps in ${outDir}\n`);
  }

  return drifted.length === 0 ? 0 : 1;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
