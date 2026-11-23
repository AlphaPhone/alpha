// spec/account/signIn.md, "Story: Choose how to sign in"; spec/account/signIn.md, "Story: Sign in with Google"; spec/account/signIn.md, "Story: Sign in with a code"; spec/account/signIn.md, "Story: Leave sign-in"; spec/account/signIn.md, "Story: Read the service's terms before signing in"
import { ArrowLeft, KeyRound, Mail, Phone, RotateCw, ShieldCheck, WifiOff } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  type CodeMethod, type Fault, type SignIn, canBack, canBackDuringGoogle, canChooseMethod, canOwnKeysStart, canOwnerOpens, canResend,
  canSubmitAddress, canTapGoogle, canVerify, entryOf, isPage, methodReady,
} from "../../../gen/account__signIn.ts";
import type { ServiceInfo } from "../../account/signIn.vibe";
import { Alert, Button, Input, Label, Spinner } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";

/** The sign-in screen's state, the deployment's name and terms, and the owner's actions on it. */
export interface SignInPanelProps {
  signIn: SignIn;
  /** The deployment's display name, such as "Eliza Cloud". */
  serviceName: string;
  /** The deployment's Terms and Privacy, when they could be read. */
  terms?: ServiceInfo;
  /** Whether Android's Wi-Fi settings can be opened from here. */
  android?: boolean;
  onRetry: () => void;
  onChoose: (method: CodeMethod) => void;
  onGoogle: () => void;
  onSubmit: (address: string) => void;
  onVerify: (code: string) => void;
  onResend: (address: string) => void;
  onBack: () => void;
  onOwnKeys: () => void;
  onWifiSettings: () => void;
}

const faults: Record<Exclude<Fault, "NoFault">, string> = {
  AttemptFailed: "Sign-in didn’t finish",
  SendFailed: "Code not sent",
  ResendFailed: "Code not sent",
  WrongCode: "Wrong code",
  CodeSpent: "Code expired",
  KeysBusy: "Sign-in is busy · try own keys again when it ends",
};

/** Six boxes show the digits; one real field keeps paste, autofill and screen readers working. */
function CodeBoxes({ value, invalid, disabled, onChange }: { value: string; invalid: boolean; disabled: boolean; onChange: (value: string) => void }) {
  const digits = value.replace(/\D/g, "");
  return (
    <label className="relative flex justify-center gap-2">
      <span className="sr-only">Code</span>
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} aria-hidden className={cn("grid size-11 place-items-center rounded-md border font-mono text-xl", invalid ? "border-destructive" : "border-input", index === Math.min(digits.length, 5) && "border-ring")}>
          {digits[index] ?? ""}
        </span>
      ))}
      <input
        name="one-time-code" autoComplete="one-time-code" inputMode="numeric" maxLength={9} required disabled={disabled} value={value}
        aria-invalid={invalid || undefined} onChange={(event) => onChange(event.currentTarget.value)}
        className="absolute inset-0 opacity-0"
      />
    </label>
  );
}

/**
 * Alpha's own sign-in screen: Google, or a code sent to an email address or phone number, then a second verification.
 * @model spec/account/signIn.md
 * @design design.md
 */
