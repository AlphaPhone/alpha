/** Whether this build was made with `ELIZA_DEV_ALLOW_TEST_MOCKS=1` (vite.config.ts exposes it to the page). */
export const allowsTestMocks = (): boolean => import.meta.env.ELIZA_DEV_ALLOW_TEST_MOCKS === "1";
