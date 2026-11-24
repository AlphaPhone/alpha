// spec/app/inbox/message.md, "Story: Read a message"
import type { MailMessage } from "@elizaos/cloud/client";
import createDOMPurify from "dompurify";
import { type Link, linkOf, linksOf } from "./links.ts";

const purifier = createDOMPurify();
const maxHtmlBytes = 512 * 1024;
const imageSource = (url: string) => /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/iu.test(url)
  ? url
  : linkOf(url, "").secure ? URL.parse(url)?.href : undefined;

type Formatted = { template: HTMLTemplateElement; remoteImages: number; inline: ReadonlySet<string> };
type Prepared = { formatted?: Formatted; links: Link[] };
const prepared = new WeakMap<MailMessage, Prepared>();

function format(html: string, links: Link[]): Formatted | undefined {
  if (new TextEncoder().encode(html).length > maxHtmlBytes) return undefined;
  const template = document.createElement("template");
  template.innerHTML = html;
  const content = template.content.ownerDocument.createElement("div");
  content.append(template.content);
  template.content.append(content);
  const sources = new Map<HTMLImageElement, string>();
  for (const node of content.querySelectorAll<HTMLImageElement>("img[src]")) {
    const src = imageSource(node.getAttribute("src") ?? "");
    if (src) sources.set(node, src);
  }
  const destinations = new Map<HTMLAnchorElement, Link>();
  for (const node of content.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const link = linkOf(node.getAttribute("href") ?? "", node.textContent ?? "");
    if (link.secure) destinations.set(node, link);
  }
  purifier.sanitize(content, {
    IN_PLACE: true,
    USE_PROFILES: { html: true },
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["form", "input", "button", "textarea", "select", "iframe", "object", "embed", "video", "audio", "source", "link", "meta", "base"],
    FORBID_ATTR: ["src", "srcset", "href", "action", "formaction", "background", "ping", "target", "autofocus", "tabindex"],
  });
  let remoteImages = 0;
  for (const [node, src] of sources) {
    if (!template.content.contains(node)) continue;
    node.setAttribute("data-alpha-image", src);
    if (src.startsWith("https:")) remoteImages++;
  }
  const inline = new Set<string>();
  for (const [node, link] of destinations) {
    if (!template.content.contains(node)) continue;
    const previous = links.findIndex(({ url, label }) => url === link.url && label === link.label);
    if (previous < 0 && links.length >= 100) continue;
    const index = previous < 0 ? links.push(link) : previous + 1;
    node.setAttribute("data-alpha-link", String(index));
    node.setAttribute("role", "link");
    node.setAttribute("tabindex", "0");
    inline.add(link.url);
  }
  while (content.firstChild) template.content.insertBefore(content.firstChild, content);
  content.remove();
  return { template, remoteImages, inline };
}

/** The body and one link index shared by its screen, confirmation and open effect. @throws {never} */
export function prepareMessage(message: MailMessage): Prepared {
  const cached = prepared.get(message);
  if (cached) return cached;
  const links = linksOf(message.bodyText);
  const formatted = message.bodyHtmlStatus === "available" && message.bodyHtml && typeof document !== "undefined"
    ? format(message.bodyHtml, links)
    : undefined;
  const result = { links, formatted };
  prepared.set(message, result);
  return result;
}

/** A script-free document. Inline destinations are indices into the reviewed links, never navigable anchors. */
export function frameDocument(formatted: Formatted, remote: boolean): string {
  const template = formatted.template.cloneNode(true) as HTMLTemplateElement;
  for (const node of template.content.querySelectorAll("img")) {
    const src = node.getAttribute("data-alpha-image");
    node.removeAttribute("data-alpha-image");
    if (src?.startsWith("data:") || (remote && src?.startsWith("https:"))) {
      node.src = src;
    } else if (src) {
      const label = document.createElement("span");
      label.textContent = node.alt ? `[Image: ${node.alt}]` : "[Image]";
      node.replaceWith(label);
    } else {
      node.remove();
    }
  }
  const policy = `default-src 'none'; style-src 'unsafe-inline'; img-src data:${remote ? " https:" : ""}; form-action 'none'; base-uri 'none'`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;overflow-wrap:anywhere;font:1rem/1.6 system-ui,sans-serif;color:CanvasText;background:Canvas}html{overflow-x:hidden}img{max-width:100vw;height:auto}a[role=link]{color:LinkText;cursor:pointer;text-decoration:underline}</style></head><body>${template.innerHTML}</body></html>`;
}

/** Fit the whole message to the reader and surface inline links for review. */
export function connectMailFrame(frame: HTMLIFrameElement, open: (link: number) => void): () => void {
  let disconnect = () => {};
  const loaded = () => {
    disconnect();
    const doc = frame.contentDocument;
    const body = doc?.body;
    if (!doc || !body) return;
    let width = 0;
    const fit = () => {
      const available = frame.clientWidth;
      if (!available || frame.contentDocument !== doc) return;
      width = available;
      body.style.zoom = "1";
      body.style.width = "auto";
      const natural = Math.max(available, body.scrollWidth, doc.documentElement.scrollWidth);
      const scale = available / natural;
      if (natural > available) body.style.width = `${natural}px`;
      body.style.zoom = String(scale);
      frame.style.height = `${Math.min(32000, Math.max(120, Math.ceil(Math.max(body.getBoundingClientRect().height, body.scrollHeight * scale))))}px`;
    };
    const follow = (event: MouseEvent | KeyboardEvent) => {
      if ("key" in event && event.key !== "Enter") return;
      const element = event.target as Element | null;
      const anchor = element?.closest?.("a[data-alpha-link]");
      if (!anchor) return;
      event.preventDefault();
      open(Number(anchor.getAttribute("data-alpha-link")));
    };
    const resize = new ResizeObserver(() => { if (width !== frame.clientWidth) fit(); });
    resize.observe(frame);
    doc.addEventListener("load", fit, true);
    doc.addEventListener("click", follow);
    doc.addEventListener("keydown", follow);
    disconnect = () => {
      resize.disconnect();
      doc.removeEventListener("load", fit, true);
      doc.removeEventListener("click", follow);
      doc.removeEventListener("keydown", follow);
    };
    fit();
  };
  frame.addEventListener("load", loaded);
  if (frame.contentDocument?.readyState === "complete") loaded();
  return () => {
    frame.removeEventListener("load", loaded);
    disconnect();
  };
}
