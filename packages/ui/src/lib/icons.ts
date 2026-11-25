import { createLucideIcon } from "lucide-react";

/**
 * The calendar v121 drew for Calendar's tile and Home's agenda card: lucide-react 1.18.0's, whose page starts a step
 * lower than today's lucide calendar, with longer rings and its rule on 10.
 */
export const CalendarGlyph = createLucideIcon({
  name: "Calendar",
  node: [
    ["path", { key: "ring-left", d: "M8 2v4" }],
    ["path", { key: "ring-right", d: "M16 2v4" }],
    ["rect", { key: "page", width: "18", height: "18", x: "3", y: "4", rx: "2" }],
    ["path", { key: "rule", d: "M3 10h18" }],
  ],
});
