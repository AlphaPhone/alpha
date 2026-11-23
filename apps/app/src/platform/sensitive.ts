// spec/browser/reading.md, "The review opens on a settled page, fetches its public text once, and a sensitive address or text refuses it for good"; spec/assistant/noticeQuestion.md, "A workflow approval notice is asked about through a reviewed excerpt, rechecked and consumed at Add to chat, and asking never decides the step"

const SENSITIVE =
  /(?:api[\s_-]*key|access[\s_-]*token|refresh[\s_-]*token|password|passphrase|passcode|credential|(?<![a-z])vaults?(?![a-z])|one[\s-]*time[\s-]*(?:password|code)|verification[\s-]*code|security[\s-]*code|authentication[\s-]*code|recovery[\s-]*(?:code|key|phrase)|backup[\s-]*(?:code|key)|seed[\s-]*phrase|secret[\s-]*key|private[\s-]*key|authenticator|two[\s-]*factor|multi[\s-]*factor|(?<![a-z])sign[\s-]*in(?![a-z])|(?<![a-z])log[\s-]*in(?![a-z])|\botp\b|\bmfa\b|\b2fa\b)/i;

const words = (value: string) => value.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
const normalize = (value: string) => value.normalize("NFKC").replace(/[​-‍﻿]/g, "");

/** Credential prose or an unlabelled six-to-eight digit code. */
export function sensitiveText(text: string): boolean {
  const value = normalize(text);
  return SENSITIVE.test(value) || SENSITIVE.test(words(value)) || /(?:^|\D)\d{6,8}(?:\D|$)/.test(value);
}
