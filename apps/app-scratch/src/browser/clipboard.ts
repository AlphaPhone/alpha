// spec/browser/egress.md, "Share by email opens a draft with the page's address and name, and Copy link copies its address, each only from a shown settled page"

/** Writes the page's address to the clipboard; rejects when the clipboard refuses. */
export function copyText(text: string): Promise<void> {
  return globalThis.navigator.clipboard.writeText(text);
}
