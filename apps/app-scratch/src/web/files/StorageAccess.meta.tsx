import type { ComponentMeta } from "vibestack/stories";
import type { StorageAccessProps } from "./StorageAccess.tsx";

const none = () => undefined;

export const meta: ComponentMeta<StorageAccessProps> = {
  args: { access: "AccessDenied", legacy: false, loading: false, onAllow: none, onRetry: none },
  examples: { Android10: { legacy: true }, Unavailable: { access: "AccessUnavailable" }, Reading: { access: "AccessUnknown" } },
};
