import type { CloudEnvironment } from './cloud-protocol';
import {
  NativeCloudSignInError,
  nativeCloudSignInFailureMessage,
  nativeSignInAuthenticated,
  nativeSignInCodeStarted,
  nativeSignInGoogleOutcome,
  nativeSignInReadiness,
  nativeSignInVerified,
  normalizeNativeSignInCode,
  validNativeSignInEmail,
  validNativeSignInPhone,
  type NativeCloudSignInAuthenticated,
  type NativeCloudSignInCodeStarted,
  type NativeCloudSignInFailureCode,
  type NativeCloudSignInGoogleOutcome,
  type NativeCloudSignInMfaRequired,
} from '../../../../.eliza/client-features/packages/auth/src/auth/native-cloud-sign-in.ts';
import type { AlphaCloudSignInPlugin } from '../native/alpha-cloud-sign-in.ts';

/**
 * Alpha binding of the shared native Eliza Cloud sign-in renderer contract. Sign-in happens on
 * Alpha's own screens: an email or SMS code typed into
 * Alpha, or Google in the user's external browser. No Eliza Cloud web page is part of a
 * successful sign-in.
 *
 * The port's host (AlphaCloudSignInPlugin, a registration of the shared
 * `ai.eliza.auth.cloud.CloudSignInPlugin`, or the development Cloud bridge in a test-mocks browser
 * build) holds the Steward session, the PKCE verifiers and states and the authorization codes; none
 * of them crosses to the renderer. Parsing of every answer, the failure codes and the copy live
 * upstream in `@elizaos/auth/auth/native-cloud-sign-in`, projected from the pinned checkout. Alpha
 * supplies only its product name and its two deployment names.
 *
 * Email remains in Alpha when readiness is unavailable. The readiness probe gates Google;
 * it never selects hosted login as a fallback.
 */
export type CloudSignInAuthenticated = NativeCloudSignInAuthenticated<CloudEnvironment>;
export type CloudSignInEmailStarted = NativeCloudSignInCodeStarted;
export type CloudSignInMfaRequired = NativeCloudSignInMfaRequired;
export type CloudSignInGoogleOutcome = NativeCloudSignInGoogleOutcome<CloudEnvironment>;
export type CloudSignInPort = AlphaCloudSignInPlugin;
export const CloudSignInError = NativeCloudSignInError;
export type CloudSignInError = NativeCloudSignInError;

/** Owner-facing copy. Never includes server text, codes or addresses. Where the screen already
 * carries the next step (a Try again button, Resend under the code), Alpha states only the fact. */
export function signInFailureMessage(code: NativeCloudSignInFailureCode, serviceName: string): string {
  if (code === 'invalid-code') return 'Wrong code';
  if (code === 'app-link-unverified') return 'Didn’t finish';
  if (code === 'activation-pending') return 'Not confirmed yet';
  const message = nativeCloudSignInFailureMessage(code, { serviceName, productName: 'Alpha' });
  return message === `${serviceName} sign-in is unavailable right now. Try again.` ? 'Unavailable' : message;
}
export const authenticated = (value: unknown, environment: CloudEnvironment): CloudSignInAuthenticated => nativeSignInAuthenticated(value, environment);
export const emailStarted = (value: unknown): CloudSignInEmailStarted => nativeSignInCodeStarted(value);
export const verified = (value: unknown, environment: CloudEnvironment): CloudSignInAuthenticated | CloudSignInMfaRequired => nativeSignInVerified(value, environment);
/** Google may require a native second factor before a credential exists. Bind it to this attempt/environment. */
export const googleOutcome = (value: unknown, environment: CloudEnvironment): CloudSignInGoogleOutcome => nativeSignInGoogleOutcome(value, environment);
export const normalizeSignInCode = normalizeNativeSignInCode;
export const validSignInEmail = validNativeSignInEmail;
/** Explicit provider capabilities from the host. Unknown readiness keeps the existing email error/retry
 * surface; known disabled methods stay hidden. Optional SMS is never inferred from an older host. */
export const signInReadiness = nativeSignInReadiness;
export const validSignInPhone = validNativeSignInPhone;
