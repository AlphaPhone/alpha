import { Mail, Phone, Shield } from "lucide-react";
import { type FormEvent, useCallback, useId, useRef, useState } from "react";
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

const mainAction = "min-h-13 w-full rounded-list-icon text-base leading-tight font-medium";
const textAction = "h-11 w-full text-base font-medium";
const codeSlots = [0, 1, 2, 3, 4, 5] as const;

function NetworkNotice({ message, onOpen }: Connection) {
  const [result, setResult] = useState<"idle" | "opening" | "failed">("idle");
  const open = async () => {
    setResult("opening");
    const opened = await onOpen().catch(() => false);
    setResult(opened ? "idle" : "failed");
  };
  return (
    <aside aria-label="Sign-in connection" className="mb-3 rounded-sm border border-border px-4 py-3">
      <p role="status" className="text-sm leading-status text-muted-foreground/97 dark:text-muted-foreground">{message}</p>
      <Button variant="ghost" className="h-11 rounded-md border border-transparent px-0 text-base leading-tight font-medium text-primary hover:bg-transparent active:bg-transparent"
        loading={result === "opening"} onClick={() => void open()}>Open Wi-Fi settings</Button>
      {result === "failed" ? <p role="alert">Couldn’t open Wi-Fi settings.</p> : null}
    </aside>
  );
}

function Google({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const buttonRef = useCallback((target: HTMLButtonElement | null) => {
    if (!disabled && target && target.ownerDocument.activeElement === target.ownerDocument.body) target.focus({ preventScroll: true });
  }, [disabled]);
  return (
    <Button ref={buttonRef} variant="outline" className={cn(mainAction, "gap-3 border-border")} disabled={disabled} onClick={onClick}>
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
  const phoneNoteId = useId();
  const focusInputRef = useRef(false);
  const attachInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node && focusInputRef.current) {
      focusInputRef.current = false;
      node.focus({ preventScroll: true });
    }
  }, []);
  const switchMethod = () => {
    focusInputRef.current = true;
    setMethod(usingPhone ? "email" : "phone");
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enabled && online && !busy) onSend?.(method, draft[method].trim());
  };
  return (
    <>
      <div className="flex flex-col gap-3">
        {onGoogle ? <Google disabled={!online || !!busy} onClick={onGoogle} /> : null}
        {onGoogle && enabled ? <div aria-hidden="true" className="my-2 flex items-center gap-3.5 text-caption text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or</div> : null}
        {enabled ? (
          <form className="flex flex-col gap-3" aria-label={usingPhone ? "Sign in with phone" : "Sign in with email"} onSubmit={submit}>
            <label className="flex flex-col gap-2 text-sm leading-status font-medium">
              {usingPhone ? "Phone number" : "Email"}
              <Input
                key={method}
                ref={attachInputRef}
                autoComplete={usingPhone ? "tel" : "email"}
                type={usingPhone ? "tel" : "email"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={usingPhone ? 32 : 320}
                placeholder={usingPhone ? "+1 415 555 0100" : undefined}
                aria-describedby={usingPhone ? phoneNoteId : undefined}
                required
                disabled={busy}
                value={draft[method]}
                onChange={(event) => setDraft({ ...draft, [method]: event.currentTarget.value })}
                className="h-13.5 rounded-md border-border bg-background px-4 text-base font-normal focus:border-alpha"
              />
            </label>
            {usingPhone ? <p id={phoneNoteId} className="text-sm">Include your country code.</p> : null}
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
  const errorId = useId();
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (!node || busy) return;
    node.focus({ preventScroll: true });
    if (problem) node.select();
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
          {codeSlots.map((slot) => (
            <span
              key={slot}
              data-active={slot === Math.min(digits.length, 5) ? "" : undefined}
              aria-hidden
              className={cn("grid h-13.5 place-items-center rounded-md border border-border bg-secondary text-panel-title tabular-nums data-[active]:border-alpha", problem && "border-destructive data-[active]:border-destructive")}
            >{digits[slot]}</span>
          ))}
          <Input
            ref={inputRef}
            aria-label="Code"
            aria-describedby={problem ? errorId : undefined}
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
        {problem ? <p id={errorId} role="alert" className="rounded-md bg-destructive/12 p-3 text-destructive">{problem}</p> : null}
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
  const headingId = useId();
  const title = props.stage === "Choose" ? "Alpha" : props.stage === "Browser" ? "In browser" : "Enter code";
  return (
    <section aria-labelledby={headingId} className="flex size-full flex-1 flex-col bg-background pb-[var(--alpha-safe-bottom)] text-base leading-status text-foreground">
      <div className="size-full overflow-y-auto overscroll-contain pr-[max(1.5rem,env(safe-area-inset-right,0px))] pl-[max(1.5rem,env(safe-area-inset-left,0px))] pt-[max(calc(var(--alpha-safe-top)_+_2rem),8vh)] pb-8">
        <div className="mx-auto w-full max-w-lg">
          <AuthMark className="mb-6" />
          <h1 id={headingId} className="mb-7 font-display text-4xl font-normal tracking-tight text-balance">{title}</h1>
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