export function SignInPanel({ signIn, serviceName, terms, android = false, onRetry, onChoose, onGoogle, onSubmit, onVerify, onResend, onBack, onOwnKeys, onWifiSettings }: SignInPanelProps) {
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const entry = entryOf(signIn);
  const working = signIn.work !== "NoWork";
  const fault = signIn.fault === "NoFault" ? undefined : faults[signIn.fault];
  const phone = signIn.method === "PhoneCode";
  const back = signIn.work === "GoogleWork" ? canBackDuringGoogle(signIn) : canBack(signIn) && !(isPage(entry) && signIn.screen === "Choose" && !working);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmitAddress(signIn) && address.trim()) onSubmit(address);
  };
  const verify = (event: FormEvent) => {
    event.preventDefault();
    if (canVerify(signIn) && code.trim()) onVerify(code);
  };
  if (signIn.screen === "ScreenClosed") return signIn.work === "Probing" ? <Spinner label={`Loading ${serviceName} sign-in`} className="mx-auto my-16" /> : null;
  return (
    <section aria-labelledby="sign-in-title" className="mx-auto flex w-full max-w-sm flex-col gap-5 px-4 py-8">
      <h1 id="sign-in-title" className="font-serif text-3xl">{signIn.screen === "Choose" ? "Alpha" : signIn.screen === "GoogleWait" ? "In browser" : "Enter code"}</h1>
      {signIn.net === "NetOffline" || signIn.net === "NetUnvalidated" ? (
        <Alert variant="warn" aria-label="Sign-in connection">
          <p className="flex items-center gap-2"><WifiOff aria-hidden className="size-4" />{signIn.net === "NetOffline" ? "You’re offline" : "No internet access"}</p>
          {android && <Button variant="ghost" size="sm" onClick={onWifiSettings}>Wi-Fi settings</Button>}
        </Alert>
      ) : null}
      {signIn.screen === "Choose" && (
        <>
          {signIn.methods.known && signIn.methods.google && (
            <Button variant="outline" size="lg" disabled={!canTapGoogle(signIn)} onClick={onGoogle}>Continue with Google</Button>
          )}
          <form key={signIn.method} aria-label={phone ? "Sign in with phone" : "Sign in with email"} onSubmit={submit} className="flex flex-col gap-2">
            <Label htmlFor="sign-in-address">{phone ? "Phone number" : "Email"}</Label>
            <Input
              id="sign-in-address" type={phone ? "tel" : "email"} autoComplete={phone ? "tel" : "email"} autoCapitalize="none" autoCorrect="off" spellCheck={false}
              maxLength={phone ? 32 : 320} required placeholder={phone ? "+1 415 555 0100" : undefined} value={address} disabled={working}
              onChange={(event) => setAddress(event.currentTarget.value)}
            />
            <Button type="submit" size="lg" loading={signIn.work === "Sending"} disabled={!canSubmitAddress(signIn) || !address.trim()}>
              {signIn.cooldown ? "Wait to send" : "Send code"}
            </Button>
          </form>
          {phone ? (
            <Button variant="ghost" disabled={!canChooseMethod(signIn, "EmailCode")} onClick={() => onChoose("EmailCode")}><Mail aria-hidden />Use email</Button>
          ) : methodReady(signIn.methods, "PhoneCode") ? (
            <Button variant="ghost" disabled={!canChooseMethod(signIn, "PhoneCode")} onClick={() => onChoose("PhoneCode")}><Phone aria-hidden />Use phone number</Button>
          ) : null}
          {!signIn.methods.known && !working && (
            <Button variant="ghost" size="sm" disabled={!canOwnerOpens(signIn)} onClick={onRetry}><RotateCw aria-hidden />Check sign-in options</Button>
          )}
          {canOwnKeysStart(signIn) && <Button variant="ghost" size="sm" onClick={onOwnKeys}><KeyRound aria-hidden />Use my own keys</Button>}
        </>
      )}
      {(signIn.screen === "CodeStep" || signIn.screen === "FactorStep") && (
        <form key={`${signIn.screen}:${signIn.attempt}`} aria-label="Enter your code" aria-busy={signIn.work === "Verifying" || undefined} onSubmit={verify} className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-muted-foreground">
            {signIn.screen === "FactorStep" ? <ShieldCheck aria-hidden className="size-4" /> : phone ? <Phone aria-hidden className="size-4" /> : <Mail aria-hidden className="size-4" />}
            <span className="sr-only">{signIn.screen === "FactorStep" ? "Verification code" : "Code sent to"}</span>
            {signIn.screen === "CodeStep" && <strong className="text-foreground">{address}</strong>}
          </p>
          {signIn.screen === "FactorStep" && signIn.factor === "PasskeyFactor" ? (
            <Alert variant="warn">Passkeys can’t be used in Alpha</Alert>
          ) : (
            <>
              <CodeBoxes value={code} invalid={signIn.fault === "WrongCode"} disabled={working || signIn.stale} onChange={setCode} />
              <Button type="submit" size="lg" loading={signIn.work === "Verifying"} disabled={!canVerify(signIn) || !code.trim()}>Verify</Button>
            </>
          )}
          {signIn.screen === "CodeStep" && (
            <Button variant="ghost" loading={signIn.work === "Resending"} disabled={!canResend(signIn)} onClick={() => { setCode(""); onResend(address); }}>
              {signIn.cooldown ? "Resend soon" : "Resend"}
            </Button>
          )}
        </form>
      )}
      {signIn.screen === "GoogleWait" && <Spinner label="Waiting for Google" className="mx-auto my-6" />}
      {fault && <p role="alert" className="text-destructive">{fault}</p>}
      {signIn.screen === "Choose" && terms && (
        <div className="flex flex-col gap-2 text-sm">
          <Button variant="ghost" size="sm" aria-expanded={showTerms} onClick={() => setShowTerms(!showTerms)}>{terms.name} terms and privacy</Button>
          {showTerms && [terms.terms, terms.privacy].map((document) => (
            <article key={document.title} aria-label={document.title} className="flex flex-col gap-2">
              <h2 className="font-serif text-lg">{document.title}</h2>
              {document.sections.map((section) => (
                <section key={section.title} className="flex flex-col gap-1">
                  <h3 className="font-semibold">{section.title}</h3>
                  {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </section>
              ))}
            </article>
          ))}
        </div>
      )}
      {back && <Button variant="ghost" className="self-start" onClick={onBack}><ArrowLeft aria-hidden />Back</Button>}
    </section>
  );
}
