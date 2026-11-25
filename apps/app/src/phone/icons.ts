import { createLucideIcon } from "lucide-react";

/** Develop's own Phone glyphs, drawn on lucide's 24px grid with its 2px round stroke. */
const glyph = (name: string, d: string) => createLucideIcon({ name, node: [["path", { key: name, d }]] });

export const RecentsGlyph = glyph("Recents", "M21 12a9 9 0 1 1-18 0a9 9 0 1 1 18 0zM12 7v5l3 2");
export const Dialpad = glyph("Dialpad", "M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01");
export const VoicemailGlyph = glyph("VoicemailGlyph", "M6.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM17.5 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM6.5 16h11");
export const ContactsGlyph = glyph("ContactsGlyph", "M16 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0zM4 21a8 8 0 0 1 16 0");
export const CallIn = glyph("CallIn", "M17 7L7 17M7 9v8h8");
export const CallOut = glyph("CallOut", "M7 17L17 7M9 7h8v8");
export const Handset = glyph("Handset", "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z");
export const EraseDigit = glyph("EraseDigit", "M9 5h11v14H9l-6-7zM12 9.5l5 5M17 9.5l-5 5");
export const Bubble = glyph("Bubble", "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z");
export const Close = glyph("Close", "M6 6l12 12M18 6L6 18");
export const PlayGlyph = glyph("PlayGlyph", "M8 5l11 7-11 7z");
export const PauseGlyph = glyph("PauseGlyph", "M9 6v12M15 6v12");
export const RetryGlyph = glyph("RetryGlyph", "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5");

/** The red End control: develop's call red in both themes, its handset turned down. */
export const hangupButton = "bg-hangup text-alpha-foreground hover:bg-hangup/90 active:bg-hangup/80";
