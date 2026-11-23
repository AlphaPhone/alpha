# D-fix-model-template: review defects in Notes test callers, Previous-notes leftovers, Home date line

Diff base: `a247c0175`. No production behaviour change in any item.

## 1. Android instrumentation callers of removed Notes controls (low, confirmed)

The legacy "Web source linked" and "Recover browser Notes" controls (D1) are gone from template.html and
have no producer, so these waits could never be satisfied.

- `android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserPageQuestionInstrumentedTest.java`:
  deleted `@Test noteWithAWebSourceKeepsItAcrossRecreationAndReopensThatAddress` and the shared helper
  `sourceNoteSurvivesRecreationAndReopens` (with javadoc). Imports and the other helpers (`tap`, `letters`,
  `recordNativeCalls`, `restoreNativeCalls`, `UUID`, `JSONObject`) are still used elsewhere and were kept.
- `JourneyJ05InstrumentedTest.java`: removed the web-source step (comment + call); the class javadoc now
  says the step was removed with D1. The note-id cleanup in `finally` is a harmless no-op and was kept.
- `NotesStorageDurabilityInstrumentedTest.java`: removed the `until(...'Recover browser Notes'...)` wait.
  No absence assertion was added; the button has no template hole at all.

## 2. Previous-notes (D1) leftovers in template / canonical-notes-ui (low, confirmed)

Already applied in the working tree when this unit ran (by a concurrent fix unit): template.html no longer
has the `previousNotesAction` / `previousNotesMenu` block; canonical-notes-ui.ts no longer has the
`notesSourceMode==='legacy'` branch, the constant `notesSourceMode:'canonical'` fields, the
'Previous notes' early return or `withPreviousNotes`; subview-accessibility.ts no longer lists
`previousNotesModal`; agent-adapter.ts no longer reads `notes.previousNotesMenu`. ledger/A2.md now
matches. Verified by grep (`notesSourceMode|previousNotes|Previous notes` absent from those four files).
No further edit here. The optional always-false `trashCanErase` / `trashConfirmOpen` tidy
(subview-accessibility.ts:60,62,75 and canonical-notes-ui.ts:348) was left: it is a separate dead-code tidy.

## 3. Home date line leftovers (low, confirmed)

- `apps/app/src/prototype/phone.css`: deleted the `.home-date-line`, `.home-date-text`, `.home-date-setup`
  rules (no consumer since C-app-18 removed the template blocks).
- `apps/app/src/prototype/data-adapter.ts` `installHomeCardVisibility`: dropped `homeShowDate:false`,
  `homeShowSetup:false`, `homeDateLabel:''`.
- Left in place (optional per finding): `connectGoogle: openGoogle`, the `openGoogle` parameter, the
  argument at main.tsx:191 and the comment at inbox-cloud-adapter.ts:1030. `connectGoogle` has no
  template consumer; removing it touches main.tsx, which this unit does not own.

## Verification

`npx tsc --noEmit`: no errors. Java instrumentation sources not compiled here (no Gradle run).
