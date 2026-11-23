# test/digest-pending-storage.test.mjs
- Lines: 19 | Kind: source-text + transplant (regex-extracts the `pendingSlot:` expression from `hosted-digest-ui.tsx`, evaluates it with `new Function`; copies `RendererCredentialSlots.java` and **vendor** `SecureSlotPolicy.java` into a temp dir with an inline Java `Check` main and runs javac/java) | Verdict: DELETE
- Covers: the Android renderer's pending-digest slot key is in the renderer-allowed namespace (not the native delivery journal), the browser key is unchanged, and every pending operation uses the bound key. Duplicates: `test/renderer-slot-policy.test.mjs`, `test/renderer-slot-deployment-namespace.test.mjs`, `test/native-secure-slots.test.mjs` cover `RendererCredentialSlots` admission; `test/browser/dev-digest-storage.spec.ts` drives pending digest storage in the browser. Callers/importers: `npm test`. Research notes it resolves `JAVA_HOME` itself and bypasses `jvmSkip`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-5 | T2 | `/pendingSlot:\s*([^\n]+),/` on JSX source then `new Function` on the match. Fragile under the formatter (it already depends on the type declaration at line 124 having no trailing comma). | Delete. | Low. |
| 2 | 9 | T3, C3 | Inline Java test program in a JS template string; javac of a vendor file; own `JAVA_HOME` handling. | Delete; slot admission is covered by the renderer-slot tests and the credential-coordinator refinement. | Low. |
| 3 | 13-18 | T1 | Counts `b.storage.remove(b.pendingSlot)` occurrences (exactly 4). | Delete. | None. |

## Proposed end state
Deleted. If the Android key namespace needs proof, one row in the renderer-slot policy table (`renderer-<scope>:pending`
allowed, `<scope>:pending` denied) in whichever test survives from the renderer-slot cluster.
