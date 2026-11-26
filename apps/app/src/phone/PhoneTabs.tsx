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
  /** Contacts' actions, which get the title row while the tabs sit below. */
  children?: ReactNode;
}

const tabs = [
  { name: "Recents", Icon: RecentsGlyph },
  { name: "Keypad", Icon: Dialpad },
  { name: "Voicemail", Icon: VoicemailGlyph },
  { name: "Contacts", Icon: ContactsGlyph },
] as const;

/** Recents, keypad and the phone's admitted voicemail and address book, in the Phone header. */
export function PhoneTabs({ title, contacts, voicemail, unheard, onBack, children }: PhoneTabsProps) {
  const separate = children !== undefined;
  const selector = (
    <TabsList aria-label="Phone" className="gap-0.5 p-[3px]">
      {tabs.map(({ name, Icon }) => {
        if ((name === "Voicemail" && !voicemail) || (name === "Contacts" && !contacts)) return null;
        return (
          <TabsTrigger key={name} value={name} data-alpha-phone-tab={name.toLowerCase()}
            className={cn("relative grid h-11 flex-none place-items-center px-0 text-foreground", separate ? "w-16" : "w-[46px]")}>
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
      <AppHeader title={title} data-alpha-phone-header="" className="mt-[max(0.125rem,env(safe-area-inset-top))] shrink-0 flex-wrap in-[main:has([data-alpha-call-strip=over])]:mt-0"
        leading={onBack && <Button variant="ghost" size="icon" aria-label={separate ? "Back" : "Back to apps"} className="rounded-lg" onClick={onBack}><ChevronLeft /></Button>}>
        {separate ? children : selector}
      </AppHeader>
      {separate && <div className="flex shrink-0 justify-center px-4 pb-2">{selector}</div>}
    </>
  );
}
