// spec/app/telephony/phoneInfo.md, "Story: See my SIM, carrier and number on the image"; spec/app/telephony/phoneInfo.md, "Story: Keep Alpha as my phone and SMS app"
import { Alert, Banner, Button, ListGroup, ListRow, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { ChevronRight } from "lucide-react";
import type { Line, Machine as InfoMachine } from "../../gen/app__telephony__phoneInfo.effect.vibe";
import { imeiElsewhere, simSummary } from "../../gen/app__telephony__phoneInfo.ts";
import { useMachine } from "../../gen/app__telephony__phoneInfo.react.ts";

export interface PhoneInfoProps {
  /** Provides the page's machine, the area's own. */
  runtime: ManagedRuntime.ManagedRuntime<InfoMachine, unknown>;
}

const networks = { NoService: "No service", Network2g: "2G", Network3g: "3G", Network4g: "4G", Network5g: "5G", WifiCalling: "Wi-Fi calling", NetworkUnknown: "Unknown network" } as const;
const voicemails = { VoicemailOn: "Set up", VoicemailNotSetUp: "Not set up", VoicemailNotOffered: "Not offered by your carrier", VoicemailUnknown: "Unknown" } as const;

function LineRows({ line }: { line: Line }) {
  return (
    <ListGroup heading={line.simName || line.carrier || `SIM ${line.slot + 1}`}>
      <ListRow title="Carrier" trailing={line.carrier} />
      <ListRow title="Number" trailing={line.number || "Not shown"} />
      <ListRow title="Network" trailing={`${networks[line.network]}${line.roaming ? " · Roaming" : ""}`} />
      <ListRow title="Signal" trailing={line.signal < 0 ? "Unknown" : `${line.signal} of 4`} />
      {line.embedded && <ListRow title="eSIM" />}
      {line.imei !== "" && <ListRow title="IMEI" trailing={line.imei} />}
    </ListGroup>
  );
}

/**
 * Settings → Phone: each line's SIM, carrier, number, network and signal, and the apps that handle calls and texts, read
 * when the page opens and forgotten when it closes.
 * @model spec/app/telephony/phoneInfo.md
 */
export function PhoneInfo({ runtime }: PhoneInfoProps) {
  const { state, cause, can, send } = useMachine(runtime);
  if (cause) return <Alert variant="destructive" className="m-4">Alpha could not read the phone's details</Alert>;
  if (!state) return null;
  if (!state.shown) return can({ type: "show", showing: true }) ? <ListRow title="Phone" trailing={<ChevronRight />} onClick={() => void send({ type: "show", showing: true })} /> : null;
  const summary = simSummary(state);
  return (
    <section aria-label="Phone details" className="flex flex-col gap-3">
      {state.info.status === "Loading" && <Spinner label="Reading the phone" />}
      {state.info.status === "Failed" && <Banner variant="destructive" action={can({ type: "refresh" }) && <Button variant="outline" size="sm" onClick={() => void send({ type: "refresh" })}>Try again</Button>}>The phone's details could not be read</Banner>}
      {summary === "SimsUnread" && (
        <Banner variant="warn" action={can({ type: "allow" }) && <Button size="sm" onClick={() => void send({ type: "allow" })}>Allow</Button>}>
          {can({ type: "allow" }) ? "Alpha needs access to the phone's state to show your SIMs" : "Allow phone access for Alpha in Android's settings"}
        </Banner>
      )}
      {summary === "NoSim" && <ListRow title="No SIM" />}
      {state.lines.map((line) => <LineRows key={line.slot} line={line} />)}
      {state.info.status === "Loaded" && (
        <ListGroup heading="Apps">
          <ListRow title="Calls" trailing={state.holders.phoneAlpha ? "Alpha" : state.holders.phoneApp || "None"} />
          {can({ type: "roleAsked", sms: false }) && <ListRow title="Make Alpha your phone app" onClick={() => void send({ type: "roleAsked", sms: false })} />}
          <ListRow title="Texts" trailing={state.holders.smsAlpha ? "Alpha" : state.holders.smsApp || "None"} />
          {can({ type: "roleAsked", sms: true }) && <ListRow title="Make Alpha your SMS app" onClick={() => void send({ type: "roleAsked", sms: true })} />}
          <ListRow title="Voicemail" trailing={voicemails[state.voicemail]} />
          {imeiElsewhere(state) && <ListRow title="IMEI" detail="Shown in Android's device status" />}
        </ListGroup>
      )}
    </section>
  );
}
