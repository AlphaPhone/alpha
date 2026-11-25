// spec/app/settings/index.md, "Each page links to what another area owns there"; spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"; spec/kit/read.md, "Story: Read from outside"
import { Button, Sheet, SheetContent, Spinner } from "@repo/ui";
import { X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useMachine } from "../../gen/app__shell__layers.react.ts";
import { listed, top } from "../../gen/app__shell__layers.ts";
import { area, type Area, type Resident, type Shown } from "../runtime/area.tsx";
import { accountLayer, type Profile, profileLive, profileShelf } from "./profile.vibe";

/** The account read in the open sheet, in the form Cloud confirmed. */
function AccountDetails({ profile }: { profile: Profile }) {
  if (profile.tag === "Reading") return <Spinner label="Reading account" className="text-muted-foreground" />;
  if (profile.tag === "SignInRequired") return <p role="status" className="text-sm text-muted-foreground">Sign-in required</p>;
  if (profile.tag === "Unavailable") return <p role="status" className="text-sm text-muted-foreground">Couldn’t read your account</p>;
  return (
    <div className="min-w-0 wrap-anywhere">
      <p className="text-sm text-muted-foreground">{profile.contact || profile.name || "Signed in"}</p>
      {profile.contact && profile.name && profile.contact !== profile.name ? <p className="text-sm text-muted-foreground">{profile.name}</p> : null}
    </div>
  );
}

/** The account sheet above Settings, drawing only the details the authenticated account read returned. */
export default {
  open(alpha, place) {
    const profile = profileShelf();
    function AccountSheet({ runtime }: Shown<Resident>) {
      const { state, can, send } = useMachine(runtime);
      const shown = useSyncExternalStore(profile.subscribe, profile.snapshot, profile.snapshot);
      if (!state || !listed(state, accountLayer)) return null;
      const close = { type: "closeLayer", id: accountLayer } as const;
      const onClose = () => { if (can(close)) void send(close); };
      return (
        <Sheet open={top(state).id === accountLayer} onOpenChange={(open) => { if (!open) onClose(); }}>
          <SheetContent
            title="Account"
            className="max-h-dvh max-w-105 gap-2.5 bg-background px-6.5 pt-9 pb-[max(--spacing(7),env(safe-area-inset-bottom))] text-foreground [&_h2]:flex [&_h2]:min-h-12 [&_h2]:items-center [&_h2]:text-title"
            actions={<Button variant="secondary" className="mt-2 rounded-lg" onClick={onClose}>Done</Button>}
          >
            <span aria-hidden className="absolute inset-x-0 top-3 mx-auto h-1 w-8 rounded-full bg-border" />
            <Button variant="ghost" size="icon" aria-label="Close Account" className="absolute top-9 right-6.5 size-12" onClick={onClose}><X /></Button>
            <AccountDetails profile={shown} />
          </SheetContent>
        </Sheet>
      );
    }
    return area(profileLive(profile.publish), AccountSheet).open(alpha, place);
  },
} satisfies Area;
