// spec/app/approvals/operation.md, "Story: Know what the agent is asking for"; spec/app/approvals/proposal.md, "Story: Be asked before Alpha acts"
import type { Operation, Preference } from "../../gen/app__approvals__operation.ts";
import { emergency, provable } from "../../gen/app__approvals__operation.ts";
import type { Result } from "../../gen/app__approvals__proposal.ts";

/** Display details and execution hooks for one agent proposal held beside the approvals machine. */
export interface ProposalDetail {
  readonly id: number;
  readonly proposalId: string;
  readonly title: string;
  readonly detail: string;
  readonly operation: Operation;
  readonly available: boolean;
  readonly lines?: readonly string[];
  readonly execute?: () => Promise<Result>;
  readonly readBack?: () => Promise<Result>;
}

/** Human-readable card presentation derived from a proposal's details and kind. */
export interface ProposalCardSummary {
  readonly title: string;
  readonly summary: string;
  readonly actionLabel: string;
  readonly danger: boolean;
}

const showKinds = new Set([
  "open-view",
  "views.open",
  "settings.open",
  "files.open",
  "photos.view",
  "show",
]);

const openPageKinds = new Set([
  "browser.open",
  "browser.open-page",
  "open-page",
]);

const glanceKinds = new Set([
  "calendar.glance",
  "calendar.availability",
  "calendar.freebusy",
  "glance",
]);

const lookKinds = new Set([
  "notes.read",
  "messages.read",
  "inbox.read",
  "files.read",
  "photos.library",
  "look",
]);

const makeKinds = new Set([
  "notes.create",
  "camera.capture-photo",
  "camera.capture",
  "make",
]);

const emergencyKinds = new Set([
  "phone.emergency",
  "emergency-call",
  "emergency",
]);

/** Maps an operation identifier from the agent into the spec's seven operation kinds. */
export function classifyOperation(kind: string, emergencyCall = false): Operation {
  const normalized = kind.trim().toLowerCase();
  if (emergencyCall || emergencyKinds.has(normalized)) return "EmergencyCall";
  if (showKinds.has(normalized)) return "Show";
  if (openPageKinds.has(normalized)) return "OpenPage";
  if (glanceKinds.has(normalized)) return "Glance";
  if (lookKinds.has(normalized)) return "Look";
  if (makeKinds.has(normalized)) return "Make";
  return "Change";
}

/** Translates the Settings review-first toggle into the spec's three-valued Preference. */
export function preferenceFromSetting(reviewFirst: boolean | undefined): Preference {
  if (reviewFirst === false) return "Direct";
  if (reviewFirst === true) return "ReviewFirst";
  return "Unreadable";
}

/** Formats the card title, summary, primary action label and risk flag for a proposal. */
export function describeProposal(detail: ProposalDetail): ProposalCardSummary {
  if (emergency(detail.operation)) {
    return {
      title: detail.title || "Emergency call",
      summary: detail.detail || "Alpha cannot place emergency calls. Dial emergency services yourself.",
      actionLabel: "Dial yourself",
      danger: true,
    };
  }
  const actionLabel = detail.operation === "Show" || detail.operation === "OpenPage"
    ? "Open"
    : detail.operation === "Glance" || detail.operation === "Look"
      ? "Allow read"
      : detail.operation === "Make"
        ? "Create"
        : "Approve";
  return {
    title: detail.title,
    summary: detail.detail,
    actionLabel,
    danger: provable(detail.operation),
  };
}
