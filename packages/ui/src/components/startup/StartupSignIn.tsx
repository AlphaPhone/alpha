import { Mail, Phone, Shield } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Input } from "../Input.tsx";
import { AuthMark } from "../Mark.tsx";
import { Spinner } from "../Spinner.tsx";

type Method = "email" | "phone";

type Choice = {
  stage: "Choose";
  online: boolean;
  busy?: boolean;
  message?: string;
  email: boolean;
  phone: boolean;
  previous?: { method: Method; address: string };
  onSend?: (method: Method, address: string) => void;
  onGoogle?: () => void;
  onRetry?: () => void;
  onOwnKeys?: () => void;
};

type Challenge = {
  stage: "Code" | "Second";
  attempt: number;
  busy?: boolean;
  problem?: string;
  onVerify?: (code: string) => void;
  onBack?: () => void;
} & (
  | { stage: "Code"; method: Method; address: string; resendIn?: number; onResend?: () => void }
  | { stage: "Second"; factor: "totp" | "sms" }
);

type Connection = { message: string; onOpen: () => Promise<boolean> };
export type StartupSignInProps = (Choice | Challenge | { stage: "Browser"; message?: string }) & { connection?: Connection };

const mainAction = "min-h-13 w-full rounded-[14px] text-base leading-tight font-medium";
const textAction = "h-11 w-full text-[15px] font-medium";

function NetworkNotice({ message, onOpen }: Connection) {
  const [result, setResult] = useState<"idle" | "opening" | "failed">("idle");
  const open = async () => {
    setResult("opening");
    const opened = await onOpen().catch(() => false);
    setResult(opened ? "idle" : "failed");
  };
  return (
    <aside aria-label="Sign-in connection" className="mb-3 rounded-sm border border-border px-4 py-3">
      <p role="status" className="text-sm leading-[1.45] text-muted-foreground/97 dark:text-muted-foreground">{message}</p>
      <Button variant="ghost" className="h-11 rounded-md border border-transparent px-0 text-[15px] leading-tight font-medium text-primary hover:bg-transparent active:bg-transparent"
        loading={result === "opening"} onClick={() => void open()}>Open Wi-Fi settings</Button>
      {result === "failed" ? <p role="alert">Couldn’t open Wi-Fi settings.</p> : null}
    </aside>
  );
}

function Google({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const target = button.current;
    if (!disabled && target?.ownerDocument.activeElement === target?.ownerDocument.body) target?.focus({ preventScroll: true });
  }, [disabled]);
  return (
    <Button ref={button} variant="outline" className={cn(mainAction, "gap-3 border-border")} disabled={disabled} onClick={onClick}>
      <img className="size-5" src="/icons/senders/google.com.png" alt="" />
      Continue with Google
    </Button>
  );
}

