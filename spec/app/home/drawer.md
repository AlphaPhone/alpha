# Search in Apps

The Apps drawer owns its search text while it shows. The shell owns the
drawer route and Home owns what was read from the phone.

## Story: Find an installed app by name

> As the owner, I want to find the app I am looking for by its name or
> package and leave the drawer without keeping the search.

### The drawer's search starts empty

```quint
type Drawer = { query: str }

pure val initial: Drawer = { query: "" }
pure val queryValues = Set("", "clock", "notes")
```

### The search can change while Apps shows, and it clears when Apps closes

```quint
pure def canSearch(d: Drawer, query: str, open: bool): bool = open and query != d.query

pure def search(d: Drawer, query: str, open: bool): Drawer = { query: query }

pure def canClear(d: Drawer): bool = d.query != ""

pure def clear(d: Drawer): Drawer = initial
```
