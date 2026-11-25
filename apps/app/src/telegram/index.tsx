import { area, type Resident, type Shown } from "../runtime/area.tsx";
import type { Layer } from "effect";
import { TelegramScreen } from "./Telegram.tsx";
import { telegramBack, telegramResident } from "./resident.vibe";

type TelegramServices = Layer.Success<typeof telegramResident>;

function TelegramView({ runtime, alpha }: Shown<TelegramServices | Resident>) {
  return <TelegramScreen runtime={runtime} onBack={() => { void alpha.back(); }} />;
}

/** Telegram user-account client area: auth, chat list, conversation, composer, agent integration, and live SSE notices. */
export default area(telegramResident, TelegramView, { back: telegramBack });
