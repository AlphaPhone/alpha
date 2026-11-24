import type { ComponentMeta } from "vibestack/stories";
import { Label } from "./Label.tsx";
import { RadioGroupItem, type RadioGroupProps } from "./RadioGroup.tsx";

const choice = (value: string, text: string, disabled?: boolean) => (
  <Label key={value}>
    <RadioGroupItem value={value} disabled={disabled} />
    {text}
  </Label>
);

export const meta: ComponentMeta<RadioGroupProps> = {
  args: {
    "aria-label": "When a call comes in",
    defaultValue: "ring",
    onValueChange: () => undefined,
    children: <>{choice("ring", "Ring")}{choice("vibrate", "Vibrate")}{choice("silent", "Silent")}</>,
  },
  examples: {
    Unchosen: { defaultValue: undefined },
    "One disabled": { children: <>{choice("ring", "Ring")}{choice("vibrate", "Vibrate")}{choice("silent", "Silent", true)}</> },
    Long: {
      defaultValue: "screen",
      children: (
        <>
          {choice("ring", "Ring for everyone")}
          {choice("contacts", "Ring for contacts, voicemail for everyone else")}
          {choice("screen", "Let Alpha answer unknown numbers, ask who is calling and why, and ring only if the reason sounds urgent")}
          {choice("silent", "Send every call to voicemail until tomorrow morning")}
        </>
      ),
    },
  },
};
