# Workflows place

Where the owner is inside Workflows: the list, one automation, one workflow with its runs, or the
digest panel, and the one sheet or review open over it. Android's Back closes what is open before
it returns to the list, and only Back at the bare list leaves Workflows (legacy `alpha-back`
handlers of the Workflows screen and its Clock draft, d73500a). A route the shell or a notice
opens replaces the place, and every refresh or reset of the run view moves its generation, so that
a notice read under the old view is read again (the clock area's workflow notices; #39954).

## Domain

### The place holds the view, what it shows, the open overlay and the view's generation

```quint
type PlaceView = ListView | AutomationView | WorkflowView | DigestsView
type Overlay = NoOverlay | AddingOverlay | PromptOverlay | DraftOverlay | SourcesOverlay | RemovalOverlay | RunNowOverlay
type Place = { view: PlaceView, target: str, overlay: Overlay, generation: int }
pure val initial: Place = { view: ListView, target: "", overlay: NoOverlay, generation: 0 }
```

### What the simulator tries

```quint
pure val viewValues = Set(ListView, AutomationView, WorkflowView, DigestsView)
pure val targetValues = Set("", "w1", "w2")
pure val overlayValues = Set(NoOverlay, AddingOverlay, PromptOverlay, DraftOverlay, SourcesOverlay, RemovalOverlay, RunNowOverlay)
pure val generationValues = Set(0, 1)
```

## Story: Move inside Workflows and come back with Back

> As the owner, I open an automation, a workflow or the digests, and a sheet over them, and I want
> Back to close the sheet first, then return me to the list, and only then leave Workflows.

### Showing a view replaces the place and moves the generation; the list names nothing and a nested view names its item

The digest panel may name the one result it opened, or none.

```quint
pure def canShow(p: Place, view: PlaceView, target: str): bool =
  if (view == ListView) target == "" else if (view == DigestsView) true else target != ""
pure def show(p: Place, view: PlaceView, target: str): Place = { view: view, target: target, overlay: NoOverlay, generation: p.generation + 1 }
pure def alwaysTheListNamesNothing(p: Place): bool = p.view == ListView implies p.target == ""
pure def alwaysANestedViewNamesItsItem(p: Place): bool = (p.view == AutomationView or p.view == WorkflowView) implies p.target != ""
```

### One overlay at a time; Run now opens only over the digests, and a Google removal review over the sources sheet

```quint
pure def canOpenOverlay(p: Place, overlay: Overlay): bool =
  overlay != NoOverlay and overlay != p.overlay and (overlay != RunNowOverlay or p.view == DigestsView) and
  (overlay != RemovalOverlay or p.overlay == SourcesOverlay)
pure def openOverlay(p: Place, overlay: Overlay): Place = { ...p, overlay: overlay }
pure def canCloseOverlay(p: Place): bool = p.overlay != NoOverlay
pure def closeOverlay(p: Place): Place = { ...p, overlay: if (p.overlay == RemovalOverlay) SourcesOverlay else NoOverlay }
pure def alwaysRunNowIsOverTheDigests(p: Place): bool = p.overlay == RunNowOverlay implies p.view == DigestsView
```

### Back closes the overlay first, then returns to the list; at the bare list Back is the shell's

```quint
pure def canBack(p: Place): bool = p.overlay != NoOverlay or p.view != ListView
pure def back(p: Place): Place =
  if (p.overlay != NoOverlay) closeOverlay(p) else { ...p, view: ListView, target: "", generation: p.generation + 1 }
pure def lawBackAtTheBareListIsTheShells(generation: int): bool =
  not(canBack({ view: ListView, target: "", overlay: NoOverlay, generation: generation }))
pure def stepBackWithAnOverlayKeepsTheView(before: Place, via: str, after: Place): bool =
  (via == "back" and before.overlay != NoOverlay) implies (after.view == before.view and after.target == before.target)
pure def sometimesASheetOverAWorkflow(p: Place): bool = p.overlay != NoOverlay and p.view == WorkflowView
```

## Story: Have a notice reread when the run view moves

> As the owner, I want a notice that was read while the run view showed something else to be read
> again once the view refreshed or reset, so that it opens the run I am now looking at.

### Refreshing the open workflow and leaving Workflows move the generation, which never goes back

```quint
pure def canRefresh(p: Place): bool = p.view == WorkflowView
pure def refresh(p: Place): Place = { ...p, generation: p.generation + 1 }
pure def canLeave(p: Place): bool = true
pure def leave(p: Place): Place = { view: ListView, target: "", overlay: NoOverlay, generation: p.generation + 1 }
pure def stepTheGenerationNeverGoesBack(before: Place, via: str, after: Place): bool = after.generation >= before.generation
pure def sometimesRefreshed(p: Place): bool = p.view == WorkflowView and p.generation >= 2
```
