// What Bombadil checks in every state of the page: its defaults, and each area's properties, named after the area. One line per area.
export * from "@antithesishq/bombadil/browser/defaults";
export * from "./bombadil/shell.ts";
// The sample is on no page that is served, so its property holds emptily: it stays until the user agrees to its removal.
export * from "./bombadil/sample.ts";
export * from "./bombadil/ask.ts";
