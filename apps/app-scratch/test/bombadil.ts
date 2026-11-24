// What Bombadil checks on every state it reaches while it drives the page served by `pnpm start`
// (SPEC.md, "Exploring the page"): its defaults and each area's properties, from test/bombadil/<area>.ts.
export * from "@antithesishq/bombadil/browser/defaults";
export * from "./bombadil/platform.ts";
export * from "./bombadil/shell.ts";
export * from "./bombadil/assistant.ts";
export * from "./bombadil/voice.ts";
export * from "./bombadil/calendar.ts";
export * from "./bombadil/notes.ts";
export * from "./bombadil/files.ts";
export * from "./bombadil/inbox.ts";
export * from "./bombadil/maps.ts";
export * from "./bombadil/browser.ts";
export * from "./bombadil/camera.ts";
export * from "./bombadil/telephony.ts";
export * from "./bombadil/clock.ts";
export * from "./bombadil/account.ts";
export * from "./bombadil/workflows.ts";
export * from "./bombadil/settings.ts";
