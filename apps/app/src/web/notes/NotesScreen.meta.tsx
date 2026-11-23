import type { ComponentMeta } from "vibestack/stories";
import type { NotesScreenProps } from "./NotesScreen.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<NotesScreenProps> = {
  args: { onClose: noop },
};
