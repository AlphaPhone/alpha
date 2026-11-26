import { allowsTestMocks } from "../platform/index.vibe";

/**
 * Whether this is a development build: the development server, or a build made with `ELIZA_DEV_ALLOW_TEST_MOCKS=1`.
 * The Developer page and its Problem log exist only there; a production build never has them. @throws {never}
 */
export function development(): boolean {
  return import.meta.env.DEV || allowsTestMocks();
}
