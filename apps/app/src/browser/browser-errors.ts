import {CapacitorException,ExceptionCode} from '@capacitor/core';
import {browserRefusalText,PROFILE_UNSUPPORTED_MESSAGE} from '../ui/browser/browser-messages';
import {isNativeRejection} from '../ui/utils/native-refusal';

/** The native tab host's refusal when the System WebView lacks isolated profiles, and what Alpha says instead. */
export const PROFILE_UNSUPPORTED_NATIVE_MESSAGE='This Android WebView does not support isolated browser profiles';
export {PROFILE_UNSUPPORTED_MESSAGE};

/**
 * What Browser says for a failed call. The native tab host's and the staged tab session's sentences
 * are worded by Alpha (ui/browser/browser-messages.ts); any other native rejection reads as
 * `fallback`. A plain error is Alpha's own sentence (this adapter, its web surface and runtime).
 */
export function browserErrorMessage(error:unknown,fallback='Browser unavailable'):string {
 if(error instanceof CapacitorException && error.code===ExceptionCode.Unimplemented)return 'Unavailable';
 if(!(error instanceof Error))return fallback;
 const known=browserRefusalText(error.message);
 if(known)return known;
 return isNativeRejection(error)?fallback:error.message;
}
