import type { ComponentMeta } from "vibestack/stories";
import type { AlertProps } from "./Alert.tsx";

export const meta: ComponentMeta<AlertProps> = {
  args: { children: "Backup finished. 1,284 photos and 36 notes are saved to Alpha Cloud." },
  examples: {
    Long: {
      children:
        "Alpha could not reach Alpha Cloud for the last three hours, so new notes, calendar changes and call history are kept on this phone and will sync as soon as the connection comes back. Nothing has been lost, and you can keep working offline.",
    },
    Rich: {
      variant: "warn",
      children: (
        <>
          <strong className="font-medium">Storage almost full.</strong> 1.2 GB left; offline maps stop updating below 500 MB.
        </>
      ),
    },
  },
};
