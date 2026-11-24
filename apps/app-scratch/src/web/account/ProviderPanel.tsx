// spec/account/provider.md, "Story: Use my own keys instead of Cloud"
import { Bot, CreditCard, Eye, KeyRound, RotateCw, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  type KeyName, type Provider, type ProviderFault, type Route, canAskRemove, canCancelRemove, canChooseRoute, canConfirmRemove, canRead,
  canReveal, canSave, reviewedKey,
} from "../../../gen/account__provider.ts";
import { keyShaped } from "../../account/provider.vibe";
import { Alert, Button, Input, Label, Spinner } from "../components/ui/index.ts";

/** What the AI provider form shows and the owner's actions on it. */
export interface ProviderPanelProps {
  /** The provider as the native host last reported it. */
  provider: Provider;
  /** The deployment's display name, such as "Eliza Cloud". */
  serviceName: string;
  /** Save own keys; an empty voice key leaves it unchanged. The keys go straight to the native host. */
  onSave: (textKey: string, voiceKey: string) => void;
  /** Switch the route the agent answers with. */
  onChoose: (route: Route) => void;
  /** Ask to remove one saved key; the removal needs its own confirmation. */
  onAskRemove: (key: KeyName) => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  /** Show a saved key in the native host's secure dialog. */
  onReveal: (key: KeyName) => void;
  onRefresh: () => void;
  /** Leave the form; present only where there is somewhere to go back to. */
  onBack?: () => void;
}

const faults: Record<Exclude<ProviderFault, "NoProviderFault">, string> = {
  ReadFailed: "Couldn’t check the AI provider",
  KeyNotAccepted: "Key not accepted",
  ChangeNotConfirmed: "Change not confirmed · refresh",
  NeedsTextKey: "Save a Cerebras key first",
};

const keyLabel: Record<KeyName, string> = { TextKey: "Cerebras key", VoiceKey: "Cartesia voice key" };

/**
 * The AI provider: Eliza Cloud through the plan, or the owner's own Cerebras key with an optional Cartesia voice key.
 * Keys typed here go to the native host and are cleared from the form at once; a saved key is shown only in the host's own
 * secure dialog.
 * @model spec/account/provider.md
 * @design design.md
 */
export function ProviderPanel({ provider, serviceName, onSave, onChoose, onAskRemove, onCancelRemove, onConfirmRemove, onReveal, onRefresh, onBack }: ProviderPanelProps) {
  const [textKey, setTextKey] = useState("");
  const [voiceKey, setVoiceKey] = useState("");
  const fault = provider.fault === "NoProviderFault" ? undefined : faults[provider.fault];
  const shaped = keyShaped(textKey.trim()) && (voiceKey.trim() === "" || keyShaped(voiceKey.trim()));
  const reviewing = provider.review.tag === "Reviewing" ? reviewedKey(provider.review) : undefined;
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave(provider) || !shaped) return;
    onSave(textKey, voiceKey);
    setTextKey("");
    setVoiceKey("");
  };
  return (
    <section aria-label="AI provider" aria-busy={provider.work !== "ProviderIdle" || undefined} className="flex flex-col gap-4">
      {!provider.known && provider.work === "Reading" ? <Spinner label="Checking the AI provider" className="mx-auto" /> : (
        <div className="flex gap-2" role="group" aria-label="Route">
          <Button
            variant={provider.route === "CloudRoute" ? "primary" : "outline"} aria-pressed={provider.route === "CloudRoute"}
            loading={provider.work === "Choosing" && provider.target === "CloudRoute"}
            disabled={provider.route !== "CloudRoute" && !canChooseRoute(provider, "CloudRoute", provider.revision)} onClick={() => onChoose("CloudRoute")}
          >
            <CreditCard aria-hidden />{serviceName}
          </Button>
          <Button
            variant={provider.route === "OwnRoute" ? "primary" : "outline"} aria-pressed={provider.route === "OwnRoute"}
            loading={provider.work === "Choosing" && provider.target === "OwnRoute"}
            disabled={provider.route !== "OwnRoute" && !canChooseRoute(provider, "OwnRoute", provider.revision)} onClick={() => onChoose("OwnRoute")}
          >
            <Bot aria-hidden />Own keys
          </Button>
        </div>
      )}
      <ul className="flex flex-col">
        {(["TextKey", "VoiceKey"] as const).map((key) => {
          const saved = key === "TextKey" ? provider.textKey : provider.voiceKey;
          return (
            <li key={key} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <KeyRound aria-hidden className="size-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{keyLabel[key]}</span>
                <span className="block truncate text-sm text-muted-foreground">{saved ? "Saved on this phone" : "Not saved"}</span>
              </span>
              {saved && (
                <span className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Show ${keyLabel[key]}`} disabled={!canReveal(provider, key)} onClick={() => onReveal(key)}><Eye aria-hidden /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${keyLabel[key]}`} disabled={!canAskRemove(provider, key)} onClick={() => onAskRemove(key)}><Trash2 aria-hidden /></Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {reviewing && (
        <Alert variant="warn" aria-label="Remove key">
          <p>Remove the {keyLabel[reviewing]} from this phone?</p>
          <div className="flex gap-2">
            <Button variant="destructive" disabled={!canConfirmRemove(provider, provider.revision)} onClick={onConfirmRemove}>Remove</Button>
            <Button variant="ghost" disabled={!canCancelRemove(provider)} onClick={onCancelRemove}>Keep</Button>
          </div>
        </Alert>
      )}
      <form aria-label="Save own keys" onSubmit={save} className="flex flex-col gap-2">
        <Label htmlFor="provider-text-key">{provider.textKey ? "Replace Cerebras key" : "Cerebras key"}</Label>
        <Input
          id="provider-text-key" type="password" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={1024}
          value={textKey} disabled={!canSave(provider)} onChange={(event) => setTextKey(event.currentTarget.value)}
        />
        <Label htmlFor="provider-voice-key">Cartesia voice key (optional)</Label>
        <Input
          id="provider-voice-key" type="password" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={1024}
          value={voiceKey} disabled={!canSave(provider)} onChange={(event) => setVoiceKey(event.currentTarget.value)}
        />
        <Button type="submit" loading={provider.work === "Saving"} disabled={!canSave(provider) || !shaped}>Save and use own keys</Button>
      </form>
      {fault && <p role="alert" className="text-destructive">{fault}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" disabled={!canRead(provider)} onClick={onRefresh}><RotateCw aria-hidden />Refresh</Button>
        {onBack && <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>}
      </div>
    </section>
  );
}
