/**
 * Owner-facing device photo library copy: what Android granted, the review card for a library
 * change, and an agent library proposal. Parsing, limits, validation and model-facing identities
 * stay in the shared photo library contract.
 */
import type {
  LibraryAction,
  LibraryAgentOperation,
  LibraryScopeState,
} from "@elizaos/plugin-assistant/device-actions/photo-library-contract";

const sentence = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

/** Honest copy for what Android granted. Nothing here claims more than the scope. */
export function scopePresentation(
  state: LibraryScopeState | undefined,
  appName: string,
): {
  label: string;
  detail: string;
  action: string;
  actionKind: "request" | "settings" | "none";
} {
  const boundary = `Nothing is uploaded automatically: the assistant receives only reviewed search or inspection results, without file or album names. Locked Folder, other profiles and work-profile media are not visible to ${appName}.`;
  if (!state || state.scope === "unavailable")
    return {
      label: "Unavailable",
      detail: "The device library is available only in the Android app.",
      action: "",
      actionKind: "none",
    };
  if (state.locked)
    return {
      label: "Locked",
      detail: "Unlock the phone to use the device library.",
      action: "",
      actionKind: "none",
    };
  if (state.scope === "partial")
    return {
      label: "Mixed access",
      detail: `Photos: ${state.imageAccess || (state.images ? "full" : "denied")}. Videos: ${state.videoAccess || (state.videos ? "full" : "denied")}. ${boundary}`,
      action: "Change in Android Settings",
      actionKind: "settings",
    };
  if (state.scope === "full") {
    const partial =
      state.images !== state.videos
        ? state.images
          ? " Videos are not allowed."
          : " Photos are not allowed."
        : "";
    return {
      label: "Full access",
      detail:
        `${sentence(appName)} can read the photos and videos Android shows for this profile.` +
        partial +
        " " +
        boundary,
      action: "Change in Android Settings",
      actionKind: "settings",
    };
  }
  if (state.scope === "selected")
    return {
      label: "Selected items",
      detail:
        `Android allows only the items you chose. Other photos and videos are not visible to ${appName}. ` +
        boundary,
      action: state.canSelectMore
        ? "Choose items or allow all"
        : "Change in Android Settings",
      actionKind: state.canSelectMore ? "request" : "settings",
    };
  return {
    label: "Not allowed",
    detail: `${sentence(appName)} cannot read your photo library. Captures you make in ${appName} and items you pick are still available.`,
    action: state.settingsRequired ? "Open Android Settings" : "Allow access",
    actionKind: state.settingsRequired ? "settings" : "request",
  };
}

export function reviewText(
  action: LibraryAction,
  count: number,
  appName: string,
): { title: string; detail: string } {
  const n = count === 1 ? "1 item" : `${count} items`;
  switch (action) {
    case "trash":
      return {
        title: `Move ${n} to trash?`,
        detail:
          "Android asks you to confirm. Items stay in Android trash until it empties them; other apps see them removed.",
      };
    case "delete":
      return {
        title: `Delete ${n} permanently?`,
        detail: `Android asks you to confirm. This removes the media from the device for every app and cannot be undone by ${appName}.`,
      };
    case "share":
      return {
        title: `Share ${n}?`,
        detail:
          "Android opens its share sheet with read-only access to exactly these items. Nothing is sent until you choose an app there.",
      };
    case "favorite":
      return {
        title: `Favorite ${n}?`,
        detail:
          "Android asks you to confirm marking these items as favorites for every gallery app.",
      };
    default:
      return {
        title: `Remove ${n} from favorites?`,
        detail: "Android asks you to confirm.",
      };
  }
}

/** Owner-facing text for an agent library proposal. */
export function describeLibraryOperation(
  op: LibraryAgentOperation,
  appName: string,
): { title: string; description: string } {
  if (op.type === "photo_library_search") {
    const what =
      op.kind === "image"
        ? "photos"
        : op.kind === "video"
          ? "videos"
          : "photos and videos";
    return {
      title: "Search device library",
      description: `List up to ${op.limit ?? 20} ${op.favorites ? "favorite " : ""}${what} Android lets ${appName} read${op.from !== undefined || op.to !== undefined ? " in the requested date range" : ""}. The agent receives ids, kind, dates, dimensions and duration only: no file or album names, no location, no pixels.`,
    };
  }
  if (op.type === "photo_library_inspect")
    return {
      title: "Inspect one library item",
      description:
        "Share one item's id, kind, dates, dimensions and duration with the agent. No file or album name, location or pixels.",
    };
  if (op.type === "photo_library_select")
    return {
      title: `Select ${op.ids.length === 1 ? "1 item" : `${op.ids.length} items`} in Photos`,
      description: "",
    };
  const text = reviewText(op.action, op.items.length, appName);
  return {
    title: text.title,
    description: text.detail,
  };
}
