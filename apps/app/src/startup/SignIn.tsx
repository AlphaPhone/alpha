// spec/app/account/signIn.md, "Story: Sign in when Alpha needs it"; spec/app/update/page.md, "A page that was not mounted mounts its editors only once no update is pending"
import { StartupMark, StartupSignIn as SignInScreen } from "@repo/ui";
import { Effect, Stream } from "effect";
import { useEffect, useState } from "react";
import { useMachine } from "../../gen/app__account__signIn.react.ts";
import type { SignIn as State, Trouble } from "../../gen/app__account__signIn.ts";
import { Time } from "../runtime/time.vibe";
import type { Alpha } from "../runtime/area.tsx";
import { StartupSignIn, type FirstRun } from "./signIn.vibe";

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

export function useFirstRun(alpha: Alpha, ready: boolean) {
  const { state: flow } = useMachine(alpha.runtime);
  const [read, setRead] = useState<FirstRun>();
  useEffect(() => {
    if (!alpha.requiresSignIn) return;
    const watch = alpha.runtime.runFork(StartupSignIn.use((signIn) =>
      Stream.runForEach(signIn.changes, (value) => Effect.sync(() => setRead(value)))));
    return () => { watch.interruptUnsafe(); };
  }, [alpha]);
  useEffect(() => {
    if (!alpha.requiresSignIn || !ready) return;
    const recheck = () => { alpha.runtime.runFork(StartupSignIn.use((signIn) => signIn.check())); };
    const visible = () => { if (document.visibilityState === "visible") recheck(); };
    recheck();
    window.addEventListener("online", recheck);
    window.addEventListener("offline", recheck);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", recheck);
      window.removeEventListener("offline", recheck);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [alpha, ready]);
  return { read, flow };
}

export function canLeaveSignInStep(read?: FirstRun, state?: State) {
  return read?.stage === "Required" && state?.work === "Resting" && (state.step === "Code" || state.step === "Second");
}

export function SignIn({ alpha, read, state }: { alpha: Alpha; read?: FirstRun; state?: State }) {
  const clock = () => Math.floor(alpha.runtime.runSync(Time.use((time) => time.latest())) / 1000);
  const [now, setNow] = useState(0);
  const deadline = state?.step === "Code" || state?.step === "Second" ? Math.max(state.expiresAt, state.resendAt) : 0;
  useEffect(() => {
    if (deadline <= 0) return;
    const tick = () => { void alpha.runtime.runPromise(Time.use((time) => time.now()))
      .then((time) => setNow(Math.floor(time / 1000)), () => undefined); };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [alpha, deadline]);
  if (!read || read.stage === "Checking" || !state) return <StartupMark />;
  const work = (take: (signIn: StartupSignIn.Shape) => Effect.Effect<unknown>) => {
    alpha.runtime.runFork(StartupSignIn.use(take));
  };
  const touch = () => work((signIn) => signIn.touch());
  const retry = () => work((signIn) => signIn.check());
  if (read.stage === "Unavailable") return (
    <SignInScreen stage="Choose" email={false} phone={false} online={read.online} message="Sign-in unavailable" onRetry={retry} />
  );
  const busy = state.work !== "Resting";
  const issue = messages[state.trouble];
  const onBack = canLeaveSignInStep(read, state) ? () => work((signIn) => signIn.back()) : undefined;
  const onVerify = read.online && !busy && !state.spent && Math.max(now, clock()) < state.expiresAt
    ? (code: string) => work((signIn) => signIn.verify(code)) : undefined;
  const method = state.method === "Phone" ? "phone" : "email";
  if (state.step === "Browser") return <SignInScreen stage="Browser" />;
  return (
    <div className="size-full" onPointerDownCapture={touch} onKeyDownCapture={touch}>
      {state.step === "Code" ? (
        <SignInScreen stage="Code" attempt={state.attempt} method={method} address={state.address} busy={busy} problem={issue}
          onVerify={onVerify} onBack={onBack}
          resendIn={Math.max(0, state.resendAt - Math.max(now, clock()))} onResend={read.online ? () => work((signIn) => signIn.resend()) : undefined} />
      ) : state.step === "Second" ? (
        <SignInScreen stage="Second" attempt={state.attempt} factor={state.factor === "Sms" ? "sms" : "totp"}
          busy={busy} problem={issue} onVerify={onVerify} onBack={onBack} />
      ) : (
        <SignInScreen stage="Choose" email={read.email} phone={read.phone} online={read.online} busy={busy} message={issue}
          previous={state.prefill ? { method, address: state.address } : undefined}
          onSend={(method, address) => work((signIn) => signIn.send(method, address))}
          onGoogle={read.google ? () => work((signIn) => signIn.chooseGoogle()) : undefined}
          onRetry={!read.email || !read.google || !read.phone ? retry : undefined} />
      )}
    </div>
  );
}
