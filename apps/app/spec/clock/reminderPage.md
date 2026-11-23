# Reminder page

What the Reminders screen has open above its listing: the detail of one reminder, at most one form
(a new reminder, or an edit of the reminder shown), and at most one Reopen question about the
reminder shown. Android's Back, the gesture and the screen's own Back button close these one at a
time, innermost first, before Back leaves Reminders for the shell. The dialogs other parts own (the
"Create another?" consent of a [creation](./reminders.md), the discard question of a
[kept draft](./reminderDrafts.md) and the question review of a [tapped reminder](./reminderTaps.md))
close before any of these. A change the agent names is applied only to the reminder the owner has
open under that name.

## Story: Step back out of what I have open in Reminders

> As the owner, I want Back to close the question, form or reminder I have open before it leaves
> Reminders, so that Back never throws me out of the app in the middle of something and never
> closes more than one thing at a time.

### The page shows one reminder's detail, at most one form and at most one Reopen question about the reminder shown

A tapped notification or the agent may open another reminder: an edit form or a Reopen question
about the reminder that was shown closes with it, and a new reminder's form stays. Leaving
Reminders closes everything.

```quint
type PageForm = NoForm | NewForm | EditForm
type ReopenAsk = NoReopen | ReopenOpen | ReopenTomorrow
type ReminderPage = { detail: str, form: PageForm, submitted: bool, reopen: ReopenAsk, backs: int }
pure val initial: ReminderPage = { detail: "", form: NoForm, submitted: false, reopen: NoReopen, backs: 0 }
pure val idValues = Set("", "r1", "r2")
pure def formShown(p: ReminderPage, saved: bool): bool = p.form != NoForm and not(p.submitted and saved)
pure def canShowDetail(p: ReminderPage, id: str): bool = id != p.detail
pure def showDetail(p: ReminderPage, id: str): ReminderPage =
  { ...p, detail: id, form: if (p.form == EditForm) NoForm else p.form, submitted: if (p.form == EditForm) false else p.submitted, reopen: NoReopen }
pure def canOpenForm(p: ReminderPage, form: PageForm): bool = form != NoForm and p.reopen == NoReopen and (form == EditForm implies p.detail != "")
pure def openForm(p: ReminderPage, form: PageForm): ReminderPage = { ...p, form: form, submitted: false }
pure def canSubmitForm(p: ReminderPage): bool = p.form != NoForm
pure def submitForm(p: ReminderPage): ReminderPage = { ...p, submitted: true }
pure def canCloseForm(p: ReminderPage): bool = p.form != NoForm
pure def closeForm(p: ReminderPage): ReminderPage = { ...p, form: NoForm, submitted: false }
pure def canAskReopen(p: ReminderPage, mode: ReopenAsk): bool = mode != NoReopen and p.detail != "" and p.reopen == NoReopen
pure def askReopen(p: ReminderPage, mode: ReopenAsk): ReminderPage = { ...p, reopen: mode }
pure def canCloseReopen(p: ReminderPage): bool = p.reopen != NoReopen
pure def closeReopen(p: ReminderPage): ReminderPage = { ...p, reopen: NoReopen }
pure def canLeave(p: ReminderPage): bool = true
pure def leave(p: ReminderPage): ReminderPage = { ...initial, backs: p.backs }
pure def alwaysQuestionsAndEditsNameTheDetail(p: ReminderPage): bool = (p.reopen != NoReopen or p.form == EditForm) implies p.detail != ""
pure def sometimesEditing(p: ReminderPage): bool = p.form == EditForm and p.detail != ""
```

### Back closes the innermost open layer: the Reopen question, then the form, then the detail; with none open it is the shell's

A form whose save the phone confirmed is no longer shown, so Back passes over it. A detail whose
reminder is no longer listed shows the listing, so Back passes over it too.

```quint
pure def canBack(p: ReminderPage, saved: bool, listed: bool): bool =
  p.reopen != NoReopen or formShown(p, saved) or (p.detail != "" and listed)
pure def back(p: ReminderPage, saved: bool, listed: bool): ReminderPage =
  if (p.reopen != NoReopen) { ...p, reopen: NoReopen, backs: p.backs + 1 }
  else if (formShown(p, saved)) { ...p, form: NoForm, submitted: false, backs: p.backs + 1 }
  else { ...p, detail: "", form: NoForm, submitted: false, backs: p.backs + 1 }
pure def stepBackLeavesTheDetailOnlyWhenNothingIsOpenOverIt(before: ReminderPage, via: str, after: ReminderPage): bool =
  (via == "back" and after.detail != before.detail) implies (before.reopen == NoReopen and after.detail == "")
pure def stepBackClosesTheQuestionAlone(before: ReminderPage, via: str, after: ReminderPage): bool =
  (via == "back" and before.reopen != NoReopen) implies (after.form == before.form and after.detail == before.detail)
pure def sometimesBackedOut(p: ReminderPage): bool = p.backs >= 1 and p.detail == ""
pure def sometimesBackClosedTheForm(p: ReminderPage): bool = p.backs >= 1 and p.detail != "" and p.form == NoForm
```

## Story: Let the agent change a reminder I name only once I have it open

> As the owner, I want a reminder change the agent asks for by name to apply only to the reminder
> I have open under that name, so that a similar title never makes the agent change the wrong one.

### A change the agent names is bound to the reminder shown, and only when its title is that name

The phone compares names ignoring surrounding spaces and letter case. With nothing open, or another
reminder open, nothing is chosen and nothing is sent.

```quint
pure val shownTitleValues = Set("", "call the dentist", "pay rent")
pure val nameValues = Set("", "call the dentist")
pure def chosenFor(p: ReminderPage, shownTitle: str, name: str): str =
  if (p.detail != "" and name != "" and shownTitle == name) p.detail else ""
pure def lawNothingIsChosenWithoutADetail(p: ReminderPage, shownTitle: str, name: str): bool =
  p.detail == "" implies chosenFor(p, shownTitle, name) == ""
pure def lawOnlyTheShownReminderIsChosen(p: ReminderPage, shownTitle: str, name: str): bool =
  chosenFor(p, shownTitle, name) == "" or chosenFor(p, shownTitle, name) == p.detail
```
