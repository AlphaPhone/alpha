// spec/settings/carrier.md, "Story: Read carrier activation details only when I ask"
import type { CarrierField, CarrierSetup } from "./native.schema.vibe";

export type CarrierPage = "identifiers" | "sim" | "mobile" | "apn" | "default-sms";

export function carrierFieldText(field: CarrierField): string {
  switch (field.status) {
    case "available": return field.value?.trim() || "Unavailable from Android";
    case "permission-denied": return "Access denied by Android";
    case "unsupported": return "Not supported on this device";
    case "not-read": return "Not read";
    case "unavailable": return "Unavailable from Android";
  }
}

function identifier(data: CarrierSetup | undefined, key: string): string | undefined {
  if (!data) return undefined;
  const field = key === "eid" ? data.eid
    : data.slots.find((slot) => key === `imei-${slot.slotIndex}`)?.imei
    ?? data.subscriptions.items.find((sim) => key === `iccid-${sim.subscriptionId}`)?.iccid;
  return field?.status === "available" ? field.value?.trim() || undefined : undefined;
}

interface CarrierPorts {
  read(): Promise<CarrierSetup>;
  readEid(): Promise<CarrierField>;
  copy(value: string): Promise<unknown>;
  current(): boolean;
  changed(): void;
}

/** One visit's private state. Clearing invalidates every pending read and forgets the contents. */
export function createCarrierSession(ports: CarrierPorts) {
  let data: CarrierSetup | undefined;
  let busy = false;
  let eidBusy = false;
  let failed = false;
  let generation = 0;

  return {
    snapshot: () => ({ data, busy, eidBusy, failed }),
    clear() {
      const changed = data !== undefined || busy || eidBusy || failed;
      generation++;
      data = undefined;
      busy = false;
      eidBusy = false;
      failed = false;
      if (changed) ports.changed();
    },
    async show() {
      if (busy || !ports.current()) return;
      const ticket = ++generation;
      data = undefined;
      busy = true;
      eidBusy = false;
      failed = false;
      ports.changed();
      try {
        const read = await ports.read();
        if (ticket === generation && ports.current()) data = read;
      } catch {
        if (ticket === generation && ports.current()) failed = true;
      } finally {
        if (ticket === generation) {
          busy = false;
          if (!ports.current()) data = undefined;
          ports.changed();
        }
      }
    },
    async showEid() {
      if (busy || eidBusy || !data || data.eid.status === "unsupported" || !ports.current()) return;
      const ticket = generation;
      eidBusy = true;
      ports.changed();
      const eid = await ports.readEid().catch(() => ({ status: "unavailable" as const }));
      if (ticket === generation) {
        if (ports.current() && data) data = { ...data, eid };
        else data = undefined;
        eidBusy = false;
        ports.changed();
      }
    },
    async copy(key: string) {
      if (!ports.current()) return false;
      const value = identifier(data, key);
      if (!value) return false;
      const ticket = generation;
      await ports.copy(value);
      return ticket === generation && ports.current();
    },
  };
}
