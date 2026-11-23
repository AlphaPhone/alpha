import type { ComponentMeta } from "vibestack/stories";
import type { AvatarProps } from "./Avatar.tsx";

const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="lightsteelblue"/><circle cx="40" cy="32" r="14" fill="white"/><path d="M14 74a26 26 0 0 1 52 0" fill="white"/></svg>')}`;

export const meta: ComponentMeta<AvatarProps> = {
  args: { name: "Alpha Phone" },
  examples: {
    Photo: { src: photo },
    "One word": { name: "Alpha" },
    "Long name": { name: "Alpha Phone Assistant Support Line" },
    Blank: { name: " " },
  },
};
