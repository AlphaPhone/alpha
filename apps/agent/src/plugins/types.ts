// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import type { AgentPlugin, LocalRoute } from "@elizaos/agent-host";

/** Action definition derived from eliza's AgentPlugin contract. */
export type AgentAction = NonNullable<AgentPlugin["actions"]>[number];

/** Provider definition derived from eliza's AgentPlugin contract. */
export type AgentProvider = NonNullable<AgentPlugin["providers"]>[number];

/** Runtime parameter of an action handler. */
export type AgentRuntimeLike = Parameters<AgentAction["handler"]>[0];

/** Route definition derived from eliza's agent routes contract. */
export type AgentRoute = LocalRoute;

/** Minimal interface for the notification runtime service when registered. */
export interface NotificationServiceLike {
  notify(input: {
    readonly title: string;
    readonly body?: string;
    readonly category: string;
    readonly source: string;
    readonly groupKey?: string;
    readonly data?: Record<string, unknown>;
  }): Promise<unknown>;
}

/** Narrow an unknown value to a plain key-value record. */
export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Read a trimmed non-empty string field, or undefined. */
export function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** Read a string field (including empty string), or undefined. */
export function readRawString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

/** Read a finite number field, or undefined. */
export function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Read a boolean field, or undefined. */
export function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}
