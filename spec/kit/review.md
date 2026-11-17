# Review

Before Alpha does something that matters, the owner is shown it and
confirms. What is confirmed must be what was shown: if the thing changes
while the review is open, the review no longer counts.

## Story: Confirm what was shown

> As the owner, I want my confirmation to apply only to what I was shown,
> and only once.

### A review remembers which revision of the thing it showed

```quint
type Review = { showing: bool, revision: int, shown: int }

pure val unreviewed: Review = { showing: false, revision: 0, shown: 0 }
```

### The thing under review can change at any time

```quint
pure def revise(r: Review): Review = { ...r, revision: r.revision + 1 }
```

### Showing the review shows the thing as it is now

```quint
pure def present(r: Review): Review = { ...r, showing: true, shown: r.revision }

pure def dismiss(r: Review): Review = { ...r, showing: false }
```

### Only an open review of the thing as it is now can be confirmed, and confirming closes it

```quint
pure def canConfirm(r: Review): bool = r.showing and r.shown == r.revision

pure def confirm(r: Review): Review = { ...r, showing: false }
```

### A thing that changed after it was shown is not confirmed

```quint
pure def lawAChangeVoidsTheReview(revision: int): bool =
  not(canConfirm(revise(present({ showing: false, revision: revision, shown: 0 }))))
```

### A confirmation is spent

```quint
pure def lawAConfirmationIsSpent(revision: int): bool =
  not(canConfirm(confirm(present({ showing: false, revision: revision, shown: 0 }))))
```
