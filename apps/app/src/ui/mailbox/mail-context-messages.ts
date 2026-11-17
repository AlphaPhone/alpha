/**
 * What "Ask agent about this email" says when the shared reviewed mail context
 * (`plugins/plugin-inbox/src/mailbox/mail-context.ts`) refuses a review or a send. Each sentence
 * it throws is worded by Alpha here; an unknown refusal reads as Alpha's fallback.
 */

/** Keyed by every sentence `reviewMailContext` and `validateMailContext` throw. */
export const MAIL_CONTEXT_REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Select a current message and connected agent", "Open a current email and connect your agent first."],
  [
    "This complete message exceeds the agent context limit. Nothing was sent.",
    "This email is too long to send to your agent in full. Nothing was sent.",
  ],
  [
    "Message or destination changed. Review again; nothing was sent.",
    "The email or your agent changed. Review it again; nothing was sent.",
  ],
]);

/** Shown for a refusal the table does not name. */
export const MAIL_CONTEXT_FALLBACK = "This email couldn’t be shared with your agent. Nothing was sent.";

/** Alpha's sentence for a refused mail-context review or send. */
export function mailContextErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  return MAIL_CONTEXT_REFUSALS.get(message) ?? MAIL_CONTEXT_FALLBACK;
}
