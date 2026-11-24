// spec/assistant/reply.md, "Story: Read a reply with its cards"; spec/assistant/approvals.md, "Story: Approve an action card once, from wherever it is shown"; spec/assistant/emailCard.md, "Story: Send an email my agent drafted, from the chat"; spec/assistant/suggestion.md, "Story: Use a suggested wording exactly as I reviewed it"; spec/assistant/search.md, "Story: Find something I said in an earlier chat"; spec/assistant/receipts.md, "Story: Settle an action whose outcome is unknown"
import { initial as emailStart, type EmailCard } from "../../../gen/assistant__emailCard.ts";
import { initial as replyStart } from "../../../gen/assistant__reply.ts";
import type { Target } from "../../assistant/composer.vibe";
import type { QuestionReview } from "../../assistant/draft.vibe";
import type { ConversationRow, SearchHit } from "../../assistant/payloads.schema.vibe";
import { classify } from "../../assistant/reply-lines.vibe";
import type { HistoryItem } from "../../assistant/review.vibe";
import type { ChatFile, ProposalCard, Row } from "../../assistant/transcript.vibe";

const settled = (text: string) => ({ ...replyStart, status: "Settled" as const, shown: text.length, final: text.length, spoken: text.length });
const agent = (id: string, text: string): Row => ({ kind: "agent", id, text, segments: classify(text, false), reply: settled(text), notices: [], cutOff: "NotCutOff", recorded: true });

/** A card the agent proposed for the current message. */
export const liveCard: ProposalCard = {
  proposalId: "p-1", digest: "a".repeat(64), title: "Create note", detail: "Saves “Groceries” in Notes on this phone.",
  expiresAt: Date.UTC(2030, 0, 1, 12, 30), state: "LiveCard", recovered: false, session: "s-1",
};

/** A card whose action ran. */
export const doneCard: ProposalCard = { ...liveCard, proposalId: "p-2", state: "DoneCard", summary: "Saved note “Groceries”." };

/** A close-every-tab card listing the tabs that will close, one of them private and counted only. */
export const closeTabsCard: ProposalCard = {
  ...liveCard, proposalId: "p-4", title: "Close all tabs", detail: "Closes every tab listed here in Browser.",
  items: { lines: ["Weather in Paris · weather.com", "The New York Times · nytimes.com"], unnamed: 1, unnamedLabel: "private tab" },
};

/** A card whose family names where it acts, so it can be opened and still approved. */
export const notesCard: ProposalCard = { ...liveCard, proposalId: "p-5", destination: "notes" };

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
  { kind: "change", id: "change:a-2:notes", text: "Notes changed", app: "notes" },
];

/** A reply being written, after a brief acknowledgment. */
export const streaming: readonly Row[] = [
  { kind: "user", id: "u-3", text: "Check my calendar for tomorrow", files: [], status: "pending" },
  { kind: "agent", id: "a-3", text: "", segments: [], reply: { ...replyStart, status: "Working", acks: 1, ackUnits: 6 }, label: "Checking your calendar", notices: [], cutOff: "NotCutOff", recorded: false },
];

/** An email the agent drafted, ready for review. */
export const emailDraft: EmailCard = emailStart;

/** An email Gmail took. */
export const emailSent: EmailCard = { ...emailStart, state: "SentEmail", dispatchedVersion: 1, dispatches: 1 };

/** An email whose send has no answer, which is never sent again on its own. */
export const emailUncertain: EmailCard = { ...emailStart, state: "UncertainEmail", dispatchedVersion: 1, dispatches: 1 };

/** A reply with a share choice outside a fence and the same tag inside one. */
export const choiceReply = classify("Share your route?\n[CHOICE:maps-share id=r1]\nyes=Share\nno=Not now\n[/CHOICE]\n```\n[CHOICE:maps-share id=r2]\n```", false);

/** A workflow run a reply announced. */
export const workflowReply = classify("Started your morning brief.\n[WORKFLOW]\n{\"workflowId\":\"w1\",\"runId\":\"r1\",\"title\":\"Morning brief\"}\n[/WORKFLOW]", false);

/** A suggested wording under review. */
export const suggestionView = { reviewId: 1, text: "Thanks, see you at 6.", notice: "" };

/** A suggested wording whose field moved since it was reviewed. */
export const movedSuggestionView = { reviewId: 2, text: "Thanks, see you at 6.", notice: "The field changed. Review the wording again." };

/** A long back-and-forth that scrolls, then a message that may not have been sent, a reply cut off before its approval and a system notice. */
export const longConversation: readonly Row[] = [
  ...Array.from({ length: 12 }, (_, at): readonly Row[] => [
    { kind: "user", id: `lu-${at}`, text: `Plan day ${at + 1} of the Lisbon trip around the tram lines, with somewhere quiet for lunch.`, files: [], status: "recorded" },
    agent(`la-${at}`, `Day ${at + 1}: start at Praça do Comércio, take the 28 up to Graça before the crowds, walk down through Alfama, and stop for lunch at a small tasca off Rua de São Miguel. In the afternoon cross to Cais do Sodré and finish at the riverside.`),
  ]).flat(),
  { kind: "user", id: "lu-unconfirmed", text: "Book the hotel for those nights", files: [], status: "unconfirmed" },
  { kind: "agent", id: "la-cut", text: "I found three hotels near Baixa.", segments: classify("I found three hotels near Baixa.", false), reply: settled("I found three hotels near Baixa."), notices: [], cutOff: "NeedsApprovalCutOff", recorded: true },
  { kind: "notice", id: "n-1", text: "Alpha restarted. Your conversation is kept.", system: true },
];

