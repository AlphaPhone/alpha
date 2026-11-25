import { allowsTestMocks, toolsAsked } from "../platform/build.ts";

/**
 * Whether this is a development build: the development server, or a build made with `ELIZA_DEV_ALLOW_TEST_MOCKS=1`.
 * A production build never has its developer surfaces. @throws {never}
 */
export function development(): boolean {
  return import.meta.env.DEV || allowsTestMocks();
}

/**
 * Whether Settings shows its developer surfaces, the Developer page, its Problem log and Refresh: only in a development
 * build opened with `?tools=1`, as Alpha's earlier build gated them. @throws {never}
 */
export function developerTools(): boolean {
  return development() && toolsAsked();
}
