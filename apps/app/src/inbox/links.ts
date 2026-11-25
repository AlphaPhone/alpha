/** A link written in a message's text, and whether it may be opened: https, with no credentials in it. */
export interface Link {
  readonly url: string;
  readonly secure: boolean;
  readonly label: string;
  readonly mismatch: boolean;
}

const written = /\bhttps?:\/\/[^\s<>"'()]+[^\s<>"'().,;:!?]/giu;
const explicitUrl = /^(?:https?:)?\/\//iu;
const bareDomain = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/:?#]|$)/iu;

function claimedHost(label: string): string | undefined {
  const trimmed = label.trim();
  if (trimmed === "" || /\s/u.test(trimmed)) return undefined;
  if (explicitUrl.test(trimmed)) {
    const claimed = URL.parse(trimmed, "https://placeholder.invalid");
    return claimed !== null && (claimed.protocol === "http:" || claimed.protocol === "https:") &&
      claimed.hostname !== "" && claimed.hostname !== "placeholder.invalid" ? claimed.hostname : undefined;
  }
  if (bareDomain.test(trimmed)) {
    const claimed = URL.parse(`https://${trimmed}`);
    return claimed !== null && claimed.hostname !== "" ? claimed.hostname : undefined;
  }
  return undefined;
}

/** The destination and the host the sender's label appears to claim. @throws {never} */
export function linkOf(url: string, label: string): Link {
  const parsed = URL.parse(url);
  const claimed = claimedHost(label);
  return {
    url: parsed?.href ?? url,
    label: label.trim() || parsed?.hostname || url,
    secure: parsed?.protocol === "https:" && parsed.username === "" && parsed.password === "",
    mismatch: claimed !== undefined && parsed?.hostname !== claimed,
  };
}

/** The links of `text`, in the order they are written, each once. @throws {never} */
export function linksOf(text: string): Link[] {
  return [...new Set(text.match(written) ?? [])].slice(0, 50).map((url) => linkOf(url, url));
}
