/**
 * The session-bound fetch surface plugin clients type against, and the
 * incremental SSE line framer the streaming transports share.
 */
/** Per-call options accepted by `ElizaClient.fetch`. */
export interface ElizaClientFetchOptions<T> {
  allowNonOk?: boolean;
  timeoutMs?: number;
  /** Skip the 202 resume-retry loop (see `rawRequest.skipResume`). */
  skipResume?: boolean;
  /**
   * Called with the (bounded-read, best-effort-parsed) body when the FIRST
   * response is a 202 and `skipResume` is set — lets the status poll map the
   * cloud resume-progress body to a real value WITHOUT bypassing the shared
   * bounded body-read / timeout logic (#14040 sub-defect 2). Non-202
   * responses go through the normal strict-parse path unchanged.
   */
  on202?: (body: unknown) => T;
}

/**
 * The JSON request surface of `ElizaClient`. Plugin clients that only need a
 * session-bound fetch depend on this instead of the whole client class.
 */
export interface ElizaClientFetch {
  fetch<T>(
    path: string,
    init?: RequestInit,
    options?: ElizaClientFetchOptions<T>,
  ): Promise<T>;
}

/** Incremental SSE line framing. Decode bytes and validate event data in the
 * owning transport; this layer preserves lines without interpreting payloads.
 * Pending fragments are joined only once, when a line ends, so one large event
 * split across small network chunks does not repeatedly scan its old prefix. */
export class SseEventFramer {
  private lineParts: string[] = [];
  private lines: string[] = [];

  /** Returns true when the consumer stops at a terminal event. */
  push(chunk: string, onEvent: (lines: readonly string[]) => boolean): boolean {
    let start = 0;
    while (true) {
      const boundary = chunk.indexOf("\n", start);
      if (boundary === -1) break;
      this.lineParts.push(chunk.slice(start, boundary));
      const line = this.lineParts.join("").replace(/\r$/, "");
      this.lineParts = [];
      start = boundary + 1;
      if (line !== "") {
        this.lines.push(line);
        continue;
      }
      const event = this.lines;
      this.lines = [];
      if (onEvent(event) === true) return true;
    }
    if (start < chunk.length) this.lineParts.push(chunk.slice(start));
    return false;
  }

  /** A host may accept an unterminated final event; strict hosts reject EOF. */
  takePending(): readonly string[] {
    const lines = this.lines;
    if (this.lineParts.length) lines.push(this.lineParts.join(""));
    this.lines = [];
    this.lineParts = [];
    return lines;
  }
}
