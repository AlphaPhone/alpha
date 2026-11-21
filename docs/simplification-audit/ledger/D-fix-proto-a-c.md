# D-fix-proto-a-c: fixes for confirmed review defects (prototype / browser)

Base: develop a247c0175. Reference for the restored deletions: branch commit 496f78e36.

## 1. workflow-dated-sources.ts: `api.localWorkflowNotes is not a function` (merge damage): FIXED

Re-checked: HEAD had develop's file verbatim. It called `api.localWorkflowNotes` twice, and apps/app/src
no longer defines it. On develop, in canonical mode, the definition always threw
'Reopen Notes before running this step.'

Fix (apps/app/src/browser/workflow-dated-sources.ts):
- "today's notes" now throws `Error('Reopen Notes before running this step.')`.
- The combined "calendar, notes and sent mail" labels still read the calendar first (develop's order)
  and then throw the same refusal instead of reading notes.
- Removed the `range` local. Only the deleted notes/sent-mail return used it.
The labels stay in the accepted list, so they cannot fall through to a calendar-only range.

## 2 and 4. canonical-notes-ui.ts: Previous-notes code reverted by the merge / dead D1 code: FIXED

Re-checked: nothing in apps/app/src writes `notesSourceMode` or `notesSourceOptions`. That makes three
pieces unreachable: the legacy early return, the 'Previous notes' title branch and `withPreviousNotes`.
496f78e36 had none of them. They have no behavioural effect. Restored 496f78e36's shape:
- `CanonicalNotesUi.api`: dropped `notesSourceMode:'canonical',notesTrash:undefined,moveNoteToTrash:undefined`.
  No other api writes `moveNoteToTrash` or `notesTrash`, so the spread value is undefined anyway.
- `prototype.api`: dropped the "Agent Notes are the default source" comment and the legacy return. The
  waiting decorator returns `{...value,moveNoteToTrash:()=>false,set:...}`.
- `notes.render`: now `const ui=value.canonicalNotes;`, with no Previous-notes branch and no
  `withPreviousNotes`. The waiting view drops `browserRecovery:false` and `canImportText:false`; the
  Notes template reads neither.
- template.html: removed the `notes.previousNotesAction` options button and the `notes.previousNotesMenu` popup.
- subview-accessibility.ts: removed the `previousNotesModal` entry.
- agent-adapter.ts: removed `notes.previousNotesMenu||` from the covered-view check.
Finding 4 suggested keeping `notesSourceMode:'canonical'`. I did not, because finding 2's fuller
496f78e36 restoration supersedes it and nothing reads the field.

## 3. agent-adapter.ts: Notes change refusal lost "nothing was changed": FIXED (narrow)

Re-checked: develop's change refusal always told the owner that nothing was changed. HEAD's
'Reviewing this device-record change isn’t available' did not, unlike its two sibling refusals.
Fix: the summary is now 'Reviewing this device-record change isn’t available. Nothing was changed.'

Left unchanged:
- The query and create_note strings stay as they are until the owner settles Q-NOTES-2.
- `previousNotesRefusal('canonical',…)` was not restored. Its copy ("…because Notes is not set to
  On this phone") points to the Notes source setting, which this branch deletes.
- `previousNotesRefusal` and `OWN_REFUSALS` in ui/notes/notes-action-messages.ts now have no production
  caller. That is dead code to remove later, not a behaviour defect.

Note: A2.md:22 misquotes develop's text as "Select Previous notes…". Develop actually said "Nothing
was X because Notes is not set to On this phone." or "There are no earlier notes on this phone, so
nothing was X." I did not edit A2.md because it belongs to another unit.

## Verification
- `npx tsc --noEmit`: exit 0, no errors.
- `bun scripts/run-tests.ts` over the 83 non-quint unit test files that mention notes, agent-adapter,
  template or subviews: 739 pass, 1 fail. The failure is ui-self-contained.test.mjs, "no source, script,
  spec, test or document refers to upstream UI". It flags files under docs/simplification-audit/ that
  mention upstream UI. No file touched here is involved.
- Quint suites, browser tests and the Android build were not run.
