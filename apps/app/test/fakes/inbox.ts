// spec/app/inbox/index.md, "Story: See my mail"
import type { GoogleStatus, MailCapabilities, MailCard, MailMessage, MailOperation, MailSearch } from "@elizaos/cloud/client";
import type { Route } from "./routes.ts";

/** A message of the fake mailbox: eliza's card of it, and what reading it whole gives. */
export interface Stored {
  card: MailCard;
  body: string;
  html: string | null;
  files: MailMessage["attachments"];
}

/** What the fake cloud holds of the owner's Gmail, and how it behaves; a journey changes it between steps. */
export interface InboxScene {
  /** The owner's Google connection, by its address, with what Google consented to; none where it is undefined. */
  google: { email: string; connection: string; capabilities: GoogleStatus["grantedCapabilities"] } | undefined;
  readonly mail: Stored[];
  /** Gmail's history: it moves with every change to the mailbox. */
  history: number;
  /** Every request is lost on the way, as when the phone is offline. */
  offline: boolean;
  /** Google refuses every Gmail request: the owner withdrew access. */
  revoked: boolean;
  /** Every change asked of Gmail, as `<kind> <message>`, once it was dispatched. */
  readonly changes: string[];
  /** The name of every file a dispatched send carried. */
  readonly attached: string[];
  /** The largest total of attachments, in bytes, the cloud reports Gmail takes on one email of the account. */
  limit: number;
  /** Whether the cloud reads a message's attachments for the account, so that a forward can carry them. */
  forwards: boolean;
  /** Each part of an original a dispatched send carried, as `<message>/<part>`. */
  readonly forwarded: string[];
  /** The answer to a send's dispatch is lost on the way: after Gmail sent it, or before it reached Gmail. */
  lost?: "sent" | "unsent";
  /** Google's answer about the owner's access never comes, as on a network that hangs. */
  stalled?: boolean;
}

const everything: GoogleStatus["grantedCapabilities"] = ["google.basic_identity", "google.gmail.triage", "google.gmail.send", "google.gmail.manage"];

/** A message as Gmail lists it: `labels` say where it is. */
export function letter(id: number, subject: string, labels: string[], body = `About ${subject}`): Stored {
  return {
    card: {
      id: `g${id}`, threadId: `t${id}`, subject, from: `Sender ${id} <s${id}@mail.test>`, to: ["owner@alpha.test"], cc: [], snippet: body.slice(0, 40),
      receivedAt: new Date(Date.UTC(2026, 10, 1, 0, id)).toISOString(), labels, isUnread: labels.includes("UNREAD"), isImportant: false,
      likelyReplyNeeded: false, triageScore: 0, triageReason: "", metadata: { historyId: String(100 + id) },
    },
    body, html: null, files: [],
  };
}

export function inboxScene(): InboxScene {
  return {
    google: { email: "owner@gmail.test", connection: "grant-1", capabilities: everything },
    mail: [
      letter(1, "Lunch on Friday", ["INBOX", "UNREAD"], "Shall we meet at noon? The menu is at https://cafe.test/menu"),
      letter(2, "Your tax return", ["INBOX"]),
      letter(3, "Win a prize", ["SPAM"]),
      letter(4, "Notes from me", ["SENT"]),
    ],
    history: 500, offline: false, revoked: false, changes: [], attached: [],
    limit: 25 * 1_048_576, forwards: true, forwarded: [],
  };
}

const labelOf: Record<string, string> = { inbox: "INBOX", sent: "SENT", spam: "SPAM", trash: "TRASH", drafts: "DRAFT", starred: "STARRED" };

/** Whether `stored` is found by Gmail's search `query`, in the few words Alpha asks it in. */
function matches(stored: Stored, query: string): boolean {
  return query.split(/\s+/u).filter(Boolean).every((word) => {
    const negated = word.startsWith("-");
    const term = negated ? word.slice(1) : word;
    const [, place] = /^(?:in|is):(\w+)$/u.exec(term) ?? [];
    const found = place === "all" ? !stored.card.labels.some((label) => label === "SPAM" || label === "TRASH")
      : place !== undefined ? stored.card.labels.includes(labelOf[place] ?? place.toUpperCase())
      : `${stored.card.subject} ${stored.body} ${stored.card.from}`.toLowerCase().includes(term.toLowerCase());
    return negated ? !found : found;
  });
}

