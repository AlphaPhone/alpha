# Appearance

Light, dark or the system's choice, and legible text, kept on the phone. Android's WebView reports
the system scheme; another tab of the browser build reports a change it saved.

## Story: Choose how Alpha looks

> As the owner, I choose light, dark or my phone's setting and turn on legible text, and Alpha
> looks that way now and after a restart.

### A new phone is light, follows nothing else, and uses the ordinary type

```quint
type Choice = FollowSystem | Light | Dark
type Preview = NoPreview | PreviewLight | PreviewDark
type Appearance = { choice: Choice, saved: Choice, systemDark: bool, legible: bool, savedLegible: bool, unsaved: bool, preview: Preview, mocks: bool }
pure val initial: Appearance = { choice: Light, saved: Light, systemDark: false, legible: false, savedLegible: false, unsaved: false, preview: NoPreview, mocks: false }
pure val aValues = Set(initial).union(Set({ ...initial, mocks: true }))
```

### The theme is the choice, or the system's scheme when the choice follows it

A preview, which only a build with test mocks can show, wins until the next choice.

```quint
pure def dark(a: Appearance): bool =
  if (a.preview == PreviewDark) true else if (a.preview == PreviewLight) false
  else if (a.choice == FollowSystem) a.systemDark else a.choice == Dark
pure def lawFollowingTheSystemMatchesIt(a: Appearance): bool =
  ({ ...a, choice: FollowSystem, preview: NoPreview }).systemDark == dark({ ...a, choice: FollowSystem, preview: NoPreview })
```

### A choice applies at once, and one whose save failed still applies for the session

The saved choice is unchanged by a failed save, so a restart returns to it, and Display says the
theme was not saved.

```quint
pure def choose(a: Appearance, choice: Choice): Appearance = { ...a, choice: choice, preview: NoPreview, unsaved: true }
pure def setLegible(a: Appearance, on: bool): Appearance = { ...a, legible: on, unsaved: true }
pure def canSaved(a: Appearance): bool = a.unsaved
pure def saved(a: Appearance): Appearance = { ...a, saved: a.choice, savedLegible: a.legible, unsaved: false }
pure def canSaveFailed(a: Appearance): bool = a.unsaved
pure def saveFailed(a: Appearance): Appearance = { ...a, unsaved: false }
pure def restart(a: Appearance): Appearance =
  { ...a, choice: a.saved, legible: a.savedLegible, unsaved: false, preview: NoPreview }
pure def notSaved(a: Appearance): bool = not(a.unsaved) and (a.choice != a.saved or a.legible != a.savedLegible)
pure def sometimesAFailedSaveStillApplies(a: Appearance): bool = not(a.unsaved) and a.choice != a.saved
pure def stepARestartReturnsToTheSavedChoice(before: Appearance, via: str, after: Appearance): bool =
  via == "restart" implies after.choice == before.saved
```

### The system's scheme and another tab's saved choice are followed as they change

A choice another tab saved is applied as saved, so it is never written back. In the browser build a
change of the saved value in another tab, or the page shown again, reads it.

```quint
pure def systemChanged(a: Appearance, systemDark: bool): Appearance = { ...a, systemDark: systemDark }
pure def canRestored(a: Appearance, choice: Choice, legible: bool): bool = not(a.unsaved)
pure def restored(a: Appearance, choice: Choice, legible: bool): Appearance =
  { ...a, choice: choice, saved: choice, legible: legible, savedLegible: legible, preview: NoPreview }
pure def sometimesFollowingADarkSystem(a: Appearance): bool = a.choice == FollowSystem and dark(a)
```

### Only a build with test mocks can preview a theme it does not save

The page's `theme` query, `light` or `dark`, starts such a build on that preview.

```quint
pure def canPreviewTheme(a: Appearance, preview: Preview): bool = a.mocks and preview != NoPreview
pure def previewTheme(a: Appearance, preview: Preview): Appearance = { ...a, preview: preview }
pure def alwaysPreviewOnlyWithTestMocks(a: Appearance): bool = a.preview != NoPreview implies a.mocks
pure def stepTheMocksGateNeverChanges(before: Appearance, after: Appearance): bool = after.mocks == before.mocks
```

### Android's status and navigation bars follow the theme Alpha draws

On the phone Settings tells Android the theme each time the drawn theme changes, and never twice in a
row for the same theme; a browser has no bars to tell.

```quint
pure def barsDark(a: Appearance): bool = dark(a)
pure def lawTheBarsFollowTheTheme(a: Appearance): bool = barsDark(a) == dark(a)
```
