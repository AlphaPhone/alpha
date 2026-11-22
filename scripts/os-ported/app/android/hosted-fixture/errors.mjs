// Ported for Alpha from elizaOS/eliza develop 89baf73d94df6437dd0677543ff23997bd0d8a70 (packages/app/scripts/mobile/android/hosted-fixture/errors.mjs, MIT); retire when @elizaos/os offers it.
/** A disposable fixture could not be admitted or qualified from observed state. */
export class HostedFixtureError extends Error {
  constructor(message) {
    super(message);
    this.name = "HostedFixtureError";
  }
}
