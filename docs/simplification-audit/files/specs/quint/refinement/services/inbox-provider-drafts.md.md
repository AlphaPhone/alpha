# specs/quint/refinement/services/inbox-provider-drafts.md
- Lines: 109 | Kind: formal model documentation (prose companion of a refinement harness) | Verdict: MERGE into the header comment of `specs/quint/refinement/services/inbox-provider-drafts.mjs`, then delete
- Covers: explains what `InboxProviderDrafts.qnt` models, which product boundaries the source runner drives, and records past validation campaigns. Duplicates: assumptions/obligations strings already in `inbox-provider-drafts.mjs:392-397`; manifest `specs/quint/services/manifest.json:1191+` (stateMapping/abstractions). Callers/importers: none (only self-reference; `grep -rn inbox-provider-drafts.md` finds nothing outside the file itself).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 78-109 | A8 | "Validation on the retained source branch", "Main-based shared-controller port", "SDK 99 integration" narrate historical pins (`b25d8aef…`, `475a`, `99b49439…`), counts and receipt folders (`test-results/quint-inbox-provider/final`, `test-results/quint-main-services`) that no longer exist or are regenerated. | Delete. | none |
| 2 | 36-50 | A8 | "Source corrections" is a changelog of bugs fixed in product code ("previously saved the entire response"). | Delete; the product behaviour is now the spec. | none |
| 3 | 38-43 | A1 | Describes normalising "older saved references" carrying `messageId`. Per D1 there is no pre-rename data; this is a legacy-reader justification (see harness finding 1). | Drop with the scenario and product normaliser. | low |
| 4 | 14-34, 52-71 | C5 | Source mapping and limits are the only durable content; they repeat the manifest `stateMapping`/`abstractions`. | Keep 6-10 lines as the harness header comment. | none |
| 5 | 73-76 | T9 | Run instructions name `node specs/.../inbox-provider-drafts.mjs` direct mode (see harness finding 6). | Drop. | none |

## Proposed end state
No `.md` file. `inbox-provider-drafts.mjs` opens with a short doc comment: which real modules execute (provider controls, drafts, `InboxOperation`, unsaved drafts, assistant draft controller), which ports are controlled (Gmail, storage), and what stays outside (real Gmail, arbitrary repeated replacements, installed storage).
