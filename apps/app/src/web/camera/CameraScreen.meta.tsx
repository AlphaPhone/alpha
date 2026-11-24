import type { ComponentMeta } from "vibestack/stories";
import type { CameraScreenProps } from "./CameraScreen.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<CameraScreenProps> = {
  args: { onClose: noop },
};
