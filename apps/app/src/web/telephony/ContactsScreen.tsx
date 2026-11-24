// spec/telephony/contacts.md, "Story: Read my contacts only while I am looking at them"; spec/telephony/contacts.md, "Story: Change only the contact I reviewed"; spec/telephony/contacts.md, "Story: Let Alpha show me matching contacts"; spec/telephony/comms.md, "Story: Address the person or Alpha from one bar"
import { useCallback } from "react";
import { useMachine as useContactsMachine } from "../../../gen/telephony__contacts.react.ts";
import { initial as contactsInitial } from "../../../gen/telephony__contacts.ts";
import { ContactsView } from "../../telephony/contacts.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { openApp } from "./open.ts";
import { ContactsScreenView } from "./ContactsScreenView.tsx";
import { act, start } from "../shell/services.ts";
import { runtime } from "./runtime.ts";
import { backIn } from "./back.ts";
import { stageView, useComms } from "./useComms.ts";

/** Contacts' screen props: the shell's route and close. */
export type ContactsScreenProps = ScreenProps;

/**
 * Contacts on the Alpha image: the list for the query on screen, one contact, the editor, and the one bar.
 * @model spec/telephony/contacts.md
 * @design design.md
 */
export function ContactsScreen({ route }: ContactsScreenProps) {
  const { state: c = contactsInitial, send, can } = useContactsMachine(runtime);
  const stage = useComms();
  const visit = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const stop = start(ContactsView.use((v) => v.visit(route)));
    stage.show("ContactsApp", "ListSubject", "contacts:list:");
    return stop;
  }, [route]);
  const read = (query: string, explicit = false) => act(ContactsView.use((v) => v.read(query, explicit)));
  return (
    <ContactsScreenView
      ref={visit}
      {...stageView(stage)}
      contacts={c}
      fromPhone={route === "from:phone"}
      onBack={() => void backIn("contacts")}
      onPhone={() => openApp("phone", "recents")}
      onRead={read}
      onSearchOpened={() => can({ type: "searchOpened" }) && send({ type: "searchOpened" })}
      onAdd={() => act(ContactsView.use((v) => v.edit("Creating")))}
      onEdited={() => can({ type: "edited" }) && send({ type: "edited" })}
      onSave={(draft) => act(ContactsView.use((v) => v.save(draft)))}
      onCancelEdit={() => can({ type: "editorClosed" }) && send({ type: "editorClosed" })}
      onCall={(number) => openApp("phone", `keypad:${number}`)}
      onMessage={(number) => openApp("messages", `compose:${number}`)}
      onEdit={() => act(ContactsView.use((v) => v.edit("Editing")))}
      onDeleteAsked={() => can({ type: "deleteAsked" }) && send({ type: "deleteAsked" })}
      onDeleteDeclined={() => send({ type: "deleteDeclined" })}
      onDeleteConfirmed={() => act(ContactsView.use((v) => v.remove()))}
      onClearChip={() => act(ContactsView.use((v) => v.clearChip()))}
      onAllow={() => act(ContactsView.use((v) => v.allow()))}
      onOpenContact={(contactId) => {
        if (!can({ type: "contactOpened", contactId })) return;
        act(ContactsView.use((v) => v.open(contactId)));
        stage.show("ContactsApp", "ContactSubject", `contacts:contact:${contactId}`);
      }}
      onMore={() => act(ContactsView.use((v) => v.more()))}
      onAskContacts={stage.askContacts}
    />
  );
}
