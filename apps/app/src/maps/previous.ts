// spec/maps/savedPlaces.md, "A phone updated from the previous Alpha keeps its saved places"

/** Where the previous Alpha kept its saved places, in the WebView's own storage. */
const PREVIOUS_SAVED_PLACES = "alpha.maps.saved-places.v1";

/** One place the previous Alpha saved, as it stored it. */
export interface PreviousPlace {
  readonly label: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly providerId: string;
  readonly providerPlaceId: string;
}

/**
 * The places the previous Alpha saved, in its order: undefined when it kept none, null when its list is there but
 * cannot be read. A place that is not a well-formed row makes the whole list unreadable, as it did there. The
 * previous list is only read, never written or removed.
 * @throws {never}
 */
export function previousSavedPlaces(): ReadonlyArray<PreviousPlace> | null | undefined {
  let raw: string | null;
  try { raw = globalThis.localStorage?.getItem(PREVIOUS_SAVED_PLACES) ?? null; } catch { return null; }
  if (raw === null) return undefined;
  try {
    const data = JSON.parse(raw) as { version?: unknown; items?: unknown };
    if (typeof data !== "object" || data === null || data.version !== 1 || !Array.isArray(data.items)) return null;
    const places: PreviousPlace[] = [];
    for (const item of data.items as unknown[]) {
      if (typeof item !== "object" || item === null) return null;
      const row = item as { label?: unknown; coordinate?: unknown; providerId?: unknown; providerPlaceId?: unknown };
      const point = row.coordinate as { latitude?: unknown; longitude?: unknown } | null | undefined;
      if (typeof row.label !== "string" || typeof point !== "object" || point === null) return null;
      if (typeof point.latitude !== "number" || typeof point.longitude !== "number" || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return null;
      if ((row.providerId === undefined) !== (row.providerPlaceId === undefined)) return null;
      if (row.providerId !== undefined && (typeof row.providerId !== "string" || typeof row.providerPlaceId !== "string")) return null;
      places.push({
        label: row.label.trim(), latitude: point.latitude, longitude: point.longitude,
        providerId: (row.providerId as string | undefined) ?? "", providerPlaceId: (row.providerPlaceId as string | undefined) ?? "",
      });
    }
    return places;
  } catch {
    return null;
  }
}
