# Filter my files

The filter the owner sees over [Files](./index.md), and the agent's own
reading of the files, each a read whose late answers are refused. Files
holds it, decides when either may be asked, and matches the filter's text
against each name.

## Story: Filter what I see

> As the owner, I want a filter that says when it is still looking, found
> nothing or could not finish, shows only what matches it in the place I am
> in, and follows me when I go elsewhere.

### A filter is a kind, or any kind, and a text; the search holds the filter on, the place it searched, its reading and what it found, the agent's request that set it, and the agent's own reading

A place is a folder named by its path, or a category.

```quint
import read as R from "../../kit/read"
import shared as F from "./shared"

type Filter = { text: str, kind: F::Kind, anyKind: bool }
type Where = { trail: List[int], inCategory: bool, category: F::Kind }
type Search = {
  filter: Filter, searching: bool, within: Where, query: R::Read, hits: List[F::Item], complete: bool, asker: int,
  peek: R::Read, peeker: int,
}

pure val everything: Filter = { text: "", kind: F::Other, anyKind: true }
pure val top: Where = { trail: List(), inCategory: false, category: F::Other }
pure val initial: Search = {
  filter: everything, searching: false, within: top, query: R::unread, hits: List(), complete: false, asker: 0,
  peek: R::unread, peeker: 0,
}

pure def ofKind(f: Filter, i: F::Item): bool = f.anyKind or i.kind == f.kind
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3)
pure val askerValues = Set(0, 7)
pure val requestValues = Set(7, 8)
pure val wantedValues = Set({ text: "", kind: F::Image, anyKind: false }).union(Set({ text: "b", kind: F::Other, anyKind: true }))
pure val whereValues = Set({ trail: List(1), inCategory: false, category: F::Other }).union(Set({ trail: List(), inCategory: true, category: F::Image }))
pure val entriesValues =
  Set(List())
    .union(Set(List({ id: 2, name: "b", revision: 1, kind: F::Image, volume: 1 }, { id: 3, name: "c", revision: 1, kind: F::Document, volume: 1 })))
```

### A filter is looking, found nothing, found files, found nothing in what the phone could search, or could not finish

A new filter replaces the one before it, and only its own answer is shown,
keeping only what is of its kind; Files keeps only what matches its text.
The phone says whether its search reached every file; a search that did
not is never said to have found nothing.

```quint
type Finding = NoFilter | Looking | Nothing | Found | Unfinished | Trouble

pure def finding(s: Search): Finding =
  if (not(s.searching)) NoFilter
  else if (s.query.status == R::Failed) Trouble
  else if (s.query.status != R::Loaded) Looking
  else if (s.hits.length() > 0) Found
  else if (s.complete) Nothing
  else Unfinished

pure def searchFor(s: Search, wanted: Filter, where: Where, asker: int): Search =
  { ...s, filter: wanted, searching: true, within: where, query: R::ask(s.query), hits: List(), complete: false, asker: asker }

pure def canSearched(s: Search, ticket: int): bool = s.searching and R::canAnswer(s.query, ticket)

pure def searched(s: Search, ticket: int, ok: bool, complete: bool, entries: List[F::Item]): Search =
  { ...s, query: R::answer(s.query, ok), hits: if (ok) entries.select(i => ofKind(s.filter, i)) else List(), complete: ok and complete }

pure def canClearFilter(s: Search): bool = s.searching

pure def clearFilter(s: Search): Search = { ...s, filter: everything, searching: false, query: F::drop(s.query), hits: List(), complete: false, asker: 0 }
```

### A filter on follows the owner to each place, and is asked again there

```quint
pure def follow(s: Search, where: Where): Search =
  if (s.searching) { ...s, within: where, query: R::ask(s.query), hits: List(), complete: false } else { ...s, within: where }
```

### Results shown belong to the filter on, answered, and are of its kind

```quint
pure def alwaysResultsAreOfTheFiltersKind(s: Search): bool =
  s.hits.every(i => ofKind(s.filter, i)) and (s.hits.length() > 0 implies (s.searching and s.query.status == R::Loaded))
```

### The agent reads for itself, and only its newest reading is answered

```quint
pure def agentLook(s: Search, request: int): Search = { ...s, peek: R::ask(s.peek), peeker: request }

pure def canAgentLooked(s: Search, ticket: int): bool = R::canAnswer(s.peek, ticket)

pure def agentLooked(s: Search, ticket: int, ok: bool): Search = { ...s, peek: R::answer(s.peek, ok) }
```

### Leaving drops the filter's results and every reading under way

```quint
pure def stop(s: Search): Search =
  { ...s, searching: false, query: F::drop(s.query), hits: List(), complete: false, asker: 0, peek: F::drop(s.peek), peeker: 0 }

pure def stepStoppingLeavesNothingToAnswer(before: Search, via: str, after: Search): bool =
  via == "stop" implies (after.query.status != R::Loading and after.peek.status != R::Loading and after.hits.length() == 0)
```

### A filter can find nothing, find files, fail to finish, and be the agent's, and the agent can have read

```quint
pure def sometimesTheFilterFoundNothing(s: Search): bool = finding(s) == Nothing
pure def sometimesTheFilterFoundFiles(s: Search): bool = finding(s) == Found and not(s.filter.anyKind)
pure def sometimesTheFilterCouldNotFinish(s: Search): bool = finding(s) == Trouble
pure def sometimesTheSearchWasCutShort(s: Search): bool = finding(s) == Unfinished
pure def sometimesTheAgentSetTheFilter(s: Search): bool = finding(s) == Found and s.asker != 0
pure def sometimesTheAgentRead(s: Search): bool = s.peek.status == R::Loaded and s.searching
```
