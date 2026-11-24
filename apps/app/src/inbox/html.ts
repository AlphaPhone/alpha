// spec/inbox/reader.md, "Formatted mail is sanitized, isolated and shown whole or not at all"; spec/inbox/reader.md, "A mail link opens only over HTTPS, only in Alpha's Browser, after the owner reviews it"
import createDOMPurify from "dompurify";
import { linkTextMismatch } from "@elizaos/plugin-inbox-client";
import type { MailLink } from "../../gen/inbox__reader.ts";

/** Formatted mail ready for an isolated frame: the document, how many remote images it holds, and its inline links. */
export interface PreparedMail {
  readonly document: string;
  readonly remoteImages: number;
  readonly inlineLinks: readonly string[];
}

const HTML_LIMIT = 512 * 1024;
const purifier = createDOMPurify();

function imageUrl(value: string): string | null {
  if (/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

purifier.addHook("uponSanitizeAttribute", (node, data) => {
  if (node.nodeName === "IMG" && data.attrName === "src") {
    const url = imageUrl(data.attrValue);
    if (url) node.setAttribute("data-alpha-image", url);
  }
  if (node.nodeName === "A" && data.attrName === "href") {
    try {
      const url = new URL(data.attrValue);
      if (url.protocol === "https:" && !url.username && !url.password) node.setAttribute("data-alpha-link", url.href);
    } catch {
      return;
    }
  }
});

/**
 * Sanitizes formatted mail for a sandboxed frame: no scripts, forms, frames, media, fonts, navigation or
 * requests; remote images load only when `showRemoteImages`. Returns null for mail over 512 KiB.
 */
export function prepareMailHtml(html: string, showRemoteImages: boolean, imagePlaceholder: (alt: string) => string): PreparedMail | null {
  if (new TextEncoder().encode(html).length > HTML_LIMIT) return null;
  const content = purifier.sanitize(html, {
    USE_PROFILES: { html: true },
    RETURN_DOM_FRAGMENT: true,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["data-alpha-image", "data-alpha-link"],
    ADD_TAGS: ["style"],
    FORBID_TAGS: ["form", "input", "button", "textarea", "select", "iframe", "object", "embed", "video", "audio", "source", "link", "meta", "base"],
    FORBID_ATTR: ["src", "srcset", "href", "action", "formaction", "background", "ping", "target", "autofocus"],
  });
  let remoteImages = 0;
  for (const node of Array.from(content.querySelectorAll<HTMLImageElement>("img"))) {
    const src = imageUrl(node.getAttribute("data-alpha-image") ?? "");
    node.removeAttribute("data-alpha-image");
    if (src?.startsWith("https:")) {
      remoteImages++;
      if (showRemoteImages) node.src = src;
      else {
        const label = node.ownerDocument.createElement("span");
        label.textContent = imagePlaceholder(node.alt);
        node.replaceWith(label);
      }
    } else if (src) node.src = src;
    else node.remove();
  }
  const inlineLinks: string[] = [];
  for (const node of Array.from(content.querySelectorAll("a[data-alpha-link]"))) {
    node.setAttribute("role", "link");
    node.setAttribute("tabindex", "0");
    const href = node.getAttribute("data-alpha-link");
    if (href && !inlineLinks.includes(href)) inlineLinks.push(href);
  }
  const container = content.ownerDocument.createElement("div");
  container.append(content);
  const csp = `default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:${showRemoteImages ? " https:" : ""}; font-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  const document = `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{overflow-x:hidden}html,body{margin:0;padding:0;overflow-wrap:anywhere}img{max-width:100vw;height:auto}td{overflow-wrap:anywhere}a[role=link]{cursor:pointer;text-decoration:underline}</style></head><body>${container.innerHTML}</body></html>`;
  return { document, remoteImages, inlineLinks };
}

/** Scales the frame's document as a whole to the frame's width and sizes the frame to it; returns the cleanup. */
export function fitMailFrame(frame: HTMLIFrameElement): () => void {
  const doc = frame.contentDocument;
  if (!doc) return () => undefined;
  const body = doc.body;
  let lastWidth = 0;
  const fit = () => {
    const available = frame.clientWidth;
    if (!frame.isConnected || frame.contentDocument !== doc || !available) return;
    lastWidth = available;
    body.style.zoom = "1";
    body.style.width = "auto";
    const width = Math.max(available, body.scrollWidth, doc.documentElement.scrollWidth);
    if (width > available) body.style.width = `${width}px`;
    const scale = available / width;
    body.style.zoom = String(scale);
    const height = Math.ceil(Math.max(body.getBoundingClientRect().height, body.scrollHeight * scale));
    frame.style.height = `${Math.min(32000, Math.max(120, height))}px`;
  };
  const observer = new ResizeObserver(() => { if (frame.clientWidth !== lastWidth) fit(); });
  observer.observe(frame);
  doc.addEventListener("load", fit, true);
  fit();
  return () => { observer.disconnect(); doc.removeEventListener("load", fit, true); };
}

/** A link of formatted mail as the reader reviews it: the message's own entry for that address, or one built from the anchor. */
export function inlineMailLink(href: string, text: string, known: readonly MailLink[]): MailLink {
  const listed = known.find((link) => link.href === href);
  if (listed) return listed;
  const host = /^https:\/\/([^/?#:]+)/i.exec(href)?.[1] ?? "";
  return { href, text: text.trim() || href, host, mismatch: linkTextMismatch({ href, text }) };
}

/** Sends a tap or Enter on a sanitized anchor of the frame to the link review instead of navigating; returns the cleanup. */
export function bindMailLinks(frame: HTMLIFrameElement, onLink: (href: string, text: string) => void): () => void {
  const doc = frame.contentDocument;
  if (!doc) return () => undefined;
  const follow = (event: Event) => {
    if (event instanceof KeyboardEvent && event.key !== "Enter") return;
    const anchor = (event.target as Element | null)?.closest?.("a[data-alpha-link]");
    if (!anchor) return;
    event.preventDefault();
    onLink(anchor.getAttribute("data-alpha-link") ?? "", anchor.textContent ?? "");
  };
  doc.addEventListener("click", follow, true);
  doc.addEventListener("keydown", follow, true);
  return () => { doc.removeEventListener("click", follow, true); doc.removeEventListener("keydown", follow, true); };
}
