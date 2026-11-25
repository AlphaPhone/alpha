import { AppHeader, Button, TabsList, TabsTrigger, cn } from "@repo/ui";
import { ChevronLeft, Clock, UserRound, Voicemail, createLucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface PhoneTabsProps {
  title: string;
  contacts: boolean;
  voicemail: boolean;
  unheard: boolean;
  onBack?: () => void;
  /** Contacts' actions, which get the title row while the tabs sit below. */
  children?: ReactNode;
}

const Dialpad = createLucideIcon({
  name: "Dialpad",
  node: [["path", { d: "M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01" }]],
});

const tabs = [
  { name: "Recents", Icon: Clock },
  { name: "Keypad", Icon: Dialpad },
  { name: "Voicemail", Icon: Voicemail },
  { name: "Contacts", Icon: UserRound },
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
              className={cn("absolute top-2 size-2 rounded-full bg-alpha", separate ? "right-4" : "right-2")} />}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
  return (
    <>
      <AppHeader title={title} data-alpha-phone-header="" className="mt-[max(0.125rem,env(safe-area-inset-top))] shrink-0 flex-wrap"
        leading={onBack && <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}><ChevronLeft /></Button>}>
        {separate ? children : selector}
      </AppHeader>
      {separate && <div className="flex shrink-0 justify-center px-4 pb-2">{selector}</div>}
    </>
  );
}
