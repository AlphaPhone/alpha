/**
 * Alpha's wording for every Maps refusal the screen shows. The shared Maps modules (provider,
 * Cloud client, location bridge, saved places) raise a `MapsFailure` whose code says what
 * happened; Alpha words it here and never shows the failure's own text. Where one code covers
 * several outcomes (Cloud's 422 is no route, an unsupported mode or outside coverage), the
 * reviewed upstream sentence identifies the outcome, the way `../workflows/workflow-messages.ts`
 * keys workflow errors. Anything unrecognised gets this code's generic sentence.
 */
import {
  MapsFailure,
  type MapsFailureCode,
} from "@elizaos/plugin-maps/client/contracts";

/** Shown when no Maps provider is connected. */
export const MAPS_CONNECT_PROVIDER =
  "Connect a Maps provider to search places and plan routes.";
/** Shown when directions are opened with no Maps provider connected. */
export const MAPS_CONNECT_PROVIDER_FOR_ROUTE =
  "Connect a Maps provider to plan a route. No route has been calculated.";

/** The generic sentence for each failure code. */
const BY_CODE: Readonly<Record<MapsFailureCode, string>> = {
  unconfigured: MAPS_CONNECT_PROVIDER,
  unavailable: "Maps could not complete this request.",
  "permission-denied":
    "Location permission was not granted. You can choose an origin manually.",
  timeout: "No location fix arrived.",
  cancelled: "Maps request cancelled.",
  offline: "Maps is unreachable. Check the connection.",
  "rate-limited": "Maps request limit reached. Try again later.",
  unauthorized: "Sign in to Cloud to use Maps.",
  "invalid-response": "Maps sent a response that could not be used.",
  unsupported: "Maps cannot do that here.",
  storage: "Saved places could not be read or written on this device.",
};

/**
 * The outcomes a code does not identify on its own, keyed by the sentence the shared module
 * raises for it (reviewed at the pinned upstream revision), with Alpha's wording.
 */
const OUTCOMES: ReadonlyMap<string, string> = new Map([
  // Cloud Maps (cloud-provider.ts, cloud-session.ts)
  ["Maps connection changed.", "The Maps connection changed. Search again."],
  ["Cloud Maps could not complete this request.", "Cloud Maps could not complete this request."],
  ["Cloud Maps coverage is invalid.", "Cloud Maps sent an invalid coverage area."],
  ["Cloud Maps sent an invalid response.", "Cloud Maps sent an invalid response."],
  ["The Maps route response is invalid.", "Cloud Maps sent an invalid route."],
  ["The Maps search response is invalid.", "Cloud Maps sent invalid search results."],
  ["Cloud Maps is unreachable. Check the connection.", "Cloud Maps is unreachable. Check the connection."],
  ["Add balance or choose a plan to use Maps.", "Add balance or choose a plan to use Maps."],
  ["Maps needs an active Cloud subscription.", "Maps needs an active Cloud subscription."],
  ["Cloud refused this Maps request.", "Cloud refused this Maps request."],
  ["Sign in to Cloud to use Maps.", "Sign in to Cloud to use Maps."],
  ["Cloud Maps is temporarily unavailable. Try again later.", "Cloud Maps is temporarily unavailable. Try again later."],
  ["This Maps request could not be confirmed. It will not retry automatically.", "This Maps request could not be confirmed. It will not retry automatically."],
  ["Your plan changed. Try the Maps request again.", "Your plan changed. Try the Maps request again."],
  ["Cloud Maps is not available yet.", "Cloud Maps is not available yet."],
  ["No route is available between these places.", "No route is available between these places."],
  ["This travel mode is not available from Cloud Maps.", "This travel mode is not available from Cloud Maps."],
  ["This location is outside Cloud Maps coverage.", "This location is outside Cloud Maps coverage."],
  ["Search text is too long.", "Use a search of at most 300 characters."],
  ["This map tile is unavailable.", "This part of the map is unavailable."],
  ["The Maps account changed. Search again after signing in.", "The Maps account changed. Search again after signing in."],
  // Shared Maps contracts (contracts.ts)
  ["The configured Maps connection is unavailable.", "The Maps connection is unavailable."],
  ["Connect a Maps provider to search places and plan routes.", MAPS_CONNECT_PROVIDER],
  // Device location (native-location.ts, device-navigation.ts)
  ["Location is unavailable. Check device location settings or choose an origin manually.", "Location is unavailable. Check device location settings or choose an origin manually."],
  ["A fresh location fix is not available.", "A fresh location fix is not available."],
  ["The location fix is invalid.", "The location fix could not be used."],
  ["A location permission or start request is still settling.", "Location is still starting. Try again in a moment."],
  ["Location cleanup could not be confirmed.", "Location could not be stopped cleanly."],
  ["Location could not start.", "Location could not start."],
  ["Native location is unavailable in this build.", "Location is unavailable in this build."],
  // Regional development gateway (regional-provider.ts)
  ["Regional Maps is unavailable. Check the configured service connection.", "Regional Maps is unavailable. Check the configured service connection."],
  // Saved places (saved-places.ts, ../../maps/saved-places.ts)
  ["A name and valid place identity are required.", "Name the place before saving it."],
  ["A saved-place name is required.", "Name the place before saving it."],
  ["Remove a saved place before adding another.", "Saved places are full. Remove one before adding another."],
  ["Saved places could not be confirmed on this device.", "Saved places could not be confirmed on this device."],
  ["Saved places could not be read. Existing data has not been replaced.", "Saved places could not be read. Existing data has not been replaced."],
  ["This saved place no longer exists.", "This saved place no longer exists."],
  ["Google Maps results cannot be saved on this device.", "Google Maps results cannot be saved on this device."],
  // Alpha's Maps view-model (state.ts)
  ["Use a search of at most 300 characters.", "Use a search of at most 300 characters."],
  ["This provider does not support place search.", "This Maps provider cannot search places."],
  ["Choose an actual origin and destination first.", "Choose a starting point and a destination first."],
  ["This provider does not support that route mode.", "This Maps provider cannot plan that kind of route."],
  ["This travel mode is unsupported.", "This travel mode is unsupported."],
  ["The origin name is invalid.", "The starting point name is invalid."],
  ["The selected place identity changed.", "The selected place changed. Choose it again."],
  // Alpha's Maps screen (maps-screen.ts)
  ["Location is not granted.", "Location is not granted."],
  ["Location request cancelled.", "Location request cancelled."],
  ["The phone is already planning a new route.", "The phone is already planning a new route."],
  // Alpha's browser location port (../../browser/location.ts)
  ["Location timed out", "Location timed out."],
  ["No location", "Location is unavailable."],
]);

