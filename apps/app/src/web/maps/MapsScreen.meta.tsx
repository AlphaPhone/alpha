import type { ComponentMeta } from "vibestack/stories";
import type { ScreenProps } from "../app-screen.ts";
import { MapsDrawn } from "./map-drawing.ts";

const noop = () => undefined;

export const meta: ComponentMeta<ScreenProps> = {
  args: { onClose: noop },
  examples: {
    Search: { route: "q=coffee" },
    LongSearch: { route: "q=coffee%20shops%20open%20late%20near%20the%20Ferry%20Building%20with%20outdoor%20seating%20and%20room%20to%20work" },
  },
  decorator: (story) => <MapsDrawn value={false}>{story()}</MapsDrawn>,
};
