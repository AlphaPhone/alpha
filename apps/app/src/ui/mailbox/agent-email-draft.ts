import { v5 as uuidv5 } from 'uuid';
import { literalMailAddress } from './drafts-controller';

const gmailComposeActions = new Set([
  'MESSAGE',
  'MESSAGE_DRAFT_FOLLOWUP',
  'MESSAGE_SEND_DRAFT',
  'MESSAGE_SEND',
]);

const gmailSendNamespace = uuidv5('https://alphacompute.ai/id/gmail-send', uuidv5.URL);

/** The exact email a chat draft's Send prepares, under its Gmail operation request ID.
 * Cloud binds a request ID to the first operation prepared with it and refuses it for any other,
 * so the ID names the owner's turn and this content (account and whole proposal): the same email
 * reuses its ID, keeping a retry idempotent, and an edited email is prepared under its own. A
 * name-based RFC UUID, valid even when Eliza persisted a version-zero message ID. */
export function agentEmailSend(
  messageId: string,
  account: { grant: string; from: string },
  mail: { to: readonly string[]; subject: string; body: string },
) {
  const proposal = {
    mode: 'compose',
    to: [...mail.to],
    cc: [] as string[],
    bcc: [] as string[],
    subject: mail.subject,
    bodyText: mail.body,
    attachments: [] as unknown[],
  };
  const content = [messageId.toLowerCase(), account.grant, account.from, { kind: 'send', ...proposal }];
  return {
    draftId: 'agent-email:' + messageId,
    proposal,
    requestId: uuidv5(JSON.stringify(content), gmailSendNamespace),
  };
}

/** The resident offers only an unsent, phone-owned email. Provider send requests and arbitrary
 * reply text are never interpreted as drafts. Bind its offer to the turn that produced it. */
export function agentEmailDraft(
  results: readonly unknown[] | undefined,
  requestMessageId: string | undefined,
) {
  if (
    !requestMessageId ||
    !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(requestMessageId)
  )
    return;
  const matches = [];
  for (const result of results ?? []) {
    if (!result || typeof result !== 'object') continue;
    const row = result as Record<string, unknown>,
      values = row.values as Record<string, unknown> | null;
    if (
      row.success !== true ||
      typeof row.actionName !== 'string' ||
      !gmailComposeActions.has(row.actionName) ||
      values?.mode !== 'local-compose' ||
      values.targetId !== 'inbox'
    )
      continue;
    const offer = values.emailDraft as Record<string, unknown> | null;
    if (
      !offer ||
      offer.version !== 1 ||
      offer.requestMessageId !== requestMessageId ||
      !Array.isArray(offer.to) ||
      offer.to.length > 20 ||
      !offer.to.length
    )
      return;
    if (
      typeof offer.subject !== 'string' ||
      offer.subject.length > 998 ||
      /[\r\n]/.test(offer.subject) ||
      typeof offer.body !== 'string' ||
      !offer.body.trim() ||
      offer.body.length > 64000
    )
      return;
    // Leave an unresolved contact for the owner to address. Never turn a contact name into an email.
    if (
      offer.to.some(
        (to) =>
          typeof to !== 'string' ||
          !to.trim() ||
          to.length > 254 ||
          /[\r\n]/.test(to),
      )
    )
      return;
    matches.push({
      id: requestMessageId,
      to: [...offer.to] as string[],
      subject: offer.subject,
      body: offer.body,
    });
  }
  return matches.length === 1 ? matches[0] : undefined;
}

/** Each distinct entry of a To line, in order, as the owner checks it before Send. */
export function draftRecipientList(input: string) {
  return [...new Set(input.split(',').map((address) => address.trim()).filter(Boolean))];
}

export function draftMailRecipients(input: string) {
  const values = input.split(',').map((address) => address.trim());
  return values.length <= 20 && values.every(literalMailAddress)
    ? [...new Set(values)]
    : undefined;
}
