// spec/app/maps/index.md, "Story: Navigate"

/**
 * Each kind of turn's arrow, the exact 24px stroke paths v121's guidance drew (legacy ui/maps/guidance.ts MANEUVER_ICONS).
 * Lucide has no icon for most of these, so they are kept as v121 had them rather than swapped for lucide's nearest.
 */
const turnPaths: Record<string, string> = {
  depart: "M12 20V4M6 10l6-6 6 6",
  continue: "M12 20V4M6 10l6-6 6 6",
  "slight-left": "M15 21v-7L8 7M8 13V7h6",
  left: "M18 21v-8a3 3 0 0 0-3-3H5M9 6l-4 4 4 4",
  "sharp-left": "M17 21V8L7 18M7 12v6h6",
  "slight-right": "M9 21v-7l7-7M16 13V7h-6",
  right: "M6 21v-8a3 3 0 0 1 3-3h10M15 6l4 4-4 4",
  "sharp-right": "M7 21V8l10 10M17 12v6h-6",
  "keep-left": "M15 21v-6c0-2-1-3-3-5L8 6M8 11V6h5",
  "keep-right": "M9 21v-6c0-2 1-3 3-5l4-4M16 11V6h-5",
  "u-turn": "M8 21V9a4 4 0 0 1 8 0v5M13 11l3 3 3-3",
  roundabout: "M12 21v-5M12 16a4 4 0 1 1 4-4M16 12V6M13 9l3-3 3 3",
  arrive: "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0zM15 10a3 3 0 1 1-6 0a3 3 0 1 1 6 0z",
};

/** The path for a turn, the straight arrow where the provider names no kind it has one for, as v121's did. */
export const turnPath = (maneuver: string | undefined): string => turnPaths[maneuver ?? "continue"] ?? turnPaths.continue;

/** A turn's arrow, stroked like a lucide icon. */
export function TurnArrow({ maneuver, className }: { readonly maneuver: string | undefined; readonly className?: string }) {
  return (
    <svg aria-hidden="true" data-maneuver={maneuver ?? "continue"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={turnPath(maneuver)} />
    </svg>
  );
}
