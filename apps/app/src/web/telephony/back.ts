// spec/telephony/comms.md, "A view change while the chat is open keeps the sheet's height and remembers the view it left"; spec/telephony/messages.md, "Back closes Messages' own layers one at a time, innermost first, before it leaves Messages"; spec/telephony/contacts.md, "Back closes Contacts' own layers one at a time, innermost first, before it leaves Contacts"
import { TelephonyBack, type TelephonyApp } from "../../telephony/back.vibe";
import { runtime, type TelephonyRuntime } from "./runtime.ts";

/** Back while `app` is in front: true when telephony took it, false when Back is the shell's, or when the runtime could not answer. */
export function backIn(app: TelephonyApp, on: TelephonyRuntime = runtime): Promise<boolean> {
  return on.runPromise(TelephonyBack.use((b) => b.back(app))).catch(() => false);
}
