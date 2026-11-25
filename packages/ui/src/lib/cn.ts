import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import tokens from "@repo/design-system/tokens.json" with { type: "json" };

export const cnFor = (groups: Record<string, unknown>) => {
  const names = (group: string) => Object.keys(groups[group] ?? {});
  const focus = "focus" in groups ? ["focus"] : [];
  const twMerge = extendTailwindMerge({
    extend: {
      theme: {
        text: names("text"), radius: names("rounded"), shadow: names("shadow"), blur: names("blur"), animate: names("animate"),
        "font-weight": names("weight"), leading: names("leading"), tracking: names("tracking"),
      },
      classGroups: { z: [{ z: names("z") }], "outline-w": [{ outline: focus }], "outline-offset": [{ "outline-offset": focus }] },
    },
  });
  return (...inputs: ClassValue[]) => twMerge(clsx(inputs));
};

/** Joins class names; a later Tailwind utility replaces an earlier one it conflicts with. */
export const cn = cnFor(tokens);

/** The outline every control shows under keyboard focus: the focus tokens' width and offset, in `ring`. */
export const focusRing = "focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-ring";

/** The ring of Home's tiles: shown only while the page is marked as moved by keyboard. */
export const launcherRing = "in-data-[alpha-keyboard]:focus-visible:outline-solid in-data-[alpha-keyboard]:focus-visible:outline-focus in-data-[alpha-keyboard]:focus-visible:outline-offset-focus in-data-[alpha-keyboard]:focus-visible:outline-ring";
