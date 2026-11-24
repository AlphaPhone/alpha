import type { ComponentMeta } from "vibestack/stories";
import type { DictationButtonProps } from "./DictationButton.tsx";
import { denied, keptClip, levels, recording, speechStopping } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<DictationButtonProps> = {
  args: { dictation: undefined, route: "Device", native: true, levels: [], microphoneDenied: false, onStart: noop, onStop: noop, onRetry: noop, onDiscard: noop, onCancel: noop, onOpenSettings: noop },
  examples: {
    Recording: { dictation: recording, levels },
    KeptClipOverCloud: { dictation: keptClip, route: "Cloud" },
    MicrophoneDenied: { dictation: denied },
    DeniedInBrowser: { dictation: denied, native: false },
    PermissionRefusedBeforeRecording: { microphoneDenied: true },
    SpeechStillStopping: { dictation: speechStopping },
  },
};
