# apps/app/src/prototype/contacts-adapter.ts
- Lines: 159 | Role: Android-image Contacts view owner: native address-book list, detail, in-app editor, save/delete with stale/unknown-outcome handling, layered over the model.js contacts render. | Verdict: SIMPLIFY
- Importers: 1 (`apps/app/src/main.tsx:22,132`, installed only `if(isAndroid)` and `!fixture`). `contactActs` has no importer outside this file.
  Text/path pins: `specs/quint/services/manifest.json:3213-3243` (ContactsSession.qnt pins the *local* names `epoch`, `loading`, `readable`, `available`, `editor`, `clear` plus `installContactsAdapter`); `specs/quint/native/manifest.json:4373` (source list); `specs/quint/refinement/services/contacts-session-replay.mjs:12-13,42` (bundles this path); `specs/quint/refinement/native/telephony.mjs:334` (prose); `test/contacts-adapter.test.mjs:5` (esbuild bundle with stubs for `./native-adapter|./mvp-features|../platform-plugins` — import specifiers pinned); `test/comms-settings.test.mjs:48-51` (same, regex on specifiers); `test/support/feature-parity.mjs:364` (path list).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 20, 24, 26, 125, 155 | C1 | `type Bag=Record<string,any>`, `Component:any`, `owner:any`, `rows:Bag[]`, `api:Bag|null` | Import `ShellHost`/`ViewApi`/`ViewDefinition` from the proposed `prototype/shell-types.ts`; type `rows` as the plugin's list row (`{id,name,lookup,revision,phones,emails}`) | None at runtime |
