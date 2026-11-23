import type { ComponentMeta } from "vibestack/stories";
import { ToastProvider, ToastViewport, type ToastProps } from "./Toast.tsx";

export const meta: ComponentMeta<ToastProps> = {
  args: { title: "Note saved.", defaultOpen: true },
  decorator: (story) => <ToastProvider>{story()}<ToastViewport /></ToastProvider>,
};
