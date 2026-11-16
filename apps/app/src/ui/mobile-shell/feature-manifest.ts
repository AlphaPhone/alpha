/**
 * Alpha's functional feature manifest, emitted from its product registration:
 * the views, served ids, device capabilities and actions, kept apart from
 * identity, theme, labels, icons and installed storage names.
 */
import type {
  MobileProductRegistration,
  MobileShellAppearance,
} from "./product-registration";
import type { MobileShellViewId } from "./view-ids";

export const MOBILE_FEATURE_MANIFEST_SCHEMA = "elizaos.mobile-feature-manifest";
export const MOBILE_FEATURE_MANIFEST_SCHEMA_VERSION = 1;

/** One view the product offers, with the canonical ids it also serves. */
export interface MobileFeatureView {
  id: MobileShellViewId;
  serves: MobileShellViewId[];
}

/** What a product does: identical across brands of one shared application. */
export interface MobileFeatureFunctional {
  /** Offered views, sorted by id (Home order is presentation). */
  views: MobileFeatureView[];
  /** Device and shell capabilities, sorted. */
  capabilities: string[];
  /** Canonical agent and device action names, sorted. */
  actions: string[];
}

/** How a product looks and which installed identifiers it keeps. */
export interface MobileFeatureBranding {
  appName: string;
  appId: string;
  characterName: string;
  revision: number;
  themeId: string;
  defaultAppearance: MobileShellAppearance | "system";
  order: MobileShellViewId[];
  labels: Partial<Record<MobileShellViewId, string>>;
  icons: Partial<Record<MobileShellViewId, string>>;
  storage: {
    launcherFavorites: string;
    launcherBuiltinPrefix: string;
    launcherDefaultPolicy: string;
    retained: Record<string, string>;
  };
  legacyIds: Record<string, MobileShellViewId>;
}

export interface MobileFeatureManifest {
  schema: typeof MOBILE_FEATURE_MANIFEST_SCHEMA;
  schemaVersion: typeof MOBILE_FEATURE_MANIFEST_SCHEMA_VERSION;
  branding: MobileFeatureBranding;
  functional: MobileFeatureFunctional;
}

const sorted = <T extends string>(values: Iterable<T>): T[] =>
  [...new Set(values)].sort();

const sortedRecord = <V>(
  value: Readonly<Record<string, V | undefined>> | undefined,
): Record<string, V> =>
  Object.fromEntries(
    Object.entries(value ?? {})
      .filter((entry): entry is [string, V] => entry[1] !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );

/**
 * The manifest of a registration. Deterministic: the same record always
 * emits the same JSON, so a checked-in snapshot can gate changes.
 */
export function mobileFeatureManifest(
  product: MobileProductRegistration,
): MobileFeatureManifest {
  const serves = product.views.serves ?? {};
  return {
    schema: MOBILE_FEATURE_MANIFEST_SCHEMA,
    schemaVersion: MOBILE_FEATURE_MANIFEST_SCHEMA_VERSION,
    branding: {
      appName: product.identity.appName,
      appId: product.identity.appId,
      characterName: product.identity.characterName,
      revision: product.revision,
      themeId: product.theme.id,
      defaultAppearance: product.theme.defaultAppearance,
      order: [...product.views.order],
      labels: sortedRecord(product.views.labels),
      icons: sortedRecord(product.icons.views),
      storage: {
        launcherFavorites: product.storage.launcherFavorites,
        launcherBuiltinPrefix: product.storage.launcherBuiltinPrefix,
        launcherDefaultPolicy: product.storage.launcherDefaultPolicy,
        retained: sortedRecord(product.storage.retained),
      },
      legacyIds: sortedRecord(product.views.legacyIds),
    },
    functional: {
      views: sorted(product.views.order).map((id) => ({
        id,
        serves: sorted(serves[id] ?? []),
      })),
      capabilities: sorted(product.features?.capabilities ?? []),
      actions: sorted(product.features?.actions ?? []),
    },
  };
}
