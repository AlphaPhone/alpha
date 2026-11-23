# specs/quint/refinement/services/browser-google-return.mjs
- Lines: 61 | Kind: Quint refinement harness (source transplant: slices one branch out of `scripts/browser-cloud-dev-bridge.ts` and evaluates it with `new Function`) | Verdict: PORT
- Covers: model `BrowserGoogleReturn`: the dev bridge's `/google-return` loopback callback emits exactly one connection wakeup for the owned attempt, and refuses replay, wrong host, expiry and a changed credential owner (4 traces). Duplicates: `test/browser-cloud-dev-bridge.test.mjs` covers browser Google sign-in/connect returns over real HTTP (popup + MFA); the model link exists only here. Importers: `index.mjs` only (no per-model wrapper; its only runner is the services aggregate `test/quint-services-refinement.test.mjs`, verdict DELETE).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-23 | T2 / T10 | Cuts the bridge between `"  if(req.url?.startsWith('/google-return?')"` and `'  if(req.url===GOOGLE_BROWSER_RETURN'` (leading spaces included), wraps it in `const handler=async(req,res)=>{const host=req.headers.host;...}` and binds the free variables by name: `workspaceReturns`, `admitted`, `send`, `createHash`, `UUID`, `Date`. Any rename, reorder or reformat of the bridge breaks it. | PORT: drive the real `createBrowserCloudDevHandler` exactly as `browser-cloud-request-custody-probe.mjs` does (closed `fs/promises` hook, scripted `request` port), first starting a workspace attempt through the handler and then sending `GET /google-return?...`. If attempt setup needs a signed-in profile, the bridge should export the return branch as `handleWorkspaceGoogleReturn(req, res, {returns, admit, now})` and use it internally. | Medium: `admitted` (credential check) must become an injectable port |
| 2 | 43 | T1-like | Parses the response HTML with `/\.postMessage\((\{.*?\})\);/` to find the wakeup. | Acceptable at an HTTP boundary (that is the observable output), keep. | Low |
| 3 | 15-16 | B5 | Hashes `index.mjs` and `strip-types.mjs` as sources. | Drop. | None |
| 4 | — | D6 / D20 | Models dev-only code; keep with the bridge (D6). | Path-filter to the bridge. | — |
| 5 | — | P4 risk | Only runner is the aggregate being deleted. | The single manifest-driven runner must include it. | Medium |

## Proposed end state
~60 lines in the probe style: real handler, closed ports, the same four modes. No `readFileSync`, no `stripTypeScriptTypes`, no `new Function`.
