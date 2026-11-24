# android/app/src/main/assetlinks.template.json
- Lines: 12 | Role: Digital Asset Links template (package `ai.alphacompute.alphaphone`, placeholder `RELEASE_CERT_SHA256_PLACEHOLDER`) that `scripts/render-assetlinks.ts` fills with the release signer for `/.well-known/assetlinks.json`. | Verdict: KEEP
- Importers: `scripts/render-assetlinks.ts:34` (`TEMPLATE` path). Text/path pins: `test/cloud-sign-in-flow.test.mjs:93` (parses it).

Data template; no findings. The package name duplicates `app.config.json` `appId`; the render script could derive it, but the test parses the template, so leave as is.
