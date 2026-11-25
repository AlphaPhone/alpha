import { AppHeader, Button, TabsList, TabsTrigger } from "@repo/ui";
import { ChevronLeft, Clock, Grid3X3, UserRound, Voicemail } from "lucide-react";
import type { ReactNode } from "react";

export interface PhoneTabsProps {
  title: string;
  contacts: boolean;
  voicemail: boolean;
  unheard: boolean;
  onBack?: () => void;
  children?: ReactNode;
}

const tabs = [
  { name: "Recents", Icon: Clock },
  { name: "Keypad", Icon: Grid3X3 },
  { name: "Voicemail", Icon: Voicemail },
  { name: "Contacts", Icon: UserRound },
] as const;

/** Recents, keypad and the phone's admitted voicemail and address book, in the Phone header. */
export function PhoneTabs({ title, contacts, voicemail, unheard, onBack, children }: PhoneTabsProps) {
  return (
    <AppHeader title={title} data-alpha-phone-header="" className="mt-[max(0.125rem,env(safe-area-inset-top))] shrink-0 flex-wrap"
      leading={onBack && <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}><ChevronLeft /></Button>}>
      <TabsList aria-label="Phone" className="gap-0.5 p-[3px]">
        {tabs.map(({ name, Icon }) => {
          if ((name === "Voicemail" && !voicemail) || (name === "Contacts" && !contacts)) return null;
          return (
            <TabsTrigger key={name} value={name} data-alpha-phone-tab={name.toLowerCase()}
              className="relative grid h-11 w-[46px] flex-none place-items-center px-0 text-foreground">
              <Icon aria-hidden className="size-5" />
              <span className="sr-only">{name}</span>
              {name === "Voicemail" && unheard && <span role="img" aria-label="Unheard voicemail" className="absolute top-2 right-2 size-2 rounded-full bg-alpha" />}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {children}
    </AppHeader>
  );
}
