// spec/telephony/index.md
import { runtime } from "../runtime.ts";

/** The app's one runtime, re-exported: it provides telephony's machines and services. */
export { runtime };

/** The runtime type the components and stories share. */
export type TelephonyRuntime = typeof runtime;
