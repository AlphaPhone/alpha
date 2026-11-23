// Build-time switch for mock, fixture and developer surfaces. Off unless ELIZA_DEV_ALLOW_TEST_MOCKS=1.
export const testMocksEnabled: boolean = import.meta.env.VITE_ELIZA_DEV_ALLOW_TEST_MOCKS === '1';
export const devSurfacesEnabled: boolean = import.meta.env.DEV && testMocksEnabled;

export const privateLocalPreviewEnabled: boolean = import.meta.env !== undefined && import.meta.env.DEV === true && import.meta.env.VITE_ALPHA_PRIVATE_LOCAL_PREVIEW === '1' && import.meta.env.VITE_LOCAL_AGENT === '1';
