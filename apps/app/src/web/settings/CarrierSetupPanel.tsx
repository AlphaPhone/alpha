// spec/settings/carrier.md, "Opening the page reads nothing; Show identifiers reads once, and only the latest read answers"; spec/settings/carrier.md, "Leaving the page, the app going to the background or losing focus forgets everything read"
import { Effect } from "effect";
import { useState } from "react";
import { useMachine as useCarrierMachine } from "../../../gen/settings__carrier.react.ts";
import { initial as carrierStart, type CarrierScreen } from "../../../gen/settings__carrier.ts";
import { CarrierSetup } from "../../settings/carrier.vibe";
import { act, answer } from "../shell/services.ts";
import { CarrierSetupView } from "./CarrierSetupView.tsx";
import { runtime } from "./runtime.ts";

/** Carrier & SIM setup reads the app's runtime; it is told only whether this is a phone. */
export interface CarrierSetupPanelProps { readonly native: boolean }

const LOOK_FOR: Record<CarrierScreen, string> = {
  ScreenIdentifiers: "IMEI or About phone", ScreenSims: "SIMs or mobile network", ScreenMobile: "SIMs or mobile network",
  ScreenApn: "access point names", ScreenDefaultSms: "default SMS app",
};

const carrier = <A,>(use: (c: CarrierSetup.Shape) => Effect.Effect<A>) => Effect.flatMap(Effect.service(CarrierSetup), use);

/**
 * Settings → General → Carrier & SIM setup over its in-memory Machine: nothing is read until the owner taps, and the shell forgets it all on leaving.
 * @model spec/settings/carrier.md
 * @design design.md
 */
export function CarrierSetupPanel({ native }: CarrierSetupPanelProps) {
  const { state: setup = carrierStart } = useCarrierMachine(runtime);
  const [notice, setNotice] = useState("");
  return (
    <CarrierSetupView
      setup={setup}
      native={native}
      notice={notice}
      onShow={() => { setNotice(""); act(carrier((c) => c.show())); }}
      onShowEid={() => act(carrier((c) => c.showEid()))}
      onCopy={(what, label) => answer(carrier((c) => c.copy(what)), (copied) => setNotice(copied ? `${label} copied to the Android clipboard.` : "Could not copy. Keep Alpha open and unlocked."))}
      onOpenScreen={(screen) => answer(carrier((c) => c.openScreen(screen)), (opened) => setNotice(
        opened === "Specific" ? "" : opened === "Broader" ? `Android Settings opened. Search for ${LOOK_FOR[screen]}.` : "This Android settings page is unavailable."))}
    />
  );
}