/** Files waiting in the composer, at the cap of four. */
export const waitingFiles: readonly ChatFile[] = [
  { id: "f-1", name: "boarding-pass.pdf", mimeType: "application/pdf", data: "" },
  { id: "f-2", name: "hotel-confirmation-lisbon-october.pdf", mimeType: "application/pdf", data: "" },
  { id: "f-3", name: "itinerary.txt", mimeType: "text/plain", data: "" },
  { id: "f-4", name: "receipt.pdf", mimeType: "application/pdf", data: "" },
];

/** A quote of Alpha's reply the next message answers. */
export const replyTarget: Target = { kind: "reply", quote: { messageId: "a-1", text: "About 25 minutes by car right now.", from: "agent" } };

/** A correction of one of my messages. */
export const editTarget: Target = { kind: "edit", messageId: "u-1", text: "How long to the airport?", requestId: "fixture-edit" };

/** Saved conversations as the resident lists them. */
export const savedConversations: readonly ConversationRow[] = [
  { id: "c-1", roomId: "r-1", title: "Lisbon trip", updatedAt: "2030-01-01T11:40:00Z" },
  { id: "c-2", roomId: "r-2", title: "Groceries for the week", updatedAt: "2029-12-30T18:05:00Z" },
  { id: "c-3", roomId: "r-3" },
];

/** More saved conversations than fit on screen, some with long titles. */
export const manyConversations: readonly ConversationRow[] = Array.from({ length: 30 }, (_, at) => ({
  id: `c-many-${at}`, roomId: `r-many-${at}`,
  title: at % 4 === 0 ? `Planning the spring renovation of the kitchen, the hallway and the small bathroom upstairs, part ${at + 1}` : `Conversation ${at + 1}`,
  updatedAt: new Date(Date.UTC(2030, 0, 1, 12) - at * 3_600_000).toISOString(),
}));

/** Phone actions whose outcome waits for the owner: a handoff with every outcome, and an owned action with saved evidence. */
export const unsettledHistory: readonly HistoryItem[] = [
  { proposalId: "h-1", title: "Call Ann", detail: "Started a call to Ann from the Phone app.", offers: ["happened", "didnt", "unresolved"] },
  { proposalId: "h-2", title: "Send message", detail: "Texts Sam “Running ten minutes late”.", offers: ["happened", "didnt"] },
  { proposalId: "h-3", title: "Phone action", detail: "", offers: ["happened", "didnt", "unresolved"] },
];

/** Chat search hits, one with a snippet and one without a date. */
export const searchHits: readonly SearchHit[] = [
  { id: "m-1", conversationId: "c-2", text: "Buy milk on the way home", snippet: "…buy milk on the way home…", createdAt: "2029-12-30T18:05:00Z" },
  { id: "m-2", conversationId: "c-1", text: "Is there milk in the hotel minibar?" },
];

/** A full page of chat search hits, so More is offered. */
export const searchPage: readonly SearchHit[] = Array.from({ length: 50 }, (_, at) => ({
  id: `m-page-${at}`, conversationId: `c-${at % 3}`, text: `Message ${at + 1} that mentions the airport`, createdAt: new Date(Date.UTC(2029, 11, 31) - at * 86_400_000).toISOString(),
}));

/** A question about a selected passage of a web page. */
export const passageReview: QuestionReview = {
  id: 1, name: "The New York Times · nytimes.com", url: "https://www.nytimes.com/", text: "City council votes to extend the riverside tram line by four stops.",
  question: "Summarize this excerpt.", notice: "", label: "Ask Alpha",
};

/** A question about a file's text, which may link its source. */
export const fileExcerptReview: QuestionReview = {
  id: 2, name: "itinerary.txt", text: "Day 1: Lisbon. Day 2: Sintra. Day 3: Cascais.", question: "Summarize this excerpt.", notice: "", label: "Use excerpt", file: "ExcerptAsk",
};

/** A file too large to attach: only its name goes with the question. */
export const sourceOnlyReview: QuestionReview = {
  id: 3, name: "holiday-video.mp4", text: "", question: "Summarize this excerpt.", notice: "Too large to attach. Only its name goes with your question.", label: "Ask Alpha", file: "SourceAsk",
};

/** A review refused because its question and excerpt were cleared. */
export const blankReview: QuestionReview = { ...passageReview, id: 4, text: "", question: "", notice: "Add a question and some text first." };

/** A passage longer than the excerpt keeps, cut to its limit. */
export const truncatedReview: QuestionReview = { ...passageReview, id: 5, text: "The council heard from residents along the river for three hours. ".repeat(60), notice: "Truncated" };

/** A question about an image frame, with room to describe it. */
export const imageReview: QuestionReview = {
  id: 6, name: "Camera frame", text: "", question: "What does this mean?", notice: "", label: "Ask Alpha",
  image: new Blob(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><circle cx="2" cy="1.5" r="1" fill="currentColor"/></svg>'], { type: "image/svg+xml" }),
};
