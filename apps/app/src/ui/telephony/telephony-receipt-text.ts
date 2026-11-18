/** Owner-facing receipt text for one telephony action: shown as the proposal card subtitle,
 * the toast and the device receipt bubble. The receipt sent to the agent carries only the
 * outcome and the typed result, never this text. Alpha owns every sentence; the receipt
 * outcomes, validators and capabilities stay in the shared telephony contract. Each is one short
 * sentence that states the outcome and nothing more (owner, 2026-11-17): no approval narration,
 * explanation or disclaimer, and never "the owner", since the owner reads it as written.
 * The structured result beside it (`telephonyResult`) still tells the agent exactly what was observed. */
import type { PhoneDialResult } from "@elizaos/contracts/phone-dial";
import type { TelephonyActionResult } from "@elizaos/plugin-assistant/device-actions/telephony-actions-contract";
import type { SmsSendResult } from "@elizaos/contracts/native-telephony";

type ResultOf<Kind extends TelephonyActionResult["kind"]> = Extract<
  TelephonyActionResult,
  { kind: Kind }
>;

/** Fixed, factual text for a call receipt. It never says a call connected. */
export function phoneCallResultText(result: ResultOf<"phone-call">): string {
  switch (result.status) {
    case "placed":
      return "Call started.";
    case "emergency-handoff":
      return "Emergency number opened in the dialer.";
    case "not-found":
      return "No contact with a phone number matched.";
    case "busy":
      return "Another call is in progress.";
    case "cancelled":
      return "Call cancelled.";
    case "unavailable":
      return "Calls are unavailable right now.";
    case "failed":
      return "The call could not start.";
  }
}

export function contactWriteResultText(
  result: ResultOf<"contact-write">,
): string {
  switch (result.status) {
    case "saved":
      return "Contact saved.";
    case "deleted":
      return "Contact deleted.";
    case "not-found":
      return "No matching contact was found.";
    case "stale":
      return "The contact changed, so it was left as is.";
    case "cancelled":
      return "Contact change cancelled.";
    case "unavailable":
      return "Contacts are unavailable right now.";
    case "unknown":
      return "The phone could not confirm the contact change.";
    case "failed":
      return "The contact change failed.";
  }
}

export function smsComposeResultText(result: ResultOf<"sms-compose">): string {
  switch (result.status) {
    case "drafted":
      return "Draft added to the conversation, not sent.";
    case "submitted":
      return "Message handed to the carrier.";
    case "sent":
      return "Message sent.";
    case "delivered":
      return "Message delivered.";
    case "unknown":
      return "The phone could not confirm the message was sent.";
    case "not-found":
      return "No contact with a phone number matched.";
    case "cancelled":
      return "Message cancelled.";
    case "unavailable":
      return "Messages are unavailable right now.";
    case "failed":
      return "The message was not sent.";
  }
}

export function smsReplyResultText(result: ResultOf<"sms-reply">): string {
  switch (result.status) {
    case "drafted":
      return "Draft added to the open conversation, not sent.";
    case "none-selected":
      return "No conversation is open.";
    case "occupied":
      return "That conversation is busy.";
    case "unavailable":
      return "Drafts are unavailable right now.";
  }
}

export function voicemailDeleteResultText(
  result: ResultOf<"voicemail-delete">,
): string {
  switch (result.status) {
    case "deleted":
      return "Voicemail deleted.";
    case "none-selected":
      return "No voicemail is open.";
    case "cancelled":
      return "Voicemail kept.";
    case "unavailable":
      return "Voicemail is unavailable right now.";
    case "failed":
      return "The voicemail could not be deleted.";
  }
}

/** Fixed text for a reviewed dial hand-off. A dial result is a hand-off, never a placed call. */
export function phoneDialResultText(result: PhoneDialResult): string {
  switch (result.status) {
    case "handed-off":
      return "Phone app opened with the number.";
    case "cancelled":
      return "Dial cancelled.";
    case "unavailable":
      return "No phone app could open the number.";
    case "failed":
      return "The phone app could not be opened.";
  }
}

/** The receipt for an approved text to a number (`sms.send.v1`). Messages' own screen keeps its
 * longer status labels (`smsReceiptLabel`); the structured `smsResult` carries the exact status. */
export function smsSendResultText(status: SmsSendResult["status"]): string {
  switch (status) {
    case "submitted":
      return "Message handed to Android.";
    case "sent":
      return "Message sent.";
    case "delivered":
      return "Message delivered.";
    case "cancelled":
      return "Message cancelled.";
    case "denied":
      return "The message was not sent because access changed.";
    case "failed":
      return "Sending failed, and some parts may have gone out.";
    case "unknown":
      return "The phone could not confirm the message was sent.";
  }
}

/** Fixed, factual text for a telephony receipt. The agent's untrusted-data marker for a read
 * lives in the shared contract, not in this owner-facing text. */
export function telephonyActionResultText(
  result: TelephonyActionResult,
): string {
  switch (result.kind) {
    case "phone-call":
      return phoneCallResultText(result);
    case "contact-write":
      return contactWriteResultText(result);
    case "contact-show":
      return result.status === "shown"
        ? "Contacts shows the matching contacts."
        : result.status === "not-found"
          ? "No matching contact was found."
          : "Contacts are unavailable right now.";
    case "contact-read":
      return result.status === "read"
        ? "Shared the open contact."
        : result.status === "none-selected"
          ? "No contact is open."
          : "Contacts are unavailable right now.";
    case "sms-compose":
      return smsComposeResultText(result);
    case "sms-reply":
      return smsReplyResultText(result);
    case "voicemail-delete":
      return voicemailDeleteResultText(result);
    case "sms-latest-sender":
      return result.status === "found"
        ? `Latest incoming SMS sender ends in ${result.numberEnding}.`
        : result.status === "empty"
          ? "No incoming SMS messages."
          : result.status === "sender-unavailable"
            ? "The latest incoming SMS has no readable phone number."
            : "Messages are unavailable right now.";
    case "messages-read":
      return result.status === "read"
        ? "Shared the open thread."
        : result.status === "none-selected"
          ? "No message thread is open."
          : "Messages are unavailable right now.";
    case "voicemail-read":
      return result.status === "read"
        ? "Shared the open voicemail."
        : result.status === "none-selected"
          ? "No voicemail is open."
          : "Voicemail is unavailable right now.";
  }
}

