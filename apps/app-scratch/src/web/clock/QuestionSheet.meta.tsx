import type { ComponentMeta } from "vibestack/stories";
import type { QuestionSheetProps } from "./QuestionSheet.tsx";
import { question } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<QuestionSheetProps> = {
  args: { ...question, onAnswer: none },
  examples: { Calendar: { name: "Alpha Phone notification", excerpt: "Dentist\nTomorrow at 9:00" } },
};
