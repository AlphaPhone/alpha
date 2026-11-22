import type { ComponentMeta } from "vibestack/stories";
import type { CameraViewProps } from "./CameraView.tsx";
import { countingDown, denied, microphone, readyPhoto, recording } from "./fixtures.ts";

const actions = new Proxy({} as CameraViewProps["actions"], { get: () => () => undefined });

export const meta: ComponentMeta<CameraViewProps> = {
  args: { camera: readyPhoto, said: "", can: () => true, browser: false, actions },
  examples: {
    CountingDown: { camera: countingDown },
    Recording: { camera: recording },
    CameraDenied: { camera: denied },
    MicrophoneRefused: { camera: microphone },
    Notice: { said: "Saved · max length" },
  },
};
