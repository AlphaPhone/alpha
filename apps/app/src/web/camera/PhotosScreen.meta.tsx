import type { ComponentMeta } from "vibestack/stories";
import type { PhotosScreenProps } from "./PhotosScreen.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<PhotosScreenProps> = {
  args: { onClose: noop },
  examples: {
    Favorites: { route: "album:favorites" },
    Videos: { route: "album:videos" },
    Screenshots: { route: "album:screenshots" },
  },
};
