// spec/telephony/comms.md, "A view change while the chat is open keeps the sheet's height and remembers the view it left"
import { Effect } from "effect";
import { Navigation } from "../../shell/navigation.vibe";
import type { AppId } from "../app-screen.ts";
import { act } from "../shell/services.ts";

/** Open an app at a route through the shell's Navigation, as the shell's own surfaces do. */
export function openApp(app: AppId, route?: string): void {
  act(Effect.flatMap(Effect.service(Navigation), (n) => n.open(app, route)));
}

/** The shell's Back, as an in-page back arrow takes it. */
export function goBack(): void {
  act(Effect.flatMap(Effect.service(Navigation), (n) => n.back()));
}
