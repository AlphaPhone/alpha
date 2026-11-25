import type { ComponentMeta } from "vibestack/stories";
import type { BrowserAddressChoicesProps } from "./BrowserAddressChoices.tsx";

export const meta: ComponentMeta<BrowserAddressChoicesProps> = {
  args: {
    choices: [
      { url: "https://enclave.example/keys-in-hardware", kind: "bookmark", title: "enclave.example", detail: "/keys-in-hardware" },
      { url: "https://news.example/on-device-agents", kind: "history", title: "news.example", detail: "/on-device-agents" },
    ],
    onOpen: () => {},
  },
};
