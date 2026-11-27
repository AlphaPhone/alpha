// spec/app/voice/index.md, "When the owner finishes speaking, the microphone closes, and only then is the turn sent, once and automatically"

/** v119 45f6bed30 apps/app/src/prototype/voice-adapter.ts:987: a Cloud streaming turn is sent this long after the relay's final words, unless speech starts again first. */
export const CLOUD_TURN_GAP_MS = 400;

export interface TurnClock {
  readonly set: (run: () => void, ms: number) => unknown;
  readonly clear: (handle: unknown) => void;
}

/**
 * One utterance over the Cloud relay, joined from its finals as v119's voice session joined its segments
 * (45f6bed30 .eliza/client-features/packages/voice/src/voice-assistant-session.ts:15-16): each final starts the
 * long gap again, speech before it ends keeps the utterance open, and the gap sends the joined words once.
 */
export class TurnGap {
  #held = "";
  #timer: unknown;
  #done = false;
  #speaking = false;

  /** @throws {never} */
  constructor(
    private readonly send: (text: string) => void,
    private readonly clock: TurnClock,
    private readonly gapMs: number = CLOUD_TURN_GAP_MS,
  ) {}

  /** The words of this utterance not yet sent. */
  get held(): string {
    return this.#held;
  }

  /** Whether this utterance still has words to send: words held for the gap, or speech whose final has not come yet. */
  get waiting(): boolean {
    return !this.#done && (this.#held !== "" || this.#speaking);
  }

  /** Speech started again: the turn is not sent at the gap, and the utterance continues. @throws {never} */
  speechStarted(): void {
    if (this.#done) return;
    this.#speaking = true;
    this.#stopTimer();
  }

  /** A final from the relay: its words join the utterance, and the gap starts again from now. @throws {never} */
  segment(text: string | null): void {
    if (this.#done) return;
    this.#speaking = false;
    const words = text?.trim() ?? "";
    if (words !== "") this.#held = this.#held === "" ? words : `${this.#held} ${words}`;
    this.#stopTimer();
    if (this.#held === "") return;
    this.#timer = this.clock.set(() => {
      this.#timer = undefined;
      this.#sendHeld();
    }, this.gapMs);
  }

  /** Send what is held once the gap has passed. @throws {never} */
  #sendHeld(): void {
    this.#stopTimer();
    if (this.#done || this.#held === "") return;
    const text = this.#held;
    this.#held = "";
    this.send(text);
  }

  /** Drop what is held and send nothing more. @throws {never} */
  cancel(): void {
    this.#stopTimer();
    this.#held = "";
    this.#speaking = false;
    this.#done = true;
  }

  /** The words heard so far for the preview: what is held, then the speech in progress. @throws {never} */
  joined(interim: string): string {
    const now = interim.trim();
    if (this.#held === "") return interim;
    return now === "" ? this.#held : `${this.#held} ${now}`;
  }

  #stopTimer(): void {
    if (this.#timer === undefined) return;
    this.clock.clear(this.#timer);
    this.#timer = undefined;
  }
}
