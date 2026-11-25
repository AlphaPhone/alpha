import { expect, test } from "vitest";
import { cnFor } from "../src/lib/cn.ts";

const merge = cnFor({
  text: { body: "1rem" }, weight: { strong: "650" }, leading: { prose: "1.7" }, tracking: { caps: "0.08em" }, z: { overlay: "40" },
  rounded: { pill: "9999px" }, shadow: { card: "0 1px 2px" }, blur: { glass: "12px" }, animate: { blink: "blink 1s infinite" },
  motion: { duration: { fast: "120ms", base: "250ms" }, ease: { standard: "cubic-bezier(0.19, 1, 0.22, 1)", emphasized: "cubic-bezier(0.83, 0, 0.17, 1)" } },
});
const cases: [string[], string][] = [
  [["font-bold", "font-strong"], "font-strong"],
  [["z-10", "z-overlay"], "z-overlay"],
  [["leading-6", "leading-prose"], "leading-prose"],
  [["tracking-tight", "tracking-caps"], "tracking-caps"],
  [["rounded-md", "rounded-pill"], "rounded-pill"],
  [["blur-sm", "blur-glass"], "blur-glass"],
  [["animate-spin", "animate-blink"], "animate-blink"],
  [["duration-base", "duration-fast"], "duration-fast"],
  [["ease-standard", "ease-emphasized"], "ease-emphasized"],
  [["text-sm", "text-body"], "text-body"],
  [["text-body", "text-primary"], "text-body text-primary"],
  [["shadow-card", "shadow-primary"], "shadow-card shadow-primary"],
];

test("a token of a scale replaces Tailwind's own class of that scale, and a size never replaces a color", () => {
  for (const [inputs, merged] of cases) expect(merge(...inputs), inputs.join(" ")).toBe(merged);
});
