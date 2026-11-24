/** A link written in a message's text, and whether it may be opened: https, with no credentials in it. */
export interface Link {
  readonly url: string;
  readonly secure: boolean;
  readonly label: string;
  readonly mismatch: boolean;
}

const written = /\bhttps?:\/\/[^\s<>"'()]+[^\s<>"'().,;:!?]/giu;

/** The destination and the host the sender's label appears to claim. @throws {never} */
export function linkOf(url: string, label: string): Link {
  const parsed = URL.parse(url);
  const claimed = URL.parse(label.trim()) ?? URL.parse(label.trim(), "https://placeholder.invalid");
  return {
    url: parsed?.href ?? url,
    label: label.trim() || parsed?.hostname || url,
    secure: parsed?.protocol === "https:" && parsed.username === "" && parsed.password === "",
    mismatch: claimed !== null && claimed.hostname !== "placeholder.invalid" && parsed?.hostname !== claimed.hostname,
  };
}

/** The links of `text`, in the order they are written, each once. @throws {never} */
export function linksOf(text: string): Link[] {
  return [...new Set(text.match(written) ?? [])].slice(0, 50).map((url) => linkOf(url, url));
}
