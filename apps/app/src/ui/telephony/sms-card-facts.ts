/** The visible message details of a validated SMS proposal. */
export type SmsReviewPreview = {recipient: string; body: string; note: string};

export function smsReviewCopy(recipient: string, body: string, note: string) {
  return {
    smsPreview: {recipient, body, note},
    description: [recipient, body, note].filter(Boolean).join('\n\n'),
  };
}

// GSM 03.38 default alphabet and its extension table (each extension character costs two septets).
const GSM_BASIC = new Set('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà');
const GSM_EXTENDED = new Set('^{}\\[~]|€\f');

/** Splits `costs` into parts of at most `size` units, never splitting one character. */
function parts(costs: number[], single: number, size: number) {
  if (costs.reduce((sum, cost) => sum + cost, 0) <= single) return 1;
  let count = 1, used = 0;
  for (const cost of costs) {
    if (used + cost > size) { count++; used = 0; }
    used += cost;
  }
  return count;
}
/**
 * How many linked texts Android is likely to send this as: 160 GSM characters in one text (153 per
 * part when split), otherwise 70 UTF-16 units (67 per part). Android divides the text itself and a
 * carrier's settings can change the count, so the card words it as likely.
 */
export function smsPartEstimate(body: string): number {
  const gsm: number[] = [], unicode: number[] = [];
  let encodable = true;
  for (const char of body) {
    unicode.push(char.length);
    if (GSM_BASIC.has(char)) gsm.push(1);
    else if (GSM_EXTENDED.has(char)) gsm.push(2);
    else encodable = false;
  }
  return encodable ? parts(gsm, 160, 153) : parts(unicode, 70, 67);
}

/**
 * What a reviewed text to one person does when that person's conversation is already open in
 * Messages: the phone puts it in that conversation's text field and sends nothing (AC-14).
 */
export const SMS_OPEN_THREAD_DRAFT = 'If your conversation with them is open in Messages, it goes into its text field instead, and nothing is sent until you tap Send there.';

/**
 * The lines under a text's body on its card. `draftsInOpenThread`: a text to one person
 * (`sms_compose`) that becomes a draft when that person's conversation is open.
 */
export function smsSendFacts(recipients: number, body: string, draftsInOpenThread = false): string {
  const lines: string[] = [];
  if (recipients > 1) lines.push('Each person gets their own text. This isn’t a group message.');
  const count = smsPartEstimate(body);
  if (count > 1) lines.push(`${recipients > 1 ? 'Each person likely gets it' : 'It likely goes'} as ${count} linked texts.`);
  if (draftsInOpenThread) lines.push(SMS_OPEN_THREAD_DRAFT);
  return lines.join('\n');
}
