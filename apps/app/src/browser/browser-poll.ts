/** Work the browser adapter's 100 ms poll may skip. Pure decisions; nothing here touches the DOM or a
 * native plugin directly. */

/** Off the Browser view with the native surface already hidden, there is no geometry to measure or send. */
export const surfacePollIdle = (view: unknown, lastGeometry: string, hiddenGeometry: string): boolean =>
  surfaceIdleForView(typeof view === 'string' ? view : '', lastGeometry, hiddenGeometry);
/** `surfacePollIdle` for a view name; any non-string view is passed as ''. Checked by LemmaScript. */
export function surfaceIdleForView(view: string, lastGeometry: string, hiddenGeometry: string): boolean {
  //@ verify
  //@ ensures \result <==> view !== 'browser' && lastGeometry === hiddenGeometry
  //@ ensures view === 'browser' ==> !\result
  return view !== 'browser' && lastGeometry === hiddenGeometry;
}
