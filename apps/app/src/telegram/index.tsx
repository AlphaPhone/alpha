import { Layer } from "effect";
import { area, type Resident, type Shown } from "../runtime/ui.tsx";
import { TelegramScreen } from "./Telegram.tsx";
import { telegramBack } from "./resident.vibe";

function TelegramView({ runtime, alpha }: Shown<Resident>) {
  return <TelegramScreen runtime={runtime} onBack={() => { void alpha.back(); }} />;
}

/** Telegram user-account client area mounted at `view:Telegram`; its machines and store are resident. */
export default area(Layer.empty, TelegramView, { back: telegramBack });
