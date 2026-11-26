import { AppHeader, Button, TabsList, TabsTrigger, cn } from "@repo/ui";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ContactsGlyph, Dialpad, RecentsGlyph, VoicemailGlyph } from "./icons.ts";

export interface PhoneTabsProps {
  title: string;
  contacts: boolean;
  voicemail: boolean;
  unheard: boolean;
  onBack?: () => void;
  header?: ReactNode;
  /** Contacts' actions, which get the title row while the tabs sit below. */
  children?: ReactNode;
}

/**
 * The top of Phone and Contacts as the Pixel drew it on Sunday's v119 (Alpha 45f6bed30): `--alpha-telephony-header-top`,
 * `max(44px, top inset + 8px)` (`prototype/phone.css:27,305-308`), a 56px `.alpha-stage-header` row with 4px gaps
 * (`phone.css:304`), 2px under the inset off the launcher (`phone.css:309`) and the top during a call (`phone.css:310`).
 * Its `.ib` actions are 44px; `.app-header-back` stays 52px (`prototype.css:12`, `phone.css:342`).
 */
export const telephonyHeader = cn(
  "mt-[calc(max(var(--alpha-native-inset-top,0px),env(safe-area-inset-top))+--spacing(0.5))] shrink-0",
  "in-data-[alpha-launcher]:mt-[max(--spacing(11),calc(max(var(--alpha-native-inset-top,0px),env(safe-area-inset-top))+--spacing(2)))] in-data-[alpha-launcher]:min-h-14 in-data-[alpha-launcher]:gap-1",
  "in-data-[alpha-launcher]:[&>button[aria-label]:not([aria-label^=Back])]:size-11 in-data-[alpha-launcher]:[&>button[aria-label]:not([aria-label^=Back])]:min-w-11",
  "in-[main:has([data-alpha-call-strip=over])]:mt-0 in-data-[alpha-launcher]:in-[main:has([data-alpha-call-strip=over])]:mt-0",
);

const tabs = [
  { name: "Recents", Icon: RecentsGlyph },
  { name: "Keypad", Icon: Dialpad },
  { name: "Voicemail", Icon: VoicemailGlyph },
  { name: "Contacts", Icon: ContactsGlyph },
] as const;

/**
 * Recents, keypad and the phone's admitted voicemail and address book, in the Phone header, as the Pixel drew it on
 * Sunday's v119 (Alpha 45f6bed30): the tab's name as the serif title with the icon pill inline at its end, 46px tabs and
 * the unheard dot 8px from the right (`prototype/template.html:136-141`, `prototype/phone-adapter.ts:41-65`,
 * `prototype/phone.css:311-317,1149-1157`). Contacts opened from the pill keeps its own title row and the pill sits
 * centred under it, 64px tabs, the dot 16px from the right (`template.html:2843-2862`, `phone.css:1149-1154`). The row
 * starts `max(44px, top inset + 8px)` down and is 56px tall with 4px gaps (`phone.css:27,304-308`); during a call it
 * starts at the top (`phone.css:310`).
 */
export function PhoneTabs({ title, contacts, voicemail, unheard, onBack, header, children }: PhoneTabsProps) {
  const separate = header !== undefined || children !== undefined;
  const selector = (
    <TabsList aria-label="Phone" className="gap-0.5 rounded-panel p-[3px]">
      {tabs.map(({ name, Icon }) => {
        if ((name === "Voicemail" && !voicemail) || (name === "Contacts" && !contacts)) return null;
        return (
          <TabsTrigger key={name} value={name} data-alpha-phone-tab={name.toLowerCase()}
            className={cn("relative grid h-11 flex-none place-items-center px-0 text-foreground transition-none", separate ? "w-16" : "w-[46px]")}>
            <Icon aria-hidden className="size-5" />
            <span className="sr-only">{name}</span>
            {name === "Voicemail" && unheard && <span role="img" aria-label="Unheard voicemail"
              className={cn("absolute top-2 size-2 rounded-full bg-primary", separate ? "right-4" : "right-2")} />}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
  return (
    <>
      {header ?? <AppHeader title={title} data-alpha-phone-header="" className={telephonyHeader}
        leading={onBack && <Button variant="ghost" size="icon" aria-label={separate ? "Back" : "Back to apps"} className="rounded-lg" onClick={onBack}><ChevronLeft /></Button>}>
        {separate ? children : selector}
      </AppHeader>}
      {separate && <div className="flex shrink-0 justify-center px-4 pb-2">{selector}</div>}
    </>
  );
}
