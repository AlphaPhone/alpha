import { literalMailAddress } from './drafts-controller';

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
      row.actionName !== 'MESSAGE' ||
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

export function draftMailRecipients(input: string) {
  const values = input.split(',').map((address) => address.trim());
  return values.length <= 20 && values.every(literalMailAddress)
    ? [...new Set(values)]
    : undefined;
}
