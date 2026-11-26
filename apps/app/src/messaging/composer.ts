/** Machine controls for toggling the AP-16 Ask Alpha split-stage sheet from a messaging composer. */
export interface AlphaSheetControls {
  can(event: { readonly type: "closeAlphaSheet" } | { readonly type: "openAlphaSheet"; readonly height: "SheetOpen" }, actor: "Owner"): boolean;
  send(event: { readonly type: "closeAlphaSheet" } | { readonly type: "openAlphaSheet"; readonly height: "SheetOpen" }, actor: "Owner"): Promise<unknown>;
}

/** Toggles the AP-16 composer target between the active messaging conversation and Ask Alpha. */
export function swapComposerTarget(controls: AlphaSheetControls, isAlphaBar: boolean): void {
  const event = isAlphaBar
    ? { type: "closeAlphaSheet" as const }
    : { type: "openAlphaSheet" as const, height: "SheetOpen" as const };
  if (controls.can(event, "Owner")) void controls.send(event, "Owner");
}
