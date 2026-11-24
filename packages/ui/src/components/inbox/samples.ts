import type { InboxAccount } from "./InboxAccountList.tsx";
import type { InboxListRow } from "./InboxList.tsx";

export const sampleAccounts: InboxAccount[] = [
  { id: "1", email: "sam.rivera@gmail.com", grant: { read: true, send: true, modify: true } },
  { id: "2", email: "studio@riveradesign.example", grant: { read: true, send: false, modify: false } },
  { id: "3", email: "old.address@gmail.com", grant: { read: false, send: false, modify: false } },
];

export const sampleRows: InboxListRow[] = [
  { id: "1", sender: "Ana Lima", subject: "Lunch on Friday?", snippet: "I booked the table by the window for one o'clock", time: "09:41", unread: true },
  { id: "2", sender: "Bruno Costa", subject: "Invoice 2041", snippet: "Attached is the invoice for October, due in thirty days", time: "08:12", attachment: true },
  { id: "3", sender: "Carla Dias", subject: "Photos from the trip", snippet: "Here are the best ones, the rest are in the shared album", time: "Mon" },
  { id: "4", sender: "Daniel Esteves", subject: "Re: Tax papers", snippet: "Thanks, that is everything I needed", time: "Sun", unread: true },
];
