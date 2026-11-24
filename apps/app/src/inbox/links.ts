/** A link written in a message's text, and whether it may be opened: https, with no credentials in it. */
export interface Link {
  readonly url: string;
  readonly secure: boolean;
}

const written = /\bhttps?:\/\/[^\s<>"'()]+[^\s<>"'().,;:!?]/giu;

/** The links of `text`, in the order they are written, each once. @throws {never} */
export function linksOf(text: string): Link[] {
  const found = [...new Set(text.match(written) ?? [])];
  return found.map((url) => {
    const parsed = URL.parse(url);
    return { url, secure: parsed !== null && parsed.protocol === "https:" && parsed.username === "" && parsed.password === "" };
  });
}
