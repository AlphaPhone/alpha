/** Whether this is a development build: the Developer page and its Problem log exist only there. @throws {never} */
export function development(): boolean {
  return import.meta.env.DEV;
}

/** The version this build of Alpha names, and the mode it was built in, for the diagnostics it exports. @throws {never} */
export function versions(): { readonly app: string; readonly mode: string } {
  return { app: import.meta.env.VITE_ALPHA_VERSION ?? "development", mode: import.meta.env.MODE };
}
