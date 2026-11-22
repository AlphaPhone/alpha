// spec/telephony/drafts.md, "Only the owner's Send binds a draft to an operation, and Send again reuses the bound operation"

/**
 * A fresh operation ID for a reviewed send: the journal's idempotency key.
 * @throws {never}
 */
export function newOperationId(): string {
  return crypto.randomUUID();
}
