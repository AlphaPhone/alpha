import type { ComponentMeta } from "vibestack/stories";
import type { VideoEditorProps } from "./VideoEditor.tsx";
import { videoTrimmed, videoUnconfirmed } from "./fixtures.ts";

export const meta: ComponentMeta<VideoEditorProps> = {
  args: { state: videoTrimmed, can: () => true, source: "", editor: () => undefined },
  examples: {
    Unconfirmed: { state: videoUnconfirmed },
    NotSaved: { state: { ...videoTrimmed, outcome: "VideoNotSaved" } },
    Rotated: { state: { ...videoTrimmed, trim: { ...videoTrimmed.trim, rotation: 90, crop: true } } },
  },
};
