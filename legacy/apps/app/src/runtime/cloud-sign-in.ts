import type { CloudEnvironment } from './cloud-protocol';
import { nativeCloudSignInFailureMessage, type NativeCloudSignInFailureCode as SignInCopyFailureCode } from '../ui/auth/native-cloud-sign-in-copy.ts';
import {
  NativeCloudSignInError,
  nativeSignInAuthenticated,
  nativeSignInCodeStarted,
  nativeSignInGoogleOutcome,
  nativeSignInReadiness,
  nativeSignInReadinessChanged,
  nativeSignInVerified,
  normalizeNativeSignInCode,
  validNativeSignInEmail,
  validNativeSignInPhone,
  type NativeCloudSignInAuthenticated,
  type NativeCloudSignInCodeStarted,
  type NativeCloudSignInFailureCode,
  type NativeCloudSignInGoogleMfaRequired,
  type NativeCloudSignInGoogleOutcome,
  type NativeCloudSignInMfaRequired,
  type NativeCloudSignInPort,
} from '../../../../.eliza/client-features/packages/auth/src/auth/native-cloud-sign-in.ts';

/**
 * Alpha binding of the shared native Eliza Cloud sign-in renderer contract (owner directive
 * 2026-10-14, #410). Sign-in happens on Alpha's own screens: an email or SMS code typed into
 * Alpha, or Google in the user's external browser. No Eliza Cloud web page is part of a
 * successful sign-in.
 *
 * The port's host (AlphaCloudSignInPlugin, a registration of the shared
 * `ai.eliza.auth.cloud.CloudSignInPlugin`, or the development Cloud bridge in a test-mocks browser
 * build) holds the Steward session, the PKCE verifiers and states and the authorization codes; none
 * of them crosses to the renderer. Parsing of every answer and the failure codes live upstream in
 * `@elizaos/auth/auth/native-cloud-sign-in`, projected from the pinned checkout. The owner-facing
 * failure copy is Alpha's own (`../ui/auth/native-cloud-sign-in-copy.ts`, copied from that module),
 * filled with Alpha's product name and its two deployment names.
 *
 * Email remains in Alpha when readiness is unknown. Google and SMS require their own
 * readiness results.
 */
export type CloudSignInFailureCode = NativeCloudSignInFailureCode;
// Compile-time check: the failure codes the local copy covers and the shared client's wire codes
// are the identical type, so neither side can drift without failing typecheck.
type SameType<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type SignInCopyCoversFailureCodes = Assert<SameType<SignInCopyFailureCode, NativeCloudSignInFailureCode>>;
export type CloudSignInAuthenticated = NativeCloudSignInAuthenticated<CloudEnvironment>;
export type CloudSignInEmailStarted = NativeCloudSignInCodeStarted;
export type CloudSignInMfaRequired = NativeCloudSignInMfaRequired;
export type CloudSignInGoogleMfaRequired = NativeCloudSignInGoogleMfaRequired<CloudEnvironment>;
export type CloudSignInGoogleOutcome = NativeCloudSignInGoogleOutcome<CloudEnvironment>;
export type CloudSignInPort = NativeCloudSignInPort<CloudEnvironment> & {
  /** Browser-host only: settles the credential commit boundary before cancellation. */
  cancelGoogleSignIn?(): Promise<unknown>;
};
export const CloudSignInError = NativeCloudSignInError;
export type CloudSignInError = NativeCloudSignInError;

/** Owner-facing copy. Never includes server text, codes or addresses. Where the screen already
 * carries the next step (a Try again button, Resend under the code), Alpha states only the fact. */
export function signInFailureMessage(code: CloudSignInFailureCode, serviceName: string): string {
  if (code === 'invalid-code') return 'Wrong code';
  if (code === 'app-link-unverified') return 'Google sign-in didn’t return to Alpha. Check that Android opens Alpha’s supported links.';
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
/** Explicit provider capabilities from the host. Optional SMS is never inferred from an older host. */
export const signInReadiness = nativeSignInReadiness;
export const signInReadinessChanged = nativeSignInReadinessChanged;
export const validSignInPhone = validNativeSignInPhone;
