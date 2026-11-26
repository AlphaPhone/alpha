// spec/app/account/signIn.md, "Story: Sign in when Alpha needs it"; spec/app/update/page.md, "A page that was not mounted mounts its editors only once no update is pending"
import { StartupMark, StartupSignIn as SignInScreen } from "@repo/ui";
import { Effect } from "effect";
import { useCallback, useSyncExternalStore } from "react";
import { useMachine } from "../../gen/app__account__signIn.react.ts";
import type { SignIn as State, Trouble } from "../../gen/app__account__signIn.ts";
import { Time } from "../runtime/time.vibe";
import type { Alpha } from "../runtime/area.tsx";
import { StartupSignIn, type ConnectionWarning, type FirstRun } from "./signIn.vibe";

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

const noSubscribe = () => () => {};
const noRead = () => undefined;

export function useFirstRun(alpha: Alpha, _ready: boolean) {
  const { state: flow } = useMachine(alpha.runtime);
  const service = alpha.requiresSignIn ? alpha.runtime.runSync(StartupSignIn) : undefined;
  const subscribe = useCallback((listener: () => void) => service ? service.subscribe(listener) : noSubscribe(), [service]);
  const read = useSyncExternalStore(subscribe, () => service?.snapshot(), noRead);
  return { read, flow };
}

export function canLeaveSignInStep(read?: FirstRun, state?: State) {
  return read?.stage === "Required" && state?.work === "Resting" && (state.step === "Code" || state.step === "Second");
}

export function SignIn({ alpha, read, state }: { alpha: Alpha; read?: FirstRun; state?: State }) {
  const service = alpha.runtime.runSync(StartupSignIn);
  const subscribeClock = useCallback((listener: () => void) => service.subscribeClock(listener), [service]);
  const now = useSyncExternalStore(subscribeClock, () => service.clockSnapshot(), () => 0);
  const clock = () => Math.floor(alpha.runtime.runSync(Effect.flatMap(Time, (time) => time.latest())) / 1000);
  if (!read || read.stage === "Checking" || !state) return <StartupMark />;
  const work = (take: (signIn: StartupSignIn.Shape) => Effect.Effect<unknown>) => {
    alpha.runtime.runFork(Effect.flatMap(StartupSignIn, take));
  };
  const touch = () => work((signIn) => signIn.touch());
  const retry = () => work((signIn) => signIn.check());
  const online = read.connection !== "Offline";
  const connection = read.connection === undefined ? undefined : {
    message: networkMessages[read.connection],
    onOpen: () => alpha.runtime.runPromise(Effect.flatMap(StartupSignIn, (signIn) => signIn.openNetwork())),
  };
  if (read.stage === "Unavailable") return (
    <SignInScreen stage="Choose" email={false} phone={false} online={online} connection={connection} message="Sign-in unavailable" onRetry={retry} />
  );
  const busy = state.work !== "Resting";
  const issue = messages[state.trouble];
  const onBack = canLeaveSignInStep(read, state) ? () => work((signIn) => signIn.back()) : undefined;
  const onVerify = online && !busy && !state.spent && Math.max(now, clock()) < state.expiresAt
    ? (code: string) => work((signIn) => signIn.verify(code)) : undefined;
  const method = state.method === "Phone" ? "phone" : "email";
  if (state.step === "Browser") return <SignInScreen stage="Browser" connection={connection} />;
  return (
    <div className="size-full" onPointerDownCapture={touch} onKeyDownCapture={touch}>
      {state.step === "Code" ? (
        <SignInScreen stage="Code" attempt={state.attempt} method={method} address={state.address} busy={busy} problem={issue} connection={connection}
          onVerify={onVerify} onBack={onBack}
          resendIn={Math.max(0, state.resendAt - Math.max(now, clock()))} onResend={online ? () => work((signIn) => signIn.resend()) : undefined} />
      ) : state.step === "Second" ? (
        <SignInScreen stage="Second" attempt={state.attempt} factor={state.factor === "Sms" ? "sms" : "totp"}
          busy={busy} problem={issue} connection={connection} onVerify={onVerify} onBack={onBack} />
      ) : (
        <SignInScreen stage="Choose" email={read.email} phone={read.phone} online={online} busy={busy} message={issue} connection={connection}
          previous={state.prefill ? { method, address: state.address } : undefined}
          onSend={(method, address) => work((signIn) => signIn.send(method, address))}
          onGoogle={read.google ? () => work((signIn) => signIn.chooseGoogle()) : undefined}
          onRetry={!read.email || !read.google || !read.phone ? retry : undefined} />
      )}
    </div>
  );
}
