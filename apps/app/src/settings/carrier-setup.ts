/**
 * Carrier identifiers live only in this foreground session, outside shell state, storage,
 * diagnostics and agent observations. This module never starts a read on navigation or resume.
 */
export type CarrierField = {
  readonly status: "available" | "permission-denied" | "unavailable" | "unsupported" | "not-read";
  readonly value?: string;
};

export type CarrierSetup = {
  readonly status: "ready";
  readonly aospImage: boolean;
  readonly canChooseSms: boolean;
  readonly smsRole: CarrierField;
  readonly dialerRole: CarrierField;
  readonly modemCount: CarrierField;
  readonly eid: CarrierField;
  readonly hardware: Record<"manufacturer" | "model" | "device" | "android" | "baseband", CarrierField>;
  readonly slots: ReadonlyArray<{ readonly slotIndex: number; readonly imei: CarrierField; readonly simState: CarrierField }>;
  readonly subscriptions: {
    readonly status: CarrierField["status"];
    readonly items: ReadonlyArray<{
      readonly subscriptionId: number;
      readonly slotIndex: number;
      readonly embedded: boolean;
      readonly defaultData: boolean;
      readonly carrier: CarrierField;
      readonly name: CarrierField;
      readonly iccid: CarrierField;
      readonly operator: CarrierField;
      readonly operatorCode: CarrierField;
      readonly dataState: CarrierField;
      readonly networkType: CarrierField;
      readonly dataEnabled: CarrierField;
      readonly roaming: CarrierField;
    }>;
  };
};

export const CARRIER_SETUP_LAYER_ID = "carrier-setup";

export function carrierFieldText(field: CarrierField | undefined): string {
  if (field?.status === "available" && typeof field.value === "string" && field.value.trim()) return field.value;
  if (field?.status === "not-read") return "Not read";
  if (field?.status === "permission-denied") return "Access denied by Android";
  if (field?.status === "unsupported") return "Not supported on this device";
  return "Unavailable from Android";
}

/** A token identifies one locally displayed field, never the identifier bytes. */
export function carrierIdentifier(data: CarrierSetup | undefined, token: string): string | undefined {
  let field: CarrierField | undefined;
  if (token === "eid") field = data?.eid;
  else if (/^imei-\d+$/.test(token)) field = data?.slots.find((slot) => slot.slotIndex === Number(token.slice(5)))?.imei;
  else if (/^iccid-\d+$/.test(token)) field = data?.subscriptions.items.find((sub) => sub.subscriptionId === Number(token.slice(6)))?.iccid;
  return field?.status === "available" && typeof field.value === "string" && field.value.trim() ? field.value : undefined;
}

export function createCarrierSetupSession(ports: {
  read(): Promise<CarrierSetup>;
  readEid?(): Promise<CarrierField>;
  copy(text: string): Promise<void>;
  current(): boolean;
  changed(): void;
}) {
  let data: CarrierSetup | undefined;
  let busy = false;
  let eidBusy = false;
  let failed = false;
  let generation = 0;
  return {
    snapshot: () => ({ data, busy, eidBusy, failed }),
    clear() {
      const had = Boolean(data) || busy || eidBusy || failed;
      generation++;
      data = undefined;
      busy = false;
      eidBusy = false;
      failed = false;
      if (had) ports.changed();
    },
    async show() {
      if (busy || !ports.current()) return;
      const token = ++generation;
      data = undefined;
      busy = true;
      eidBusy = false;
      failed = false;
      ports.changed();
      try {
        const next = await ports.read();
        if (token === generation && ports.current()) {
          if (next?.status !== "ready") throw Error("Unavailable");
          data = next;
        }
      } catch {
        if (token === generation && ports.current()) failed = true;
      } finally {
        if (token === generation) {
          busy = false;
          if (!ports.current()) data = undefined;
          ports.changed();
        }
      }
    },
    async showEid() {
      if (busy || eidBusy || !data || !ports.readEid || !ports.current()) return;
      const token = generation;
      eidBusy = true;
      ports.changed();
      try {
        const eid = await ports.readEid();
        if (token === generation && ports.current() && data) data = { ...data, eid };
      } catch {
        if (token === generation && ports.current() && data) data = { ...data, eid: { status: "unavailable" } };
      } finally {
        if (token === generation) {
          eidBusy = false;
          if (!ports.current()) data = undefined;
          ports.changed();
        }
      }
    },
    async copy(token: string) {
      if (!ports.current()) return false;
      const value = carrierIdentifier(data, token);
      if (value === undefined) return false;
      await ports.copy(value);
      return true;
    },
  };
}
