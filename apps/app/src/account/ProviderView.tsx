// spec/app/account/provider.md, "Story: See where my requests go"; spec/app/account/provider.md, "Story: Use my own key"; spec/app/account/provider.md, "Story: Choose Cloud or my key"
import { Banner, Button, Card, CardTitle, ConfirmDialog, Input, Label, ListGroup, ListRow, StatusDot } from "@repo/ui";
import { useState } from "react";
import { sends, shows, type Offer, type Trouble } from "../../gen/app__account__provider.ts";
import { useMachine as useProvider } from "../../gen/app__account__provider.react.ts";
import { untimed } from "../runtime/index.vibe";
import { type AccountRuntime, useAccountTimed } from "./useAccount.ts";

const troubleText: Partial<Record<Trouble, string>> = {
  KeyRefused: "That API key was refused. Your saved keys were kept.",
  KeyUnchecked: "Couldn’t verify that key. Try again later.",
  CheckWithdrawn: "Key check cancelled. Your saved keys were kept.",
  NotUsed: "Couldn’t save that key. Status refreshed.",
  NotSelected: "Couldn’t switch provider. Status refreshed.",
  NotRemoved: "Couldn’t remove that key.",
  Interrupted: "Alpha restarted during a provider change.",
  Unconfirmed: "The provider change timed out and is being rechecked.",
};

function offerDescription(offer: Offer): string {
  const details = shows(offer);
  if (details.recipient === "AlphaCloud") return "Requests and allowed context will be sent to Alpha Cloud under your plan.";
  if (details.recipient === "Cerebras") return "Requests and allowed context will be sent directly to Cerebras using your own key.";
  if (details.recipient === "VoiceProvider") return "Spoken audio will be sent to your voice provider using your voice key. Your Cerebras key is unchanged.";
  return "No AI requests will be sent until a provider is chosen.";
}

