/**
 * Why an unsent composer review cannot be confirmed, for each way it can differ from the email now
 * in the composer. The journal and its binding comparison stay upstream
 * (`@elizaos/plugin-inbox/mailbox/operation-journal`); its own refusal inside `confirm()` uses the
 * same wording.
 */
import type { ReviewBinding } from "@elizaos/plugin-inbox/mailbox/operation-journal";

export const reviewBindingRefusal: Record<
  Exclude<ReviewBinding, "bound">,
  string
> = {
  edited:
    "This email was edited after this review, so the review was discarded. Nothing was sent. Review the current email before sending.",
  other:
    "This review was made for a different email than the one now in the composer, so it was discarded. Nothing was sent. Review the current email before sending.",
  absent:
    "This review is for an email that is not open in the composer, so it cannot be confirmed. Nothing was sent. Open that email and choose Send to review it again, or cancel this review.",
};
