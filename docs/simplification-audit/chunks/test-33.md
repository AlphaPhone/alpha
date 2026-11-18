# Chunk test-33: `test/fixtures/google-browser-auth/`

All seven files are Alpha's fork of upstream's Eliza Cloud native sign-in tests
(`vendor/eliza/packages/auth/android/test`). `test/google-browser-auth.test.mjs` (not in this chunk) stages the
pinned upstream module unchanged (`android/upstream-native-sources.json` has `"patches": []`), runs upstream's suite,
copies this overlay over it and runs the suite again (360 s timeout, ~10 javac runs per pass, copies Eliza app
Android/template/renderer trees from vendor). The pins in `upstream-base.json` match the current vendor files (checked
with `shasum`); its `baseCommit` field is stale (`dae11e0` vs `8876e369`) and nothing reads it.

Alpha does ship this code: `AlphaCloudSignInPlugin.java` extends upstream `CloudSignInPlugin` with
`googleSignInMode("browser")`. The fork exists to add browser-mode coverage that upstream lacks.

| File | Kind | Verdict | Target |
|---|---|---|---|
| `chain-methods.mjs` | support: Java method slicer (T10) | KEEP, MOVE | `specs/quint/refinement/native/cloud-sign-in-methods.mjs` (only the live Quint harness needs it after the overlay goes); long term PORT upstream |
| `native-sign-in.test.mjs` | fork of upstream suite: JVM unit + transplant + source text (T1/T2/T5), tests the Eliza app host too | DELETE | MERGE its one Alpha-only test (browser start) upstream |
| `upstream-base.json` | fork provenance pins (B5) | DELETE | none |
| `ai/eliza/auth/cloud/CloudSignInBrowserTest.java.txt` | transplant, Alpha-only | MERGE upstream, then DELETE | upstream `packages/auth/android/test/ai/eliza/auth/cloud/` |
| `ai/eliza/auth/cloud/CloudSignInChainTest.java.txt` | transplant, fork (64 vs 38 scenarios) | KEEP (Quint input) | MERGE extra scenarios upstream; then Quint harness reads the staged upstream template |
| `ai/eliza/auth/cloud/CloudSignInFlowTest.java` | JVM unit of upstream pure policy, fork (+20 lines) | DELETE fork | MERGE the browser URL/redirect/Asset Links checks upstream |
| `ai/eliza/auth/cloud/CloudSignInReadinessTest.java.txt` | transplant, fork | DELETE fork | MERGE browser-gate loop upstream |

## Coverage that would be lost if the DELETEs happen before the upstream merge
- Browser-mode Google start: pending record persisted before launch, Custom Tabs vs default HTTPS browser selection,
  stock-AOSP webview-shell fallback, host never its own browser, cancel/supersede before and after persistence.
- Browser resume grace / `browser-closed`, stale timers vs successor attempts (partly also in Quint
  `GoogleBrowserReturnClaim`).
- Browser callback races (foreign, duplicate, browser MFA, cancelled, stale state), email/SMS resend + cooldown,
  consent-denied, revoke-only-replaced-key, durable cancel retirement (`CloudSignInChainTest` extras).
- Browser authorize URL contents and Google redirect allowlist; readiness gates keeping email/phone available.
These guard a shipping Alpha path (browser mode on AOSP images). None of it is covered by an Alpha integration test
or Playwright journey, and it cannot be: it is Android-native code. The right home is upstream (D14).

## Cross-file actions
1. Upstream follow-up (add to `cross-file-actions.md` §6): land `CloudSignInBrowserTest.java.txt`, the extra chain
   scenarios, Flow and Readiness additions in `vendor/eliza` `packages/auth/android/test`; advance the pin.
2. Then delete `native-sign-in.test.mjs`, `upstream-base.json`, the Flow/Readiness/Browser forks and the whole of
   `test/google-browser-auth.test.mjs` (upstream CI runs upstream's suite; T5). Its vendor tree copies go with it.
3. `specs/quint/refinement/native/google-browser-return-claim.mjs` then reads the chain template from
   `native.root/packages/auth/android/test/...` and imports the slicer from its own folder; drop
   `join(overlay, 'chain-methods.mjs')` and the template from its `sources`.
4. Until step 1 lands: keep the overlay but drop the T1 tests and the Eliza-host tests (fork lines 362-547, 590-901)
   from `native-sign-in.test.mjs` if the owner wants an interim cut — that requires the fork to stop being a
   wholesale replacement of upstream's file, so it is simpler to wait.
5. Delete the unread `baseCommit` field now (cosmetic).

## Shared helpers worth keeping
`chain-methods.mjs` (`between`, `chainMethods`, `injectMethods`) while the Quint model slices plugin methods.

## Owner questions
- May the browser-mode sign-in regressions be proposed upstream (they test upstream code Alpha ships unpatched)?
- Should Alpha CI keep running upstream's auth suite at all once the browser cases are upstream?
- Is there Android instrumentation of `AlphaCloudSignInPlugin` registration (browser mode, hosts, slots)? This chunk
  found none in the fork; the fork tests the Eliza host (`ai.elizaos.app`) instead.
