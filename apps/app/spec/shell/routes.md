# Routes

The owner route table is shared by the renderer and Android's request gate: Android ships it as an
asset, byte for byte what the renderer serializes, and the APK check compares the bytes. It lists
the resident routes a renderer may call on the owner's behalf, in four groups: records (notes and
the calendar), automations (workflows, reminders, scheduled tasks and triggers), telephony (the
reply draft) and approvals. Domain validation and mutation authority stay in the agent's services;
the table only decides whether a request may cross the bridge.

```quint
type RouteCheck = { owner: bool, unsafe: bool, claimed: bool, method: bool, path: bool, query: bool, id: bool }
```

## Story: Let only my own app reach my agent's records

> As the owner, I want the requests that reach my agent's records from the phone's renderer to be
> the exact ones Alpha makes, on my behalf, and nothing shaped to slip past.

### A claimed route crosses only with a verified owner, an allowed method and path, its own query keys and a well-formed id

The longest prefix that claims a path wins. A path with an unsafe character (a backslash, `#`,
whitespace or a Unicode space) is refused before anything else; every request needs the verified
owner.

```quint
pure def crosses(c: RouteCheck): bool =
  c.owner and not(c.unsafe) and (not(c.claimed) or (c.method and c.path and c.query and c.id))
pure val cValues = Set(
  { owner: true, unsafe: false, claimed: true, method: true, path: true, query: true, id: true },
  { owner: false, unsafe: false, claimed: true, method: true, path: true, query: true, id: true },
  { owner: true, unsafe: true, claimed: false, method: false, path: false, query: false, id: false },
  { owner: true, unsafe: false, claimed: true, method: true, path: true, query: false, id: true })
pure def lawEveryRequestNeedsTheOwner(c: RouteCheck): bool = crosses(c) implies c.owner
pure def lawAClaimedRouteMatchesExactly(c: RouteCheck): bool =
  (crosses(c) and c.claimed) implies (c.method and c.path and c.query and c.id and not(c.unsafe))
```

### Only the plain, owner-scoped navigation preparation crosses for views

`POST /api/views/<id>/navigate` with a body of exactly `clientId`, `delivery: "completed-action"`,
`prepareOnly: true`, `viewType: "gui"` and `completedActionHandoffId`, each id within its
character set and 128 characters.

```quint
pure def preparedNavigation(post: bool, plainPath: bool, exactKeys: bool, completedAction: bool, prepareOnly: bool,
  gui: bool, idsWellFormed: bool): bool =
  post and plainPath and exactKeys and completedAction and prepareOnly and gui and idsWellFormed
pure def lawOnlyPreparationCrosses(plainPath: bool, exactKeys: bool, gui: bool, idsWellFormed: bool): bool =
  not(preparedNavigation(true, plainPath, exactKeys, true, false, gui, idsWellFormed))
```
