// spec/app/account/signIn.md, "Story: Choose how to sign in"; spec/app/account/signIn.md, "Story: Sign in with a code"; spec/app/account/signIn.md, "Story: Sign in with Google"; spec/app/account/signIn.md, "Story: Pass a second check"; spec/app/account/signIn.md, "Story: Change my mind"
import { Banner, Button, Card, CardTitle, Input, Label, Spinner } from "@repo/ui";
import { useState } from "react";
import { offered, type Trouble } from "../../gen/app__account__signIn.ts";
import { useMachine as useSignIn } from "../../gen/app__account__signIn.react.ts";
import type { Method } from "../../gen/app__account__session.ts";
import { untimed } from "../runtime/index.vibe";
import { normalizePhoneNumber } from "./phone.ts";
import { type AccountRuntime, currentMillis, useAccountShelf, useAccountTimed } from "./useAccount.ts";

const troubleMessages: Partial<Record<Trouble, string>> = {
  WrongCode: "That code didn’t match. Try again.",
  CodeSpent: "That code can no longer be used. Request a new code.",
  NotSent: "Couldn’t send a code to that address.",
  NotResent: "Couldn’t send another code. Your current code still works.",
  NoAnswer: "Couldn’t reach Alpha Cloud. Try verifying again.",
  NotSignedIn: "Sign-in didn’t finish. Choose a sign-in method to try again.",
  TooLate: "That verification timed out. Start again.",
  TabExpired: "The browser sign-in timed out. Try again.",
  Restarted: "Alpha restarted during Google sign-in. Please sign in again.",
  Busy: "Another account change is in progress. Please try again.",
};

/** Interactive email/phone/Google sign-in, OTP verification, 2FA, and Back interruption UI. */
export function SignInView({ runtime }: { readonly runtime: AccountRuntime }) {
  const signIn = useAccountTimed(runtime, useSignIn);
  const shelf = useAccountShelf(runtime);
  const [method, setMethod] = useState<Method>("Email");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const state = signIn.state;
  if (!state || state.step === "Closed") return null;

  const online = shelf.online;
  const nowMs = currentMillis(runtime);
  const displayedAddress = address === "" && state.prefill ? state.address : address;
  const normalizedPhone = method === "Phone" ? normalizePhoneNumber(displayedAddress) : displayedAddress;
  const troubleText = troubleMessages[state.trouble];
  const smsOffered = offered(state, "Phone");
  const googleOffered = offered(state, "Google");
  const waitSeconds = Math.ceil(Math.max(0, state.resendAt - nowMs) / 1000);
  const sendEvent = { type: "sendCode", method, address: displayedAddress, now: untimed, online } as const;
  const googleEvent = { type: "chooseGoogle", now: untimed, online } as const;
  const resendEvent = { type: "resend", now: untimed, online } as const;
  const checkEvent = { type: "checkCode", code, now: untimed, online } as const;
  const passkeyEvent = { type: "usePasskey", now: untimed, online } as const;
  const cancelEvent = { type: "cancel" } as const;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <CardTitle>Sign in to Alpha Cloud</CardTitle>
        {signIn.can(cancelEvent) ? (
          <Button variant="ghost" size="sm" onClick={() => { setCode(""); void signIn.send(cancelEvent); }}>
            Back
          </Button>
        ) : null}
      </div>

      {!online ? (
        <Banner variant="warn">You’re offline. Reconnect to sign in to Alpha Cloud.</Banner>
      ) : null}

      {troubleText ? (
        <Banner variant="destructive">{troubleText}</Banner>
      ) : null}

      {state.step === "Choose" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={method === "Email" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setMethod("Email")}
            >
              Email
            </Button>
            {smsOffered ? (
              <Button
                variant={method === "Phone" ? "primary" : "secondary"}
                size="sm"
                onClick={() => setMethod("Phone")}
              >
                Phone
              </Button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account-signin-address">
              {method === "Phone" ? "Phone number" : "Email address"}
            </Label>
            <Input
              id="account-signin-address"
              type={method === "Phone" ? "tel" : "email"}
              placeholder={method === "Phone" ? "+1 415 555 0100" : "you@example.com"}
              value={displayedAddress}
              onChange={(event) => setAddress(event.target.value)}
            />
            {method === "Phone" && normalizedPhone !== "" && normalizedPhone !== displayedAddress ? (
              <p className="text-caption text-muted-foreground">Will send to {normalizedPhone}</p>
            ) : null}
          </div>

          <Button
            className="w-full"
            loading={state.work === "Sending"}
            disabled={!signIn.can(sendEvent)}
            onClick={() => { void signIn.send(sendEvent); }}
          >
            Send code
          </Button>

          {googleOffered ? (
            <Button
              variant="secondary"
              className="w-full"
              disabled={!signIn.can(googleEvent)}
              onClick={() => { void signIn.send(googleEvent); }}
            >
              Continue with Google
            </Button>
          ) : null}
        </div>
      ) : null}

      {state.step === "Browser" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" label="Waiting for Google sign-in" />
            <span>Finish signing in with Google in your browser.</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!signIn.can({ type: "reopenGoogle", now: untimed, online })}
            onClick={() => { void signIn.send({ type: "reopenGoogle", now: untimed, online }); }}
          >
            Open browser again
          </Button>
        </div>
      ) : null}

      {state.step === "Code" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to {state.address}.
          </p>
          {!state.spent ? (
            <div className="space-y-1.5">
              <Label htmlFor="account-signin-code">Verification code</Label>
              <Input
                id="account-signin-code"
                inputMode="numeric"
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!state.spent ? (
              <Button
                loading={state.work === "Verifying"}
                disabled={code.trim() === "" || !signIn.can(checkEvent)}
                onClick={() => { void signIn.send(checkEvent); }}
              >
                Verify code
              </Button>
            ) : null}
            <Button
              variant="secondary"
              loading={state.work === "Resending"}
              disabled={!signIn.can(resendEvent)}
              onClick={() => { void signIn.send(resendEvent); }}
            >
              {waitSeconds > 0 ? `Resend in ${waitSeconds}s` : "Resend code"}
            </Button>
          </div>
        </div>
      ) : null}

      {state.step === "Second" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {state.factor === "Passkey"
              ? "Confirm your passkey to finish signing in."
              : state.factor === "Sms"
                ? "Enter the second-factor SMS code to continue."
                : "Enter the code from your authenticator app."}
          </p>
          {state.factor === "Passkey" ? (
            <Button
              loading={state.work === "Verifying"}
              disabled={!signIn.can(passkeyEvent)}
              onClick={() => { void signIn.send(passkeyEvent); }}
            >
              Use passkey
            </Button>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="account-signin-second-code">Second-factor code</Label>
                <Input
                  id="account-signin-second-code"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
              <Button
                loading={state.work === "Verifying"}
                disabled={code.trim() === "" || !signIn.can(checkEvent)}
                onClick={() => { void signIn.send(checkEvent); }}
              >
                Confirm second factor
              </Button>
            </>
          )}
        </div>
      ) : null}
    </Card>
  );
}
