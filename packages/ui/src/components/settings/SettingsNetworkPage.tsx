import { useState } from "react";
import { Globe, Lock, LockOpen, PanelsTopLeft, Wifi } from "lucide-react";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { Input } from "../Input.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Spinner } from "../Spinner.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { AndroidTold, SettingsAndroidProps } from "./vocabulary.ts";

/** A network's security, as Android parsed it: `Security` in spec/app/settings/network.md. */
export type SettingsNetworkSecurity = "open" | "enhanced-open" | "wpa2" | "wpa3" | "enterprise" | "wep";

/** One network a scan found. */
export type SettingsNearbyNetwork = { name: string; security: SettingsNetworkSecurity };

export type SettingsNetworkPageProps = SettingsAndroidProps & {
  /** Whether the phone is online, as Android last said, or that it could not say. */
  online: "unknown" | "offline" | "online" | "sign-in" | "unconfirmed";
  /** Android is being asked whether the phone is online. */
  reading?: boolean;
  /** What the last scan found: networks, or why it could not scan. */
  scan: "none" | "found" | "needs-location" | "location-off" | "unavailable";
  /** A scan is under way. */
  scanning?: boolean;
  /** The networks the last scan found. */
  networks: SettingsNearbyNetwork[];
  /** How the last join ended, once Android answered it or it was given up. */
  joined?: "connected" | "sign-in" | "declined" | "unverified" | "not-connected" | "wrong-password" | "already-saved" | "refused";
  /** A join is waiting on Android's approval. */
  joining?: boolean;
  /** Whether the passphrase typed fits the network, so Android can be asked; the Join button is enabled only then. */
  fits?: (network: SettingsNearbyNetwork, passphrase: string) => boolean;
  /** Asks Android to join the network with the passphrase typed, which goes nowhere else; offered with `fits`. */
  onJoin?: (network: SettingsNearbyNetwork, passphrase: string) => void;
  /** Scans again; offered once the last scan has ended. */
  onRescan?: () => void;
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to General. */
  onBack?: () => void;
};

const onlines: Record<SettingsNetworkPageProps["online"], string> = {
  unknown: "Unknown", offline: "Offline", online: "Online", "sign-in": "Needs a sign-in page", unconfirmed: "Connected, Internet unconfirmed",
};
const scans: Partial<Record<SettingsNetworkPageProps["scan"], string>> = {
  "needs-location": "Scanning needs precise location", "location-off": "Turn on Location to scan", unavailable: "The phone could not scan",
};
const joins: Record<NonNullable<SettingsNetworkPageProps["joined"]>, string> = {
  connected: "Connected", "sign-in": "Connected; the network needs a sign-in page", declined: "Not saved", unverified: "Alpha cannot tell whether it connected",
  "not-connected": "Saved, but not connected", "wrong-password": "Wrong password", "already-saved": "Already saved: choose it in Android's Internet panel", refused: "Android would not join it",
};
const securities: Record<SettingsNetworkSecurity, string> = { open: "Open", "enhanced-open": "Enhanced Open", wpa2: "WPA2", wpa3: "WPA3", enterprise: "Enterprise", wep: "WEP" };
const unsecured = (security: SettingsNetworkSecurity) => security === "open" || security === "enhanced-open";

/**
 * Network, on a phone: whether it is online, the networks nearby, a join through Android's own approval with a
 * passphrase typed here and kept nowhere, and Android's Internet panel and Wi-Fi settings.
 * @model spec/app/settings/network.md
 */
export function SettingsNetworkPage({ online, reading = false, scan, scanning = false, networks, joined, joining = false, fits, onJoin, onRescan, told, onBack, starting, onAndroid }: SettingsNetworkPageProps) {
  const [chosen, choose] = useState<SettingsNearbyNetwork | undefined>(undefined);
  const [passphrase, setPassphrase] = useState("");
  const said = scans[scan];
  const android = { starting, onAndroid };
  const ready = chosen !== undefined && onJoin !== undefined && !joining && (fits?.(chosen, passphrase) ?? false);
  return (
    <SettingsPage title="Network" told={told} onBack={onBack} backLabel="Back to General" actions={onRescan ? <Button variant="ghost" size="sm" onClick={onRescan}>Scan again</Button> : undefined}>
      {said ? <Banner variant="warn">{said}</Banner> : null}
      {joined ? <Banner variant={joined === "connected" ? "info" : "warn"}>{joins[joined]}</Banner> : null}
      <ListGroup>
        <ListRow leading={<Globe />} title="Internet" trailing={reading ? <Spinner size="sm" label="Reading" /> : onlines[online]} />
      </ListGroup>
      <ListGroup heading="Nearby">
        {scanning ? <ListRow title="Scanning" trailing={<Spinner size="sm" label="Scanning" />} /> : null}
        {networks.map((network) => (
          <ListRow
            key={network.name}
            leading={unsecured(network.security) ? <LockOpen /> : <Lock />}
            title={network.name}
            detail={securities[network.security]}
            selected={chosen?.name === network.name}
            onClick={() => {
              choose(network);
              setPassphrase("");
            }}
          />
        ))}
      </ListGroup>
      {chosen ? (
        <form
          className="flex flex-col gap-2 px-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready) return;
            onJoin(chosen, passphrase);
            setPassphrase("");
            choose(undefined);
          }}
        >
          {unsecured(chosen.security) ? null : (
            <Input type="password" autoComplete="off" aria-label={`Password for ${chosen.name}`} value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
          )}
          <Button type="submit" disabled={!ready} loading={joining}>{`Join ${chosen.name}`}</Button>
        </form>
      ) : null}
      <ListGroup>
        <SettingsAndroidRow target="internet-panel" title="Internet panel" icon={<PanelsTopLeft />} {...android} />
        <SettingsAndroidRow target="wifi-networks" title="Wi-Fi networks" icon={<Wifi />} {...android} />
      </ListGroup>
    </SettingsPage>
  );
}
