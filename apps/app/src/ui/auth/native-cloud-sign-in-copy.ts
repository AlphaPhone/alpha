/**
 * Owner-facing copy for native Cloud sign-in failures, shown on Alpha's sign-in screens.
 *
 * The failure codes are the shared native sign-in client's wire contract
 * (`NativeCloudSignInFailureCode` in the staged `packages/auth/src/auth/native-cloud-sign-in.ts`,
 * which still owns the bridge types and parsers). The UI tree cannot import the staged tree, so
 * the union is restated here and `runtime/cloud-sign-in.ts` checks at compile time that the two are
 * the identical type.
 */

/** Failure codes the native client rejects with (`PluginCall.reject(message, code)`). */
export type NativeCloudSignInFailureCode =
  | "cancelled"
  | "login-active"
  | "invalid-phone"
  | "invalid-email"
  | "invalid-code"
  | "cooldown"
  | "expired"
  | "rate-limited"
  | "offline"
  | "unavailable"
  | "account-check"
  | "state-mismatch"
  | "browser-closed"
  | "browser-unavailable"
  | "provider-refused"
  | "mfa-browser"
  | "mfa-unsupported"
  | "activation-pending"
  | "activation-expired"
  | "storage"
  | "rejected"
  | "invalid-request"
  | "app-link-unverified"
  | "attempts-exhausted"
  | "google-account-unavailable";

export interface NativeCloudSignInCopy {
  /** The deployment's public name, e.g. "Eliza Cloud". */
  serviceName: string;
  /** The app's own name, e.g. "Alpha". */
  productName: string;
}

/** Owner-facing copy. Never includes server text, codes or addresses. */
export function nativeCloudSignInFailureMessage(
  code: NativeCloudSignInFailureCode,
  { serviceName, productName }: NativeCloudSignInCopy,
): string {
  switch (code) {
    case "cancelled":
      return "Sign-in cancelled.";
    case "login-active":
      return "A sign-in is already in progress. Finish or cancel it first.";
    case "invalid-phone":
      return "Enter your phone number with its country code, such as +14155550100.";
    case "invalid-email":
      return "Enter a valid email address.";
    case "invalid-code":
      return "That code did not work. Check it and try again, or send a new code.";
    case "cooldown":
      return "Wait a minute before sending another code.";
    case "expired":
      return "This sign-in expired. Start again.";
    case "rate-limited":
      return "Too many attempts. Wait a few minutes, then try again.";
    case "offline":
      return `${productName} could not reach ${serviceName}. Check your connection and try again.`;
    case "account-check":
      return `This account needs an extra check that ${productName} cannot complete. Use account recovery or contact ${serviceName} support.`;
    case "state-mismatch":
      return "That sign-in return did not match this phone’s request. Start again.";
    case "browser-closed":
      return "Google sign-in was closed before it finished. Start again when you are ready.";
    case "browser-unavailable":
      return "No browser that can show Google sign-in is available. Use your email instead.";
    case "google-account-unavailable":
      return "Google could not complete sign-in on this device. Check your Google account and update Google Play services, then try again or use email.";
    case "provider-refused":
      return "Google did not complete the sign-in. Try again or use your email.";
    case "mfa-browser":
      return `This account needs a second verification step. Sign in with your email to complete it in ${productName}.`;
    case "mfa-unsupported":
      return `This account’s second verification method is not available in ${productName} yet. Use account recovery or contact ${serviceName} support.`;
    case "activation-pending":
      return `Signed in, but ${serviceName} has not confirmed this phone yet. ${productName} retries when it starts again; you can also sign in again.`;
    case "activation-expired":
      return `${serviceName} did not confirm this sign-in in time, so you are not signed in. Sign in again.`;
    case "storage":
      return `${productName} could not save the sign-in securely on this phone. Try again.`;
    case "app-link-unverified":
      return `${productName} did not receive the sign-in from your browser, so you are not signed in yet. Start sign-in again in ${productName}.`;
    case "attempts-exhausted":
      return "Too many incorrect codes. Send a new code and try again.";
    case "rejected":
    case "invalid-request":
      return `${serviceName} refused this sign-in. Start again.`;
    default:
      return `${serviceName} sign-in is unavailable right now. Try again.`;
  }
}
