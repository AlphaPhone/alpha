import type { ComponentMeta } from "vibestack/stories";
import { sourceOpen, sourceUnconfirmed, webSource } from "./fixtures.ts";
import type { WebSourceDialogProps } from "./WebSourceDialog.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<WebSourceDialogProps> = {
  args: { dialog: sourceOpen, source: webSource, onClose: noop, onVisit: noop, onRemove: noop },
  examples: { Unconfirmed: { dialog: sourceUnconfirmed } },
};