const refused = (status: number, error: string) => Response.json({ error }, { status });
const google = "/api/v1/eliza/google";
const operations = `${google}/gmail/inbox-v1/operations`;

function status(scene: InboxScene): GoogleStatus {
  const linked = scene.google;
  return {
    provider: "google", side: "owner", mode: "managed", configured: true, connected: linked !== undefined, reason: linked === undefined ? "disconnected" : "connected",
    identity: linked === undefined ? null : { email: linked.email }, grantedCapabilities: linked?.capabilities ?? [], grantedScopes: [], expiresAt: null,
    hasRefreshToken: linked !== undefined, connectionId: linked?.connection ?? null, linkedAt: null, lastUsedAt: null,
  };
}

function operation(requestId: string, kind: MailOperation["receipt"]["kind"], state: MailOperation["receipt"]["state"]): MailOperation {
  return {
    version: 1, providerExactlyOnce: false,
    receipt: { requestId, kind, reviewDigest: "a".repeat(64), state, providerResult: state === "succeeded" ? {} : null, rejectionCode: null, createdAt: "2026-11-01T00:00:00Z", dispatchedAt: null, finishedAt: null },
  };
}

/** What a dispatched label change does to the mailbox. */
function relabel(stored: Stored, kind: string) {
  const without = (label: string) => stored.card.labels.filter((one) => one !== label);
  const labels = kind === "mark-read" ? without("UNREAD") : kind === "mark-unread" ? [...stored.card.labels, "UNREAD"]
    : kind === "archive" ? without("INBOX") : kind === "trash" ? [...without("INBOX"), "TRASH"]
    : kind === "unarchive" ? [...without("INBOX"), "INBOX"] : kind === "untrash" ? [...without("TRASH").filter((one) => one !== "INBOX"), "INBOX"] : stored.card.labels;
  stored.card = { ...stored.card, labels, isUnread: labels.includes("UNREAD") };
}

