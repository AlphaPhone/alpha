// spec/app/settings/index.md, "The build says once whether it is a development build, and the phone whether Alpha runs on a phone and on an Alpha image"
/** The version this build carries, and Vite's mode. @throws {never} */
export function versions(): { readonly app: string; readonly mode: string } {
  return { app: import.meta.env.VITE_ALPHA_VERSION ?? "development", mode: import.meta.env.MODE };
}

/** Whether this is a development build: the Developer page and its Problem log exist only there. @throws {never} */
export function development(): boolean {
  return import.meta.env.DEV;
}
