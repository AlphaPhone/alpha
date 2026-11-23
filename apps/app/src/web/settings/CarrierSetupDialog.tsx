// spec/settings/index.md, "Story: Find a setting in a few taps"
import { Effect, Stream } from "effect";
import { useEffect, useReducer, useRef, useState } from "react";
import { Native } from "../../platform/native.vibe";
import {
  carrierFieldText,
  carrierIdentifier,
  createCarrierSetupSession,
  type CarrierField,
  type CarrierSetup,
} from "../../settings/carrier-setup.ts";
import { Button, Dialog, DialogContent, DialogTitle, ScrollArea } from "../components/ui/index.ts";
import { perform, start } from "../shell/services.ts";

/** Explicit, foreground-only carrier and SIM activation details dialog. */
export interface CarrierSetupDialogProps {
  readonly open: boolean;
  readonly native: boolean;
  readonly onClose: () => void;
}

const SETTINGS_PAGES = [
  { page: "identifiers", label: "About phone" },
  { page: "sim", label: "SIM manager" },
  { page: "mobile", label: "Mobile network" },
  { page: "apn", label: "APNs" },
  { page: "default-sms", label: "Default SMS app" },
] as const;

export function CarrierSetupDialog({ open, native, onClose }: CarrierSetupDialogProps) {
  const [, bump] = useReducer((count: number) => count + 1, 0);
  const [copiedToken, setCopiedToken] = useState<string | undefined>(undefined);
  const openRef = useRef(open);
  openRef.current = open;

  const sessionRef = useRef<ReturnType<typeof createCarrierSetupSession> | null>(null);
  if (sessionRef.current === null) {
    sessionRef.current = createCarrierSetupSession({
      read: () => perform(Effect.flatMap(Effect.service(Native), (n) => n.invoke("AlphaCarrierSetup", "read"))) as Promise<CarrierSetup>,
      readEid: () => perform(Effect.flatMap(Effect.service(Native), (n) => n.invoke("AlphaCarrierSetup", "readEid"))) as Promise<CarrierField>,
      copy: async (value: string) => {
        if (typeof navigator === "undefined" || navigator.clipboard === undefined) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(value);
      },
      current: () => openRef.current && (typeof document === "undefined" || document.visibilityState !== "hidden"),
      changed: () => bump(),
    });
  }
  const session = sessionRef.current;

  useEffect(() => {
    if (!open) {
      setCopiedToken(undefined);
      session.clear();
      return;
    }
    const forget = () => {
      setCopiedToken(undefined);
      session.clear();
      onClose();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") forget();
    };
    window.addEventListener("blur", forget);
    document.addEventListener("visibilitychange", onVisibility);
    const stopNative = native
      ? start(Effect.flatMap(Effect.service(Native), (n) =>
        Stream.runForEach(n.listen("AlphaCarrierSetup", "foregroundEnded"), () => Effect.sync(forget)),
      ))
      : () => undefined;
    return () => {
      window.removeEventListener("blur", forget);
      document.removeEventListener("visibilitychange", onVisibility);
      stopNative();
      setCopiedToken(undefined);
      session.clear();
    };
  }, [native, onClose, open, session]);

  const { data, busy, eidBusy, failed } = session.snapshot();

  const handleCopy = (token: string) => {
    void session.copy(token).then((ok) => {
      if (ok && openRef.current) setCopiedToken(token);
    }, () => undefined);
  };

  const handleOpenSettings = (page: string) => {
    if (!native) return;
    void perform(Effect.flatMap(Effect.service(Native), (n) => n.invoke("AlphaCarrierSetup", "openSettings", { page })))
      .catch(() => undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { session.clear(); onClose(); } }}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-3">
        <DialogTitle>Carrier &amp; SIM setup</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Identifiers are read only when you ask, stay in foreground memory, and clear when you leave.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy || !native} onClick={() => { setCopiedToken(undefined); void session.show(); }}>
            {busy ? "Reading…" : data ? "Refresh identifiers" : "Show identifiers"}
          </Button>
          {data && data.eid.status !== "unsupported" && (
            <Button type="button" variant="secondary" disabled={busy || eidBusy} onClick={() => { void session.showEid(); }}>
              {eidBusy ? "Reading EID…" : "Read eSIM EID (optional)"}
            </Button>
          )}
        </div>
        {failed && <p role="status" className="text-sm text-destructive">Carrier setup could not be read on this device.</p>}
        {data && (
          <ScrollArea className="max-h-96 pr-2">
            <div className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1 rounded-lg bg-secondary p-3">
                <span className="font-medium">Phone &amp; roles</span>
                <span>SMS role: {carrierFieldText(data.smsRole)}</span>
                <span>Dialer role: {carrierFieldText(data.dialerRole)}</span>
                <span>Modem slots: {carrierFieldText(data.modemCount)}</span>
                <span>Manufacturer: {carrierFieldText(data.hardware.manufacturer)}</span>
                <span>Model: {carrierFieldText(data.hardware.model)} ({carrierFieldText(data.hardware.device)})</span>
                <span>Android: {carrierFieldText(data.hardware.android)} · Baseband: {carrierFieldText(data.hardware.baseband)}</span>
              </div>

              <div className="flex flex-col gap-2">
                {data.slots.map((slot) => {
                  const token = `imei-${slot.slotIndex}`;
                  const copyable = carrierIdentifier(data, token) !== undefined;
                  return (
                    <div key={token} className="flex items-center justify-between gap-2 rounded-lg bg-secondary p-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">Slot {slot.slotIndex + 1} · {carrierFieldText(slot.simState)}</div>
                        <div className="truncate font-mono text-xs text-muted-foreground">IMEI: {carrierFieldText(slot.imei)}</div>
                      </div>
                      {copyable && (
                        <Button type="button" size="sm" variant="outline" onClick={() => handleCopy(token)}>
                          {copiedToken === token ? "Copied" : "Copy"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">eSIM EID</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">{carrierFieldText(data.eid)}</div>
                </div>
                {carrierIdentifier(data, "eid") !== undefined && (
                  <Button type="button" size="sm" variant="outline" onClick={() => handleCopy("eid")}>
                    {copiedToken === "eid" ? "Copied" : "Copy"}
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-medium">Active SIM subscriptions</span>
                {data.subscriptions.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {data.subscriptions.status === "available" ? "No active SIM subscriptions." : carrierFieldText({ status: data.subscriptions.status })}
                  </p>
                ) : (
                  data.subscriptions.items.map((sub) => {
                    const token = `iccid-${sub.subscriptionId}`;
                    const copyable = carrierIdentifier(data, token) !== undefined;
                    return (
                      <div key={token} className="flex items-center justify-between gap-2 rounded-lg bg-secondary p-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">
                            {carrierFieldText(sub.carrier)} · {carrierFieldText(sub.name)}{sub.embedded ? " (eSIM)" : ""}{sub.defaultData ? " · Default data" : ""}
                          </div>
                          <div className="truncate font-mono text-xs text-muted-foreground">ICCID: {carrierFieldText(sub.iccid)}</div>
                          <div className="text-xs text-muted-foreground">
                            Operator: {carrierFieldText(sub.operator)} ({carrierFieldText(sub.operatorCode)}) · Data: {carrierFieldText(sub.dataState)} · {carrierFieldText(sub.networkType)} · {carrierFieldText(sub.dataEnabled)} · {carrierFieldText(sub.roaming)}
                          </div>
                        </div>
                        {copyable && (
                          <Button type="button" size="sm" variant="outline" onClick={() => handleCopy(token)}>
                            {copiedToken === token ? "Copied" : "Copy"}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </ScrollArea>
        )}
        <div className="flex flex-wrap gap-2">
          {SETTINGS_PAGES.map(({ page, label }) => (
            <Button key={page} type="button" size="sm" variant="ghost" disabled={!native} onClick={() => handleOpenSettings(page)}>
              {label}
            </Button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={() => { session.clear(); onClose(); }}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
