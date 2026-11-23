import type { ComponentMeta } from "vibestack/stories";
import type { PhotoEditorProps } from "./PhotoEditor.tsx";
import { editUncertain, editing } from "./fixtures.ts";

export const meta: ComponentMeta<PhotoEditorProps> = {
  args: { state: editing, can: () => true, editor: () => undefined },
  examples: {
    Unconfirmed: { state: editUncertain },
    Cropping: { state: { ...editing, cropping: true } },
    CloseAsked: { state: { ...editing, closeAsked: true } },
  },
};
