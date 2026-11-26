import { AppHeader, Button, TabsList, TabsTrigger } from "@repo/ui";
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
  /** Contacts' actions, which get the title row under the tabs. */
  children?: ReactNode;
}

const tabs = [
  { name: "Recents", Icon: RecentsGlyph },
  { name: "Keypad", Icon: Dialpad },
  { name: "Voicemail", Icon: VoicemailGlyph },
  { name: "Contacts", Icon: ContactsGlyph },
] as const;

/**
 * Recents, keypad and the phone's admitted voicemail and address book, as v121 drew them on the Alpha image: one icon
 * pill centred at the top of Phone, with no title row (v121 6ed84c289 `prototype/template.html:126-128`,
 * `prototype/phone-adapter.ts:56-64`, `prototype/phone.css:1126-1131`). Contacts opened from the pill keeps its own
 * header under it (`phone.css:1132-1133`).
 */
export function PhoneTabs({ title, contacts, voicemail, unheard, onBack, header, children }: PhoneTabsProps) {
  const separate = header !== undefined || children !== undefined;
  return (
    <>
      <div data-alpha-phone-header="" data-host-chrome=""
        className="relative flex shrink-0 justify-center px-4 pt-[calc(max(0.125rem,env(safe-area-inset-top))+0.5rem)] pb-2 in-[main:has([data-alpha-call-strip=over])]:pt-0">
        <h1 className="sr-only">{title}</h1>
        {onBack && <Button variant="ghost" size="icon" aria-label={separate ? "Back" : "Back to apps"} className="absolute left-3 size-11 min-w-11 rounded-lg"
          onClick={onBack}><ChevronLeft className="size-4.5" /></Button>}
        <TabsList aria-label="Phone" className="max-w-full gap-0.5 p-[3px]">
          {tabs.map(({ name, Icon }) => {
            if ((name === "Voicemail" && !voicemail) || (name === "Contacts" && !contacts)) return null;
            return (
              <TabsTrigger key={name} value={name} data-alpha-phone-tab={name.toLowerCase()}
                className="relative grid h-11 w-16 flex-none place-items-center px-0 text-foreground transition-none">
                <Icon aria-hidden className="size-5" />
                <span className="sr-only">{name}</span>
                {name === "Voicemail" && unheard && <span role="img" aria-label="Unheard voicemail" className="absolute top-2 right-4 size-2 rounded-full bg-primary" />}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      {separate && (header ?? <AppHeader title={title} className="shrink-0">{children}</AppHeader>)}
    </>
  );
}