/** AI provider selection, Cerebras text key, and independent voice key management UI. */
export function ProviderView({ runtime }: { readonly runtime: AccountRuntime }) {
  const provider = useAccountTimed(runtime, useProvider);
  const [keyInput, setKeyInput] = useState("");
  const state = provider.state;
  if (!state) return null;

  const activeSends = sends(state.mode);
  const currentError = troubleText[state.trouble];
  const openTextEvent = { type: "openKeyForm", kind: "TextKey" } as const;
  const openVoiceEvent = { type: "openKeyForm", kind: "VoiceKey" } as const;
  const useCloudEvent = { type: "offer", what: "UseCloud", origin: "ByOwner" } as const;
  const useOwnEvent = { type: "offer", what: "UseText", origin: "ByOwner" } as const;
  const removeTextEvent = { type: "removeKey", kind: "TextKey", busy: false, origin: "ByOwner", now: untimed } as const;
  const removeVoiceEvent = { type: "removeKey", kind: "VoiceKey", busy: false, origin: "ByOwner", now: untimed } as const;

  return (
    <div className="space-y-3">
      {currentError ? <Banner variant="destructive">{currentError}</Banner> : null}

      <Card className="space-y-2 p-4">
        <CardTitle>AI Provider</CardTitle>
        <p className="text-sm text-muted-foreground">
          {activeSends.recipient === "AlphaCloud"
            ? "Sending requests to Alpha Cloud."
            : activeSends.recipient === "Cerebras"
              ? "Sending requests directly to Cerebras with your own key."
              : "No AI provider selected yet."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={state.mode === "CloudAi" ? "primary" : "secondary"}
            size="sm"
            disabled={!provider.can(useCloudEvent)}
            onClick={() => { void provider.send(useCloudEvent); }}
          >
            Use Alpha Cloud
          </Button>
          {state.text ? (
            <Button
              variant={state.mode === "OwnKey" ? "primary" : "secondary"}
              size="sm"
              disabled={!provider.can(useOwnEvent)}
              onClick={() => { void provider.send(useOwnEvent); }}
            >
              Use Cerebras key
            </Button>
          ) : null}
        </div>
      </Card>

      <ListGroup heading="Saved keys">
        <ListRow
          title="Cerebras text key"
          detail={state.text ? "Saved on this device" : "Not set"}
          trailing={<StatusDot status={state.text ? "ok" : "off"} label={state.text ? "Saved" : "None"} showLabel />}
        />
        <div className="flex flex-wrap gap-2 px-4 py-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!provider.can(openTextEvent)}
            onClick={() => { setKeyInput(""); void provider.send(openTextEvent); }}
          >
            {state.text ? "Replace Cerebras key" : "Add Cerebras key"}
          </Button>
          {state.text ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={!provider.can(removeTextEvent)}
              onClick={() => { void provider.send(removeTextEvent); }}
            >
              Remove Cerebras key
            </Button>
          ) : null}
        </div>

        <ListRow
          title="Voice key"
          detail={state.voice ? "Saved independently of Cerebras key" : "Not set"}
          trailing={<StatusDot status={state.voice ? "ok" : "off"} label={state.voice ? "Saved" : "None"} showLabel />}
        />
        <div className="flex flex-wrap gap-2 px-4 py-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!provider.can(openVoiceEvent)}
            onClick={() => { setKeyInput(""); void provider.send(openVoiceEvent); }}
          >
            {state.voice ? "Change voice key" : "Add voice key"}
          </Button>
          {state.voice ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={!provider.can(removeVoiceEvent)}
              onClick={() => { void provider.send(removeVoiceEvent); }}
            >
              Remove voice key
            </Button>
          ) : null}
        </div>
      </ListGroup>

      {state.form ? (
        <Card className="space-y-3 p-4">
          <CardTitle>{state.kind === "VoiceKey" ? "Enter voice key" : "Enter Cerebras key"}</CardTitle>
          <div className="space-y-1.5">
            <Label htmlFor="account-provider-key">
              {state.kind === "VoiceKey" ? "Voice API key" : "Cerebras API key"}
            </Label>
            <Input
              id="account-provider-key"
              type="password"
              placeholder={state.kind === "VoiceKey" ? "vk-..." : "csk-..."}
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              loading={state.work === "CheckingKey"}
              disabled={keyInput.trim() === "" || !provider.can({ type: "enterKey", key: keyInput })}
              onClick={() => {
                const value = keyInput;
                setKeyInput("");
                void provider.send({ type: "enterKey", key: value });
              }}
            >
              Check key
            </Button>
            {state.work === "CheckingKey" ? (
              <Button variant="secondary" onClick={() => { void provider.send({ type: "withdrawKey" }); }}>
                Back
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => { setKeyInput(""); void provider.send({ type: "closeKeyForm" }); }}>
                Cancel
              </Button>
            )}
          </div>
        </Card>
      ) : null}

      {state.work === "Waiting" ? (
        <Banner
          variant="info"
          action={<Button size="sm" variant="secondary" onClick={() => { void provider.send({ type: "stopWaiting" }); }}>Cancel</Button>}
        >
          Stopping the resident agent to apply your provider change…
        </Banner>
      ) : null}

      <ConfirmDialog
        open={state.choice.showing}
        title={state.offer === "UseCloud" ? "Switch to Alpha Cloud?" : state.offer === "UseVoice" ? "Save voice key?" : state.offer === "SaveText" ? "Save Cerebras key beside Cloud?" : "Use your Cerebras key?"}
        confirmLabel={state.offer === "UseVoice" ? "Save voice key" : state.offer === "SaveText" ? "Save key" : "Confirm"}
        onConfirm={() => { void provider.send({ type: "choose", busy: false, origin: "ByOwner", now: untimed }); }}
        onCancel={() => { void provider.send({ type: "decline" }); }}
      >
        <div className="space-y-2">
          <p>{offerDescription(state.offer)}</p>
          {provider.can({ type: "saveOnly" }) ? (
            <Button size="sm" variant="secondary" onClick={() => { void provider.send({ type: "saveOnly" }); }}>
              Save without switching from Cloud
            </Button>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  );
}