function Chooser(props: Choice) {
  const { email, phone, online, busy, onGoogle, onSend, onRetry, onOwnKeys } = props;
  const [method, setMethod] = useState<Method>(props.previous?.method ?? (email || !phone ? "email" : "phone"));
  const [draft, setDraft] = useState({ email: "", phone: "", ...props.previous && { [props.previous.method]: props.previous.address } });
  const usingPhone = method === "phone";
  const enabled = usingPhone ? phone : email;
  const canSwitch = usingPhone ? email : phone;
  const phoneNote = useId();
  const input = useRef<HTMLInputElement>(null);
  const switchMethod = () => {
    setMethod(usingPhone ? "email" : "phone");
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enabled && online && !busy) onSend?.(method, draft[method].trim());
  };
  return (
    <>
      <div className="flex flex-col gap-3">
        {onGoogle ? <Google disabled={!online || !!busy} onClick={onGoogle} /> : null}
        {onGoogle && enabled ? <div aria-hidden="true" className="my-2 flex items-center gap-3.5 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or</div> : null}
        {enabled ? (
          <form className="flex flex-col gap-3" aria-label={usingPhone ? "Sign in with phone" : "Sign in with email"} onSubmit={submit}>
            <label className="flex flex-col gap-2 text-sm leading-[1.45] font-medium">
              {usingPhone ? "Phone number" : "Email"}
              <Input
                key={method}
                ref={input}
                autoComplete={usingPhone ? "tel" : "email"}
                type={usingPhone ? "tel" : "email"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={usingPhone ? 32 : 320}
                placeholder={usingPhone ? "+1 415 555 0100" : undefined}
                aria-describedby={usingPhone ? phoneNote : undefined}
                required
                disabled={busy}
                value={draft[method]}
                onChange={(event) => setDraft({ ...draft, [method]: event.currentTarget.value })}
                className="h-13.5 rounded-[12px] border-border bg-background px-4 text-base font-normal focus:border-alpha"
              />
            </label>
            {usingPhone ? <p id={phoneNote} className="text-sm">Include your country code.</p> : null}
            <Button type="submit" className={mainAction} disabled={!online || !onSend} loading={busy}>Send code</Button>
          </form>
        ) : null}
        {canSwitch ? (
          <Button variant="outline" className={cn(mainAction, "border-border")} disabled={!online || busy} onClick={switchMethod}>
            {usingPhone ? "Continue with email" : "Continue with phone number"}
          </Button>
        ) : null}
        {props.message ? <p role="status">{props.message}</p> : null}
        {onRetry ? <Button variant="ghost" className={cn(textAction, "text-alpha")} disabled={!online || busy} onClick={onRetry}>Try again</Button> : null}
      </div>
      {onOwnKeys ? (
        <div className="mt-6 border-t border-border pt-4">
          <Button variant="ghost" className={cn(textAction, "text-alpha")} disabled={busy} onClick={onOwnKeys}>Use my own keys</Button>
        </div>
      ) : null}
    </>
  );
}

function EnterCode(props: Challenge) {
  const { busy, problem, onVerify, onBack } = props;
  const [digits, setDigits] = useState("");
  const error = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (busy) return;
    input.current?.focus({ preventScroll: true });
    if (problem) input.current?.select();
  }, [busy, problem]);
  const first = props.stage === "Code";
  const phone = first ? props.method === "phone" : props.factor === "sms";
  const Icon = phone ? Phone : first ? Mail : Shield;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (digits.length !== 6 || busy || !onVerify) return;
    onVerify(digits);
  };
  return (
    <>
      <form className="flex flex-col gap-3" aria-busy={busy || undefined} aria-label={first ? phone ? "Enter your phone code" : "Enter your email code" : "Enter your verification code"} onSubmit={submit}>
        <p className="flex min-h-7 items-center gap-1 wrap-anywhere text-muted-foreground">
          <Icon className="size-[22px] shrink-0" aria-hidden />
          {first ? <><span className="sr-only">Code sent to </span><strong>{props.address}</strong></> : phone ? "Phone code" : "Authenticator"}
        </p>
        <div className="relative mt-2 mb-3 grid grid-cols-6 gap-2 focus-within:[&_[data-active]]:outline-2 focus-within:[&_[data-active]]:outline-offset-1 focus-within:[&_[data-active]]:outline-alpha">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              data-active={index === Math.min(digits.length, 5) ? "" : undefined}
              aria-hidden
              className={cn("grid h-13.5 place-items-center rounded-[12px] border border-border bg-secondary text-[22px] tabular-nums data-[active]:border-alpha", problem && "border-destructive data-[active]:border-destructive")}
            >{digits[index]}</span>
          ))}
          <Input
            ref={input}
            aria-label="Code"
            aria-describedby={problem ? error : undefined}
            invalid={!!problem}
            autoComplete="one-time-code"
            inputMode="numeric"
            name="one-time-code"
            value={digits}
            disabled={busy}
            required
            onChange={(event) => setDigits(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))}
            className="absolute inset-0 size-full caret-transparent opacity-0"
          />
        </div>
        {problem ? <p id={error} role="alert" className="rounded-[12px] bg-[color-mix(in_srgb,#e03131_12%,var(--color-background))] p-3 text-[color-mix(in_srgb,#e03131_72%,var(--color-foreground))]">{problem}</p> : null}
        <Button type="submit" className={mainAction} disabled={!onVerify} loading={busy}>Verify</Button>
        {first && props.onResend ? (
          <Button type="button" variant="ghost" className={cn(textAction, "text-sm text-alpha tabular-nums disabled:text-muted-foreground disabled:opacity-100")} disabled={busy || !!props.resendIn} onClick={props.onResend}>
            {props.resendIn ? `Resend · ${props.resendIn}s` : "Resend"}
          </Button>
        ) : null}
      </form>
      {onBack ? <Button variant="ghost" className={cn(textAction, "mt-5 text-muted-foreground")} onClick={onBack}>Back</Button> : null}
    </>
  );
}

/** The account owner supplies available methods and actions for the live sign-in step. @model spec/app/account/signIn.md */
export function StartupSignIn(props: StartupSignInProps) {
  const heading = useId();
  const title = props.stage === "Choose" ? "Alpha" : props.stage === "Browser" ? "In browser" : "Enter code";
  return (
    <section aria-labelledby={heading} className="flex size-full flex-1 flex-col bg-background pb-[max(var(--alpha-native-inset-bottom,0px),env(safe-area-inset-bottom,0px))] text-[15px] leading-[1.45] text-foreground">
      <div className="size-full overflow-y-auto overscroll-contain pr-[max(1.5rem,env(safe-area-inset-right,0px))] pl-[max(1.5rem,env(safe-area-inset-left,0px))] pt-[max(calc(max(var(--alpha-native-inset-top,0px),env(safe-area-inset-top))_+_2rem),8vh)] pb-8">
        <div className="mx-auto w-full max-w-lg">
          <AuthMark className="mb-6" />
          <h1 id={heading} className="mb-7 font-display text-[clamp(36px,9vw,48px)] leading-[1.08] font-normal tracking-[-.025em] text-balance">{title}</h1>
          {props.connection ? <NetworkNotice {...props.connection} /> : null}
          {props.stage === "Choose" ? <Chooser {...props} /> : props.stage === "Browser" ? (
            <div className="flex flex-col items-center gap-4">
              <Spinner className="size-7 text-alpha" label="Waiting for Google sign-in" />
              {props.message ? <p role="status">{props.message}</p> : null}
            </div>
          ) : <EnterCode key={`${props.stage}:${props.attempt}`} {...props} />}
        </div>
      </div>
    </section>
  );
}
