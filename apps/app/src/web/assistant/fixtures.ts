// spec/assistant/reply.md, "Story: Read a reply with its cards"; spec/assistant/approvals.md, "Story: Approve an action card once, from wherever it is shown"
import { initial as replyStart } from "../../../gen/assistant__reply.ts";
import { classify } from "../../assistant/reply-lines.vibe";
import type { ProposalCard, Row } from "../../assistant/transcript.vibe";

const settled = (text: string) => ({ ...replyStart, status: "Settled" as const, shown: text.length, final: text.length, spoken: text.length });
const agent = (id: string, text: string): Row => ({ kind: "agent", id, text, segments: classify(text, false), reply: settled(text), notices: [], cutOff: "NotCutOff", recorded: true });

/** A card the agent proposed for the current message. */
export const liveCard: ProposalCard = {
  proposalId: "p-1", digest: "a".repeat(64), title: "Create note", detail: "Saves “Groceries” in Notes on this phone.",
  expiresAt: Date.UTC(2030, 0, 1, 12, 30), state: "LiveCard", recovered: false, session: "s-1",
};

/** A card whose action ran. */
export const doneCard: ProposalCard = { ...liveCard, proposalId: "p-2", state: "DoneCard", summary: "Saved note “Groceries”." };

/** A card whose review time passed. */
export const expiredCard: ProposalCard = { ...liveCard, proposalId: "p-3", state: "ExpiredCard" };

/** A conversation with a Maps card, a fenced command output with a bracket tag, a receipt and a pending card. */
export const conversation: readonly Row[] = [
  { kind: "user", id: "u-1", text: "How long to the airport?", files: [], status: "recorded" },
  agent("a-1", "[MAPSCARD]\n{\"kind\":\"place\",\"place\":{\"name\":\"SFO\",\"latitude\":37.62,\"longitude\":-122.38,\"provider\":\"osm\",\"providerPlaceId\":\"1\",\"categories\":[]},\"attribution\":null}\n[/MAPSCARD]\nAbout 25 minutes by car right now."),
  { kind: "user", id: "u-2", text: "Show the log", files: [], status: "recorded" },
  agent("a-2", "Here it is:\n```\n[INFO] started\n[CHOICE:maps-share id=x]\n```"),
  { kind: "receipt", id: "device-receipt:p-2", proposalId: "p-2", title: "Completed", summary: "Saved note “Groceries”." },
  { kind: "card", id: "card:p-1", card: liveCard },
];

/** A reply being written, after a brief acknowledgment. */
export const streaming: readonly Row[] = [
  { kind: "user", id: "u-3", text: "Check my calendar for tomorrow", files: [], status: "pending" },
  { kind: "agent", id: "a-3", text: "", segments: [], reply: { ...replyStart, status: "Working", acks: 1, ackUnits: 6 }, label: "Checking your calendar", notices: [], cutOff: "NotCutOff", recorded: false },
];
