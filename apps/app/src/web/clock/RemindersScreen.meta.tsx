import type { ComponentMeta } from "vibestack/stories";
import type { RemindersScreenProps } from "./RemindersScreen.tsx";

const none = () => undefined;

export const meta: ComponentMeta<RemindersScreenProps> = {
  args: { onClose: none },
};