export function inboxRoutes(scene: InboxScene): Route[] {
  const asked = new Map<string, { kind: MailOperation["receipt"]["kind"]; messageId: string }>();
  const lost = () => Promise.reject(new TypeError("offline"));
  let revokedSeen = false;
  return [
    (request, url) => {
      if (!url.pathname.startsWith(`${google}/`)) return;
      if (scene.offline) return lost();
      if (!scene.revoked) revokedSeen = false;
      if (scene.revoked && (url.pathname !== `${google}/status` || revokedSeen)) {
        revokedSeen = true;
        return refused(403, "google_reauth_required");
      }
      return undefined;
    },
    (request, url) => (scene.stalled && url.pathname === `${google}/status` ? new Promise<Response>(() => undefined) : undefined),
    (request, url) => (request.method === "GET" && url.pathname === `${google}/status` ? Response.json(status(scene)) : undefined),
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== `${google}/gmail/inbox-v1/capabilities`) return;
      const capabilities: MailCapabilities = {
        version: 1, from: scene.google?.email ?? "", reads: scene.forwards ? ["search", "read", "attachment"] : ["search", "read"],
        kinds: ["send", "draft-create", "draft-replace", "draft-delete", "archive", "unarchive", "trash", "untrash", "mark-read", "mark-unread"],
        attachmentPolicy: { mimeTypes: [], maxBytes: scene.limit },
      };
      return Response.json(capabilities);
    },
    (request, url) => {
      const [, to, subject] = /^in:sent to:(\S*) subject:"(.*)"$/u.exec(url.searchParams.get("query") ?? "") ?? [];
      if (request.method !== "GET" || url.pathname !== `${google}/gmail/search` || to === undefined || subject === undefined) return;
      const sent = scene.mail.filter((stored) => stored.card.labels.includes("SENT") && stored.card.to.includes(to) && stored.card.subject === subject);
      const page: MailSearch = { messages: sent.map((stored) => stored.card), nextPageToken: null, syncedAt: "2026-11-01T00:00:00Z", mailboxHistoryId: String(scene.history), supportsSpamTrash: true };
      return Response.json(page);
    },
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== `${google}/gmail/search`) return;
      const size = Number(url.searchParams.get("maxResults") ?? "25");
      const from = Number((url.searchParams.get("pageToken") ?? "p0").slice(1));
      const found = scene.mail.filter((stored) => matches(stored, url.searchParams.get("query") ?? ""));
      const page: MailSearch = {
        messages: found.slice(from, from + size).map((stored) => stored.card), nextPageToken: from + size < found.length ? `p${from + size}` : null,
        syncedAt: "2026-11-01T00:00:00Z", mailboxHistoryId: String(scene.history), supportsSpamTrash: true,
      };
      return Response.json(page);
    },
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== `${google}/gmail/read`) return;
      const stored = scene.mail.find((one) => one.card.id === url.searchParams.get("messageId"));
      if (!stored) return refused(404, "not_found");
      const read: MailMessage = { message: stored.card, bodyText: stored.body, bodyHtml: stored.html, bodyHtmlStatus: stored.html === null ? "none" : "available", attachments: stored.files };
      return Response.json(read);
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== operations) return;
      return request.json().then(({ requestId, proposal }: { requestId: string; proposal: { kind: MailOperation["receipt"]["kind"]; messageId: string } }) => {
        asked.set(requestId, proposal);
        return Response.json(operation(requestId, proposal.kind, "prepared"));
      });
    },
    (request, url) => {
      const requestId = new RegExp(`^${operations}/([^/]+)/dispatch$`, "u").exec(url.pathname)?.[1];
      if (scene.lost === undefined || request.method !== "POST" || requestId === undefined || asked.get(requestId)?.kind !== "send") return;
      if (scene.lost === "unsent") return lost();
      return request.json().then(({ proposal }: { proposal: { to: string[]; subject: string; bodyText: string } }) => {
        scene.changes.push(`send ${proposal.to.join(",")} ${proposal.subject}`);
        scene.mail.push({ ...letter(scene.mail.length + 100, proposal.subject, ["SENT"], proposal.bodyText), card: { ...letter(scene.mail.length + 100, proposal.subject, ["SENT"]).card, to: proposal.to } });
        return lost();
      });
    },
    (request, url) => {
      const requestId = new RegExp(`^${operations}/([^/]+)/dispatch$`, "u").exec(url.pathname)?.[1];
      if (request.method !== "POST" || requestId === undefined || asked.get(requestId)?.kind !== "send") return;
      return request.json().then(({ proposal }: { proposal: { to: string[]; subject: string; bodyText: string; attachments?: { name: string }[]; forwardAttachments?: { messageId: string; partIds: string[] } } }) => {
        scene.changes.push(`send ${proposal.to.join(",")} ${proposal.subject}`);
        scene.attached.push(...(proposal.attachments ?? []).map((file) => file.name));
        scene.forwarded.push(...(proposal.forwardAttachments?.partIds ?? []).map((part) => `${proposal.forwardAttachments?.messageId}/${part}`));
        scene.mail.push({ ...letter(scene.mail.length + 100, proposal.subject, ["SENT"], proposal.bodyText), card: { ...letter(scene.mail.length + 100, proposal.subject, ["SENT"]).card, to: proposal.to } });
        return Response.json(operation(requestId, "send", "succeeded"));
      });
    },
    (request, url) => {
      const requestId = new RegExp(`^${operations}/([^/]+)/dispatch$`, "u").exec(url.pathname)?.[1];
      const kind = requestId === undefined ? undefined : asked.get(requestId)?.kind;
      if (request.method !== "POST" || requestId === undefined || (kind !== "draft-create" && kind !== "draft-replace" && kind !== "draft-delete")) return;
      return request.json().then(({ proposal }: { proposal: { subject?: string; draftId?: string } }) => {
        scene.changes.push(`${kind} ${proposal.subject ?? proposal.draftId ?? ""}`);
        const done = operation(requestId, kind, "succeeded");
        const draftId = proposal.draftId ?? `d${scene.changes.length}`;
        return Response.json(kind === "draft-delete" ? done : { ...done, receipt: { ...done.receipt, providerResult: { draftId, messageId: `m${draftId}`, providerDigest: "b".repeat(64) } } });
      });
    },
    (request, url) => {
      const requestId = new RegExp(`^${operations}/([^/]+)/dispatch$`, "u").exec(url.pathname)?.[1];
      if (request.method !== "POST" || requestId === undefined) return;
      const proposal = asked.get(requestId);
      const stored = scene.mail.find((one) => one.card.id === proposal?.messageId);
      if (!proposal || !stored) return refused(404, "not_found");
      relabel(stored, proposal.kind);
      scene.history += 1;
      scene.changes.push(`${proposal.kind} ${proposal.messageId}`);
      return Response.json(operation(requestId, proposal.kind, "succeeded"));
    },
  ];
}
