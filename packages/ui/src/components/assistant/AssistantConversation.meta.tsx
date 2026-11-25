import { expect, fn, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { AssistantCard } from "./AssistantCard.tsx";
import { AssistantGrabber } from "./AssistantGrabber.tsx";
import type { AssistantConversationProps } from "./AssistantConversation.tsx";

const header = { title: "Friday plans", context: { view: "Calendar", day: "Thu 10 Jul" }, grabber: <AssistantGrabber />, onHome: fn(), onResize: fn(), onClose: fn() };
const transcript = {
  messages: [
    { id: "1", author: "owner" as const, text: "What is on my calendar on Friday?" },
    {
      id: "2",
      author: "alpha" as const,
      text: "Lunch with Ana at 12:30, and the dentist at 16:00.",
      children: <AssistantCard card={{ kind: "agenda", title: "Friday", rows: [{ id: "1", time: "12:30", title: "Lunch with Ana" }, { id: "2", time: "16:00", title: "Dentist" }] }} onOpen={fn()} />,
      onQuote: fn(),
      onFork: fn(),
      onReadAloud: fn(),
    },
  ],
};
const composer = { value: "", onValueChange: fn(), onAttach: fn(), onSearch: fn(), onNew: fn(), onHistory: fn(), onTalk: fn() };

export const meta: ComponentMeta<AssistantConversationProps> = {
  args: { header, transcript, composer },
  decorator: (story) => <div className="h-[40rem] max-w-md">{story() as never}</div>,
  states: {
    Replying: { header, transcript: { ...transcript, turn: { status: "replying" } }, composer: { ...composer, value: "", onStop: fn() } },
    "Typing with a draft": { header, transcript, composer: { ...composer, value: "Move the dentist to Tuesday", onSend: fn() } },
    "Sensitive screen": { header: { ...header, context: { view: "Passwords", sensitive: true } }, transcript, composer: { ...composer, value: "Show my passwords", unavailable: "sensitive" } },
    Bar: { header, transcript, composer: { ...composer, onOpen: fn() }, detent: "bar" },
    Full: { header, transcript, composer, detent: "full" },
    Empty: { header: { ...header, title: "New chat" }, transcript: { messages: [] }, composer },
    "Loading": { header, transcript: { messages: [], status: "loading" }, composer },
    "Attachment refused": { header, transcript, composer, attachmentNotice: "Could not attach example.zip" },
    "Offline": { header, transcript, composer: { ...composer, value: "Hello", unavailable: "away" } },
  },
  play: {
    "Attachment refused": async ({ canvasElement }) => {
      await expect(within(canvasElement).getByRole("alert")).toHaveTextContent("Could not attach example.zip");
    },
  },
};
