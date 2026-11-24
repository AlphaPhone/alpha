// spec/telephony/comms.md, "The bar addresses Alpha exactly while the chat is open, and the left slot holds the other target"; spec/telephony/drafts.md, "Each subject keeps one request to Alpha, separate from its draft slot"; spec/telephony/comms.md, "A proposal restored from the phone's own store is shown, never approved, until Alpha proposes it again"
import type { Comms } from "../../../gen/telephony__comms.ts";
import type { OpenCard } from "../../telephony/comms.vibe";

/** What Phone, Messages and Contacts show of the comms stage, and the owner's actions on its one bar. */
export interface StageViewProps {
  /** The comms state: who the bar addresses, the sheet height, whether a call is live. */
  comms: Comms;
  /** The owner's request to Alpha for the subject on screen. */
  request: string;
  /** The open proposal and its kept words; a restored one is shown and never approved. */
  card: OpenCard | null;
  /** The owner typed to Alpha. */
  onRequest: (text: string) => void;
  /** Send the request to Alpha on this subject. */
  onSubmitRequest: () => void;
  /** The Alpha button: the chat opens on this subject, addressing Alpha. */
  onAlpha: () => void;
  /** End beside the bar: ends the call the call bar shows. */
  onEndCall: () => void;
  /** The open chat's left slot: back to the person or the call, the chat closed. */
  onCloseChat: () => void;
  /** Dismiss the open proposal; nothing runs. */
  onDecline: (proposalId: string) => void;
}
