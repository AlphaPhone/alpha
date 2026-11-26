// spec/app/account/signIn.md, "Story: Sign in when Alpha needs it"; spec/app/update/page.md, "A page that was not mounted mounts its editors only once no update is pending"
import { StartupMark, StartupSignIn as SignInScreen } from "@repo/ui";
import { Exit } from "effect";
import { useMemo, useSyncExternalStore } from "react";
import { useMachine } from "../../gen/app__account__signIn.react.ts";
import type { SignIn as State, Trouble } from "../../gen/app__account__signIn.ts";
import type { Alpha } from "../runtime/area.tsx";
import {
  cancelSignInStep,
  checkSignIn,
  chooseGoogleSignIn,
  latestSignInSeconds,
  openSignInNetwork,
  resendSignInCode,
  sendSignInCode,
  signInClock,
  signInShelf,
  touchSignIn,
  verifySignInCode,
  type ConnectionWarning,
  type FirstRun,
} from "./signIn.vibe";

const messages: Partial<Record<Trouble, string>> = {
  WrongCode: "Wrong code",
  CodeSpent: "That code expired. Ask for another code.",
  NotSent: "Couldn’t send a code. Try again.",
  NotResent: "Couldn’t resend your code. Try again.",
  NoAnswer: "Couldn’t check your code. Try again.",
  NotSignedIn: "Couldn’t sign in. Try again.",
  TooLate: "That code expired.",
  TabExpired: "That sign-in expired. Try again.",
  Busy: "Sign-in is busy. Try again.",
};
const networkMessages: Record<ConnectionWarning, string> = {
  Offline: "You’re offline. Connect to Wi-Fi to sign in.",
  Unvalidated: "Android couldn’t verify internet access. Sign-in needs an internet connection.",
  WithoutWifi: "Sign-in isn’t using Wi-Fi. You can use mobile data or connect to Wi-Fi.",
  UnvalidatedWithoutWifi: "Sign-in isn’t using Wi-Fi. Android couldn’t verify internet access.",
};

const noFirstRunShelf = {
  subscribe: () => () => {},
  snapshot: (): FirstRun | undefined => undefined,
};
const noClockShelf = {
  subscribe: () => () => {},
  snapshot: () => 0,
};

export function useFirstRun(alpha: Alpha, ready: boolean) {
  const { state: flow } = useMachine(alpha.runtime);
  const loaded = flow !== undefined;
  const shelf = useMemo(() => {
    if (!alpha.requiresSignIn || !loaded) return noFirstRunShelf;
    const result = alpha.runtime.runSyncExit(signInShelf);
    return Exit.isSuccess(result) ? result.value : noFirstRunShelf;
  }, [alpha, loaded]);
  const read = useSyncExternalStore(shelf.subscribe, shelf.snapshot, shelf.snapshot);
  return { read: alpha.requiresSignIn && (loaded || ready) ? read : undefined, flow };
}

export function canLeaveSignInStep(read?: FirstRun, state?: State) {
  return read?.stage === "Required" && state?.work === "Resting" && (state.step === "Code" || state.step === "Second");
}

export function SignIn({ alpha, read, state }: { alpha: Alpha; read?: FirstRun; state?: State }) {
  const loaded = state !== undefined;
  const clockShelf = useMemo(() => {
    if (!loaded) return noClockShelf;
    const result = alpha.runtime.runSyncExit(signInClock);
    return Exit.isSuccess(result) ? result.value : noClockShelf;
  }, [alpha.runtime, loaded]);
  const now = useSyncExternalStore(clockShelf.subscribe, clockShelf.snapshot, clockShelf.snapshot);
  const clock = () => {
    const result = alpha.runtime.runSyncExit(latestSignInSeconds);
    return Exit.isSuccess(result) ? result.value : 0;
  };
  if (!read || read.stage === "Checking" || !state) return <StartupMark />;
  const touch = () => { alpha.runtime.runFork(touchSignIn); };
  const retry = () => { alpha.runtime.runFork(checkSignIn); };
  const online = read.connection !== "Offline";
  const connection = read.connection === undefined ? undefined : {
    message: networkMessages[read.connection],
    onOpen: () => alpha.runtime.runPromise(openSignInNetwork),
  };
  if (read.stage === "Unavailable") return (
    <SignInScreen stage="Choose" email={false} phone={false} online={online} connection={connection} message="Sign-in unavailable" onRetry={retry} />
  );
  const busy = state.work !== "Resting";
  const issue = messages[state.trouble];
  const onBack = canLeaveSignInStep(read, state) ? () => { alpha.runtime.runFork(cancelSignInStep); } : undefined;
  const onVerify = online && !busy && !state.spent && Math.max(now, clock()) < state.expiresAt
    ? (code: string) => { alpha.runtime.runFork(verifySignInCode(code)); } : undefined;
  const method = state.method === "Phone" ? "phone" : "email";
  if (state.step === "Browser") return <SignInScreen stage="Browser" connection={connection} />;
  return (
    <div className="size-full" onPointerDownCapture={touch} onKeyDownCapture={touch}>
      {state.step === "Code" ? (
        <SignInScreen stage="Code" attempt={state.attempt} method={method} address={state.address} busy={busy} problem={issue} connection={connection}
          onVerify={onVerify} onBack={onBack}
          resendIn={Math.max(0, state.resendAt - Math.max(now, clock()))} onResend={online ? () => { alpha.runtime.runFork(resendSignInCode); } : undefined} />
      ) : state.step === "Second" ? (
        <SignInScreen stage="Second" attempt={state.attempt} factor={state.factor === "Sms" ? "sms" : "totp"}
          busy={busy} problem={issue} connection={connection} onVerify={onVerify} onBack={onBack} />
      ) : (
        <SignInScreen stage="Choose" email={read.email} phone={read.phone} online={online} busy={busy} message={issue} connection={connection}
          previous={state.prefill ? { method, address: state.address } : undefined}
          onSend={(selected, address) => { alpha.runtime.runFork(sendSignInCode(selected, address)); }}
          onGoogle={read.google ? () => { alpha.runtime.runFork(chooseGoogleSignIn); } : undefined}
          onRetry={!read.email || !read.google || !read.phone ? retry : undefined} />
      )}
    </div>
  );
}
