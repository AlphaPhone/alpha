// spec/app/telephony/common.md, "A call is reported started only when Telecom accepted it, and a lost answer is never \"not called\""; spec/app/telephony/phone.md, "The bar's query filters Recents on the phone, and Alpha's filter returns to Recents"; spec/app/telephony/messages.md, "The list filters over each conversation's title and snippet with no request"
import type { CallOutcome } from "../../gen/app__telephony__common.ts";

/** What the owner is told after a call request, in the words of its outcome; a call Telecom took says nothing. */
export const placements: Record<CallOutcome, string> = {
  CallStarted: "",
  EmergencyOpened: "The dial screen is open with this number. Place the call there.",
  LineBusy: "A call is already in progress. Nothing was dialed.",
  CallsUnavailable: "This phone cannot place calls now.",
  CallNotStarted: "The call did not start.",
  DialerOpened: "Your phone app is open with the number.",
  NoDialer: "No app on this phone places calls.",
  DialerFailed: "The dial screen could not open.",
  CallUnconfirmed: "Alpha cannot tell whether the call started.",
};

/** Whether every word of `query` matches: a word with digits the digits of `number`, any other the start of a word of one of `names`. */
export function matches(query: string, names: string, number = ""): boolean {
  const digits = number.replace(/\D/g, "");
  const words = names.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word !== "");
  return query.toLowerCase().split(/\s+/).filter((word) => word !== "").every((word) =>
    /\d/.test(word) ? digits.includes(word.replace(/\D/g, "")) : words.some((name) => name.startsWith(word)));
}
