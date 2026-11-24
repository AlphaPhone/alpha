import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ContactsScreenViewProps } from "./ContactsScreenView.tsx";
import {
  commsContact, commsContacts, contactConfirming, contactEditingStale, contactOpen, contactsEmpty, contactsFailed, contactsFiltered, contactsList,
  contactsLoading, contactsMany, contactsNeedAccess, contactsUnsettled,
} from "./fixtures.ts";

export const meta: ComponentMeta<ContactsScreenViewProps> = {
  args: {
    contacts: contactsList, fromPhone: false, comms: commsContacts, request: "", card: null,
    onBack: fn(), onPhone: fn(), onRead: fn(), onSearchOpened: fn(), onAdd: fn(), onEdited: fn(), onSave: fn(), onCancelEdit: fn(), onCall: fn(), onMessage: fn(),
    onEdit: fn(), onDeleteAsked: fn(), onDeleteDeclined: fn(), onDeleteConfirmed: fn(), onClearChip: fn(), onAllow: fn(), onOpenContact: fn(), onMore: fn(),
    onAskContacts: fn(), onRequest: fn(), onSubmitRequest: fn(), onAlpha: fn(), onEndCall: fn(), onCloseChat: fn(), onDecline: fn(),
  },
  examples: {
    Loading: { contacts: contactsLoading },
    NeedsAccess: { contacts: contactsNeedAccess },
    Failed: { contacts: contactsFailed },
    Empty: { contacts: contactsEmpty, fromPhone: true },
    ManyContacts: { contacts: contactsMany },
    AlphaFilter: { contacts: contactsFiltered },
    Unsettled: { contacts: contactsUnsettled },
    Open: { contacts: contactOpen, comms: commsContact, request: "When did I last call her?" },
    DeleteAsked: { contacts: contactConfirming, comms: commsContact },
    EditingStale: { contacts: contactEditingStale, comms: commsContact },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      const list = within(canvasElement);
      await userEvent.click(list.getByRole("button", { name: /Maya Chen/ }));
      await expect(args.onOpenContact).toHaveBeenCalledWith("7");
      await expect(list.getByRole("button", { name: /Contact content unavailable/ })).toBeDisabled();
    },
    Empty: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Back" }));
      await expect(args.onPhone).toHaveBeenCalled();
      await expect(args.onBack).not.toHaveBeenCalled();
    },
    Unsettled: async ({ canvasElement, args }) => {
      const list = within(canvasElement);
      await expect(list.getByRole("button", { name: "Add a contact" })).toBeDisabled();
      await userEvent.click(list.getByRole("button", { name: "Refresh Contacts" }));
      await expect(args.onRead).toHaveBeenCalledWith("", true);
    },
  },
};
