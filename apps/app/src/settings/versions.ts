/** The app version and Vite build mode exposed to the About page. @throws {never} */
export function versions(): { readonly app: string; readonly mode: string } {
  const version: unknown = import.meta.env.VITE_ALPHA_VERSION;
  return { app: typeof version === "string" ? version : "development", mode: import.meta.env.MODE };
}