| 2 | 7 | C2 | `registerPlugin<any>('AlphaContacts')` — the same plugin is registered untyped again at `agent-adapter.ts:915` (`book=registerPlugin<any>('AlphaContacts')`) | One typed `runtime/contacts-plugin.ts` exporting the `AlphaContacts` interface (`status, requestPermissions, list, get, edit, create, save, remove`) and the instance; import it in both files | Low; the test stub regex `/platform-plugins/` must follow the new specifier |
| 3 | 8, 139-140 | C6 | Icon SVG path literals `PHONE='M4 4h4l2 5…'`, `BUBBLE='M4 5h16v11H9l-5 4z'` (identical to `model.js:76 IC.bubble`) and the mail path `'M3 5h18v14H3zM3 5l9 7 9-7'` written twice (139 and 140). dc-lite maps icons by path data (`ICON_ASSETS`), so these literals only render as Lucide icons if they match an `IC` entry; `PHONE` and the mail path match none (`IC.phone`/`IC.mail` differ) | Use `IC.phone`, `IC.bubble`, `IC.mail` (needs `IC` added to the `model.js:5944` export list; the render output already carries `out.ic`), or once icons are keyed by name (research P16) pass `icon:'phone'`. Removes three literals and the 139/140 duplication | Low visual: today `PHONE`/mail paths fall back to raw SVG paths; switching to `IC.*` changes the glyph to the catalogued one — screenshot check |
| 4 | 123 | A6 | `views.contacts.reply=()=>null;` — `agent-adapter.ts:1939` replaces `p.reply` globally in the same `!fixture` branch, and `Component.reply` is the only caller of view replies | Delete the line | None (research §3 "Confirmed redundant") |
| 5 | 125-130, 133, 141 | A6 | Calls the prototype `render` with doctored state (`render({...st,list,edit:null,add:null,form:null},api)`), then overwrites `hasQ, noHits, notSearching, searching, addNew`, `d.toggleFav=()=>{}`, `d.hasCtx=false`, `nativePrototype=false` | Once fixture-only model views move out (research Q1), give Contacts one owner render that builds `list/groups/d` directly; until then keep but list the overwritten keys in one object literal | Medium; template bindings of `contacts.*` must keep the same keys |
| 6 | 26, 28, 126 | NEW (shadowed closure state) | Module-closure `api` is set through a one-line setter `setApi` and immediately shadowed: `const api=viewApi;setApi(viewApi);` | Delete `setApi` (28) and write `api=viewApi;` at 126, using `viewApi` in the body | None |
| 7 | 156-158 | D2 / B2 | Monkey-patches `componentDidMount/DidUpdate/WillUnmount`, calling `mount?.call(this)` / `update?.apply` / `unmount?.call` on methods that always exist on `Component.prototype` | Move to the hook registry (research P1); until then drop the `?.` | Low |
| 8 | 156-158 | D3 | Instance fields `this.contactsReturn`, `this.contactsHide` used only inside this file | Keep them in the closure (`let returnStop, hide`) or a `WeakMap<Shell,…>`; nothing else reads them (`git grep contactsReturn\|contactsHide` → this file only) | None |
| 9 | 22-26 | D9 / D8 | 20 mutable closure variables declared on three lines (`uncertain,pendingWrite,writeEpoch,owner,rows,status,readable,…`) | Group into one `session` object (`{list:{rows,status,readable,writable,loading,more,limit,epoch}, write:{pending,epoch,uncertain}, detail:{…}, form}`) | Medium: the Quint manifest pins `epoch`, `loading`, `readable`, `available`, `editor`, `clear` by name (T10) — the manifest/harness must change in the same commit |
| 10 | 98-108, 115-121 | C4 | `save()` and `remove()` share the same write fence: `pendingWrite=true;writeEpoch++;saving=true` / `finally{pendingWrite=false;writeEpoch++;if(unconfirmed)uncertain=true;…}` and the same `token===visit&&owner===ownerAtStart` staleness test | Extract `runWrite(op:()=>Promise<{status}>, settle)` that owns the fence; save/remove keep only their status switch | Medium; ContactsSession witnesses (`SupersededReadWitness`, …) must still replay |
| 11 | 45, 53, 61, 74, 80 | B1 | Five catches: 45 maps any list failure to `'Couldn’t load'` (specified UI copy, keep), 53 toasts (keep), 61 `catch{/* An incomplete or unreadable contact keeps the list fields… */}` (specified, keep), 74/80 fall back to the system editor (specified) | Keep; they are named, specified fallbacks. Replace `throw Error()` at 43 by an explicit branch (`if(!Array.isArray(value.contacts)){fail();return;}`) | None |
| 12 | 10-14 | A7 (export) | `export function contactActs` — no importer outside this file (`git grep contactActs` → only lines 10 and 138) | Drop `export` | None |
| 13 | 131-151 | D8 | Lines up to 460 characters (`model.ed={…}` builds 12 handlers inline) | Format; extract `editorValues(form)` | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 6 | ~60 files (research P4) | `prototype/shell-types.ts` |
| `contacts` (`registerPlugin<any>('AlphaContacts')`) | const | 7 | `agent-adapter.ts:915` | `runtime/contacts-plugin.ts` (typed) |
| `PHONE`, `BUBBLE`, mail path literal | const | 8, 139-140 | `model.js:41,76,77` `IC.phone/bubble/mail` (different paths for phone/mail) | `IC` from `model.js` (or icon names) |
| `contactActs` | helper | 10-14 | none | stays, unexported |
| `PROBLEM` | const | 15 | none (codes from `.eliza/.../native-address-book.ts`) | stays |
| `TYPE_LABEL` | helper | 16 | none found | stays |
| `Editor` | type | 18 | none | stays |
| `blank`, `tidy` | helper | 64, 89 | none | stays |

## Proposed end state
Same file, ~150 lines at current density: `reply=null` (123), `setApi` (28), `export` on `contactActs`, the duplicated icon literals and the `?.` on lifecycle originals go; the plugin is imported typed from `runtime/contacts-plugin.ts`; save/remove share one write-fence helper. After the hook registry (P1) the three prototype patches become registered hooks. After the fixture decision (Q1) the doctored prototype render (125-133) becomes an owner render (~-15 more lines). Est. 150 now, ~135 after Q1.

## Verification
`test/contacts-adapter.test.mjs`, `test/comms-settings.test.mjs`, `test/quint-contacts-session.test.mjs` (ContactsSession replay via `specs/quint/refinement/services/contacts-session-replay.mjs`), `npm run verify`; Android image build (`npm run android:build:local`) because the adapter is Android-only; device acceptance for the address book is separate.
