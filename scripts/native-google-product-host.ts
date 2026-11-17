import {
  readGoogleAgentAccessFile,
  startNativeGoogleAgentHost as startSharedHost,
  type NativeGoogleBinding,
} from '../.eliza/client-features/packages/app/src/runtime/managed-google-agent/index.ts';
import {productionCloud} from '../apps/app/src/runtime/cloud-deployment.generated.ts';

export {readGoogleAgentAccessFile};
export {nativeCloudRuntime} from '../apps/app/src/product/native-cloud-runtime.ts';

/** Bind the shared host to this product's deployment and installed settings slot. */
export function startNativeGoogleAgentHost(options: {
  binding: NativeGoogleBinding;
  apiToken: string;
  request?: typeof fetch;
  assertCurrent?: () => void;
}) {
  return startSharedHost({
    ...options,
    // The resident installs its Android DNS-aware fetch after this host starts.
    request: options.request ?? Object.assign(
      (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
      {preconnect(url: string | URL) {
        const currentFetch: typeof fetch & {preconnect?(url: string | URL): void} = globalThis.fetch;
        currentFetch.preconnect?.(url);
      }},
    ),
    apiOrigin: productionCloud.api,
    userAgent: 'AlphaPhone-Native-Google/1',
    gmailReadBodyMaxCharacters: 32_000,
    access: () => readGoogleAgentAccessFile(process.env.ALPHA_GOOGLE_AGENT_ACCESS_FILE),
  });
}
