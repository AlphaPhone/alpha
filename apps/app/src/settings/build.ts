import { allowsTestMocks } from "../platform/build.ts";

/**
 * Whether this is a development build: the development server, or a build made with `ELIZA_DEV_ALLOW_TEST_MOCKS=1`.
 * The Developer page and its Problem log exist only there; a production build never has them. @throws {never}
 */
export function development(): boolean {
  return import.meta.env.DEV || allowsTestMocks();
}

/** The version this build of Alpha names, and the mode it was built in, for the diagnostics it exports. @throws {never} */
export function versions(): { readonly app: string; readonly mode: string } {
  const app: unknown = import.meta.env.VITE_ALPHA_VERSION;
  return { app: typeof app === "string" && app.length > 0 ? app : "development", mode: import.meta.env.MODE };
}