/**
 * Cloud allowance and request limits carry a reset or retry time. The time is data (a date or
 * a duration) and is kept; the sentence around it is Alpha's.
 */
const ALLOWANCE = /^You have used your Maps allowance for this period\.(?: It resets (in )?(.{1,80})\.)?$/;
const REQUEST_LIMIT = /^Maps request limit reached\. (?:Try again in (.{1,80})\.|Try again later\.)$/;

/** Alpha's sentence for a Maps failure, or for any other error the Maps screen catches. */
export function mapsFailureText(
  error: unknown,
  unconfiguredText?: string,
): string {
  if (!(error instanceof MapsFailure)) return BY_CODE.unavailable;
  if (error.code === "unconfigured" && unconfiguredText) return unconfiguredText;
  return mapsRefusalText(error.code, error.message);
}

function mapsRefusalText(code: MapsFailureCode, reviewed: string): string {
  const allowance = ALLOWANCE.exec(reviewed);
  if (allowance)
    return `You have used your Maps allowance for this period.${allowance[2] ? ` It resets ${allowance[1] ?? ""}${allowance[2]}.` : ""}`;
  const limit = REQUEST_LIMIT.exec(reviewed);
  if (limit)
    return `Maps request limit reached. ${limit[1] ? `Try again in ${limit[1]}.` : "Try again later."}`;
  return OUTCOMES.get(reviewed) ?? BY_CODE[code] ?? BY_CODE.unavailable;
}

/** What `cloudMapsDiagnostics()` or `regionalDiagnostics()` reports about the provider start. */
type MapsDiagnostics = Readonly<{
  configured: boolean;
  error: string;
  message?: string;
}>;

const isCode = (value: string): value is MapsFailureCode =>
  Object.hasOwn(BY_CODE, value);

/**
 * Alpha's sentence for a provider that failed to start, or "" when it did not fail. The
 * diagnostics carry the refusal's code and its shared sentence; Alpha words them.
 */
export function mapsStartFailureText(diagnostics: MapsDiagnostics): string {
  if (!diagnostics.error) return "";
  return mapsRefusalText(
    isCode(diagnostics.error) ? diagnostics.error : "unavailable",
    diagnostics.message ?? "",
  );
}
