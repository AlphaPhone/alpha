import type { ComponentMeta } from "vibestack/stories";
import type { AvatarProps } from "./Avatar.tsx";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkmP+/HgAEtAI1xQ0x2QAAAABJRU5ErkJggg==";

export const meta: ComponentMeta<AvatarProps> = {
  args: { name: "Ana Lima" },
  examples: { Picture: { src: pixel }, "One name": { name: "Alpha" } },
};
