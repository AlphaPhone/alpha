import type { ComponentMeta } from "vibestack/stories";
import type { DeveloperPageProps } from "./DeveloperPage.tsx";

const noop = () => {};

export const meta: ComponentMeta<DeveloperPageProps> = {
  args: {
    developerActs: { command: noop, requestRole: noop, toggleProfile: noop, profile: "development" },
    version: "1.0.0",
    native: false,
    onHandoff: noop,
  },
};
