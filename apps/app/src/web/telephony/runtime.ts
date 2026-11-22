// spec/telephony/index.md
import { runtime as app } from "../runtime.ts";

/** The app's one runtime, over the platform's `live` layers, which provides telephony's machines and services. */
export const runtime = app;

/** The runtime type the components and stories share. */
export type TelephonyRuntime = typeof runtime;
