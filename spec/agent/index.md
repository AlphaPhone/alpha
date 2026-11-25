# Alpha's agent pack

The resident agent the phone runs is eliza's: `agent.mjs`, built by
`buildAgentBundle` of `@elizaos/agent/bundle` from the commit `eliza.lock.json`
pins, and started by eliza's Android agent service from three data files
(`spec/os/agentService/config.md` in eliza). What the bundle may hold, how its
manifest is written and read, and what it refuses are eliza's
(`spec/agent/plugins/bundle.md`); how a launch is read, which keys it refuses
and with which exit code are eliza's too (`spec/agent/host/launch.md`,
`spec/agent/host/process.md`), as is the route gate (`spec/agent/access/routes.md`).
This spec holds only what Alpha decides: who the agent is, which of eliza's
plugins the bundle carries and which of the agent's own modules the launch
loads, as the old phone's agent did, which actions it may run, which routes
the page may reach, that it remembers, which cloud model it asks, which
workflow worker it pins, and which host services the phone does not give the
plugins yet. `apps/agent` builds the pack into `apps/agent/dist/bundle` and
checks it against these rules (`node dist/src/main.js build --env <staging|production>`,
then `check`).

## Story: Run Alpha's agent on the phone

> As the owner, I want the agent on my phone to be Alpha, to answer me
> through my cloud account, to do what the old phone's agent did with my
> calendar, mail, notes, files, workflows, maps and browser, to remember our
> conversation when it restarts, and to be reachable from the page only
> where the page needs it.

### The agent is Alpha, made by Alpha Compute, with a system prompt

The name is the product's character name, `identity.characterName` of the
old product record (`legacy/apps/app/src/product/alpha-product-registration.ts`),
and the bio is the one the old agent was given
(the old tree's agent identity script at `26e827f06`, line 14). The old agent had no system
prompt of its own and kept its preset's origin line, "{{name}}, made by Alpha
Compute" (line 10); eliza's launch needs one, so that line, with the name, is
its start. eliza's tools, notes and results name the person in the
conversation "the owner", which the model repeated back to them, so the
prompt also tells the agent to speak to that person as "you", never as "the
owner" or "the user". The words are in `apps/agent/host/character.json`.

```quint
pure val characterName: str = "Alpha"
pure def characterAdmitted(name: str, system: str): bool = name == characterName and system != ""
```

### The pack carries the plugins the old phone's agent loaded, under the pinned eliza's names, and the launch loads them with the agent's own modules the old agent had

The old phone (Alpha develop `bd70db55b2b`, eliza `17116b70e6`) loaded eliza's
mobile plugin set: its core group (personal assistant with reminders, goals
and todos, calendar, inbox, notes, files on the device, workflows) and its
view group (maps, browser) (`packages/agent/src/runtime/core-plugins.ts` there,
`MOBILE_CORE_PLUGINS` and `MOBILE_VIEW_PLUGINS`). The pinned eliza names them
`@elizaos/plugin-personal-assistant` (whose reminders, goals and todos are
its own subpaths now), `-calendar`, `-inbox`, `-notes`, `-files`,
`-workflow`, `-maps` and `-browser`, and the pack carries each in the same
group. Notes exports no plugin, only a module the entry builds
(`notesModule`), so it is hosted rather than bundled. Scheduling is now the
agent's own `scheduled-tasks`, `tasks` and `triggers` modules; the
proposal of a device step is its `device-actions` module, and a drafted
reply its `reply-draft`; approvals, notifications, views and the task
surface are modules too, and the launch loads each. SQL storage is the
agent's fixed storage, which no launch lists. What the old phone loaded
and the pack does not: vision, whose `sharp` eliza never ships on a device;
the agent orchestrator's view and the mobile remote target, which the
pinned eliza does not have; the OpenAI and Eliza Cloud provider plugins,
because the model is the launch's own cloud model; local inference, which
waits on the owner's choice of model and embeddings; and `basic-actions`,
whose only action is the calculator the old agent never had.

```quint
pure val corePlugins: List[str] = List("@elizaos/plugin-personal-assistant", "@elizaos/plugin-calendar", "@elizaos/plugin-inbox", "@elizaos/plugin-notes", "@elizaos/plugin-files", "@elizaos/plugin-workflow")
pure val viewPlugins: List[str] = List("@elizaos/plugin-maps", "@elizaos/plugin-browser")
pure val hostedPlugins: List[str] = List("@elizaos/plugin-notes")
pure val packedPlugins: List[str] = List("@elizaos/plugin-personal-assistant", "@elizaos/plugin-calendar", "@elizaos/plugin-inbox", "@elizaos/plugin-notes", "@elizaos/plugin-files", "@elizaos/plugin-workflow", "@elizaos/plugin-maps", "@elizaos/plugin-browser")
pure val bundledPlugins: List[str] = List("@elizaos/plugin-personal-assistant", "@elizaos/plugin-calendar", "@elizaos/plugin-inbox", "@elizaos/plugin-files", "@elizaos/plugin-workflow", "@elizaos/plugin-maps", "@elizaos/plugin-browser")
pure val agentModules: List[str] = List("@elizaos/agent/device-actions", "@elizaos/agent/reply-draft", "@elizaos/agent/approvals", "@elizaos/agent/notifications", "@elizaos/agent/views", "@elizaos/agent/scheduled-tasks", "@elizaos/agent/tasks", "@elizaos/agent/triggers", "@elizaos/agent/surface")
pure val loadList: List[str] = List("@elizaos/plugin-personal-assistant", "@elizaos/plugin-calendar", "@elizaos/plugin-inbox", "@elizaos/plugin-notes", "@elizaos/plugin-files", "@elizaos/plugin-workflow", "@elizaos/plugin-maps", "@elizaos/plugin-browser", "@elizaos/agent/device-actions", "@elizaos/agent/reply-draft", "@elizaos/agent/approvals", "@elizaos/agent/notifications", "@elizaos/agent/views", "@elizaos/agent/scheduled-tasks", "@elizaos/agent/tasks", "@elizaos/agent/triggers", "@elizaos/agent/surface")
pure def lawPackListsAreConsistent(p: str): bool =
  (packedPlugins.includes(p) iff (corePlugins.includes(p) or viewPlugins.includes(p)))
    and (bundledPlugins.includes(p) iff (packedPlugins.includes(p) and not(hostedPlugins.includes(p))))
    and (loadList.includes(p) iff (packedPlugins.includes(p) or agentModules.includes(p)))
```

### The agent may run the actions the old phone's agent ran plus Alpha's Clock and Reminders actions, and every other action the bundle registers is listed as refused with its reason

The old agent had no allowlist: every action its plugins registered could
run. The pack's plugins register those same actions under the pinned
eliza's names, and Alpha's `alpha-apps` product plugin registers
`CLOCK_ALARM`, `CLOCK_TIMER`, `CLOCK_WORLD` and `REMINDERS_MANAGE`. The
policy names `alpha-apps` as its product plugin and allows each action by
name, so an action a later pin adds is refused until it is reviewed here.
Core's `REPLY`, `IGNORE` and `NONE` are always allowed. Every other
registered action is named in the policy's refused list with the reason the
old phone did not run it: `CALCULATE` because the old agent had no
calculator.

```quint
pure val productPluginName: str = "alpha-apps"
pure val coreActions: List[str] = List("REPLY", "IGNORE", "NONE")
pure val alphaAppActions: List[str] = List("CLOCK_ALARM", "CLOCK_TIMER", "CLOCK_WORLD", "REMINDERS_MANAGE")
pure val allowedActions: List[str] = List(
  "REPLY", "IGNORE", "NONE",
  "OWNER_REMINDERS", "OWNER_GOALS", "TODO", "OWNER_ROUTINES", "BRIEF",
  "CALENDAR",
  "INBOX_READ", "INBOX_COMPOSE_EMAIL",
  "WORKFLOW",
  "MAPS_PLACE", "MAPS_WHERE_AM_I", "MAPS_ROUTE", "MAPS_NAVIGATION_START", "MAPS_NAVIGATION_REROUTE", "MAPS_NAVIGATION_STOP",
  "MAPS_SELECT", "MAPS_SAVE", "MAPS_SHARE", "MAPS_COVERAGE", "MAPS_SAVED",
  "BROWSER", "BROWSER_BACK", "BROWSER_FORWARD", "BROWSER_RELOAD",
  "NOTES_LIST", "NOTES_GET", "NOTES_CREATE", "NOTES_UPDATE", "NOTES_DELETE", "NOTES_RESTORE", "NOTES_MOVE",
  "PROPOSE_DEVICE_ACTION", "VIEWS",
  "CLOCK_ALARM", "CLOCK_TIMER", "CLOCK_WORLD", "REMINDERS_MANAGE"
)
pure def lawCoreActionsAreAlwaysAllowed(a: str): bool = coreActions.includes(a) implies allowedActions.includes(a)
pure def sameNames(a: List[str], b: List[str]): bool =
  a.length() == b.length() and a.every(x => b.includes(x)) and b.every(x => a.includes(x))
pure def refusedActions(registered: List[str]): List[str] = registered.select(a => not(allowedActions.includes(a)))
pure def policyAdmitted(allowed: List[str], refused: List[str], loaded: List[str], product: str, registered: List[str]): bool =
  sameNames(allowed, allowedActions) and sameNames(refused, refusedActions(registered)) and loaded == loadList and product == productPluginName
```

### A proposed device step goes through eliza's device-action module, and the phone says which steps it takes

The old agent asked the phone to do things on the device (create an event,
save a note, call, text, open a page) by proposing a step the owner
reviews. The pack loads eliza's `device-actions` and `reply-draft` modules
and allows `PROPOSE_DEVICE_ACTION`. Which steps the phone takes, and which
the old phone withheld (`notes.organize.v1` and the telephony contact
lookup), is the phone's capability offer (`spec/app/platform/index.md`,
`spec/app/telephony/actions.md`), not the agent's policy.

```quint
pure val deviceActionModules: List[str] = List("@elizaos/agent/device-actions", "@elizaos/agent/reply-draft")
pure val proposalAction: str = "PROPOSE_DEVICE_ACTION"
pure def proposalsAdmitted(loaded: List[str], allowed: List[str]): bool =
  deviceActionModules.every(m => loaded.includes(m)) and allowed.includes(proposalAction)
```

### The page reaches exactly the routes its platform services call, and nothing else

The page's agent service (`apps/app/src/platform/agent.vibe`) on the phone
goes through eliza's `ElizaAgent` plugin, which checks each request against
the host file's route list. Ask Alpha opens its conversation with
`POST /api/conversations` (`apps/app/src/ask/ask.vibe`), and eliza's
`TurnController`, which carries its turns, posts each message buffered or
streamed and asks the agent to stop a turn by its room. The assistant
(`apps/app/src/assistant/assistant.vibe`) lists conversations, reads a
conversation's messages, forks one, searches messages, asks the agent's
health and which device steps it takes; Home and Calendar
(`apps/app/src/home/cards.vibe`, `apps/app/src/calendar/agent.vibe`) read the
calendar feed and the calendars and create, change, answer and delete
events through the calendar plugin. Workflows reads the owner identity,
active and removed workflows, prompts, scheduled tasks and the runs of a
prompt. The approvals area lists the agent's proposals and resolves one
through the approvals module. A route an area
fakes for want of an agent plugin is not listed: none does today. Each line
of `apps/agent/host/routes.jsonl` is one route; the pack is refused unless
that list is this one, and eliza's route gate admits each of its routes.

```quint
type Method = Get | Post | Put | Patch | Delete
type Route = { method: Method, path: str, stream: bool }
pure val pageRoutes: List[Route] = List(
  { method: Get, path: "/api/health", stream: false },
  { method: Get, path: "/api/status", stream: false },
  { method: Post, path: "/api/conversations", stream: false },
  { method: Get, path: "/api/conversations", stream: false },
  { method: Get, path: "/api/conversations/messages/search", stream: false },
  { method: Get, path: "/api/conversations/{id}/messages", stream: false },
  { method: Post, path: "/api/conversations/{id}/messages", stream: false },
  { method: Post, path: "/api/conversations/{id}/messages/stream", stream: true },
  { method: Post, path: "/api/conversations/{id}/fork", stream: false },
  { method: Post, path: "/api/turns/{roomId}/abort", stream: false },
  { method: Get, path: "/api/client-devices/capabilities", stream: false },
  { method: Post, path: "/api/client-devices/register", stream: false },
  { method: Get, path: "/api/client-devices/context", stream: false },
  { method: Get, path: "/api/client-devices/proposals", stream: false },
  { method: Post, path: "/api/client-devices/proposals/{id}/decision", stream: false },
  { method: Post, path: "/api/client-devices/proposals/{id}/claim", stream: false },
  { method: Post, path: "/api/client-devices/proposals/{id}/receipt", stream: false },
  { method: Post, path: "/api/client-devices/proposals/{id}/reconciliation", stream: false },
  { method: Get, path: "/api/approvals", stream: false },
  { method: Post, path: "/api/approvals/{id}/resolve", stream: false },
  { method: Get, path: "/api/lifeops/calendar/feed", stream: false },
  { method: Get, path: "/api/lifeops/calendar/calendars", stream: false },
  { method: Post, path: "/api/lifeops/calendar/events", stream: false },
  { method: Patch, path: "/api/lifeops/calendar/events/{eventId}", stream: false },
  { method: Delete, path: "/api/lifeops/calendar/events/{eventId}", stream: false },
  { method: Post, path: "/api/lifeops/calendar/events/{eventId}/response", stream: false },
  { method: Get, path: "/api/notifications", stream: false },
  { method: Post, path: "/api/notifications/{id}/read", stream: false },
  { method: Get, path: "/api/scheduled-tasks", stream: false },
  { method: Get, path: "/api/alpha/clock", stream: false },
  { method: Put, path: "/api/alpha/clock", stream: false },
  { method: Post, path: "/api/alpha/clock/alarms", stream: false },
  { method: Patch, path: "/api/alpha/clock/alarms/{id}", stream: false },
  { method: Delete, path: "/api/alpha/clock/alarms/{id}", stream: false },
  { method: Post, path: "/api/alpha/clock/alarms/{id}/snooze", stream: false },
  { method: Post, path: "/api/alpha/clock/alarms/{id}/dismiss", stream: false },
  { method: Post, path: "/api/alpha/clock/timers", stream: false },
  { method: Patch, path: "/api/alpha/clock/timers/{id}", stream: false },
  { method: Delete, path: "/api/alpha/clock/timers/{id}", stream: false },
  { method: Post, path: "/api/alpha/clock/world", stream: false },
  { method: Delete, path: "/api/alpha/clock/world/{id}", stream: false },
  { method: Get, path: "/api/alpha/reminders", stream: false },
  { method: Post, path: "/api/alpha/reminders/lists", stream: false },
  { method: Patch, path: "/api/alpha/reminders/lists/{id}", stream: false },
  { method: Delete, path: "/api/alpha/reminders/lists/{id}", stream: false },
  { method: Post, path: "/api/alpha/reminders/items", stream: false },
  { method: Patch, path: "/api/alpha/reminders/items/{id}", stream: false },
  { method: Delete, path: "/api/alpha/reminders/items/{id}", stream: false },
  { method: Post, path: "/api/alpha/reminders/items/{id}/complete", stream: false },
  { method: Post, path: "/api/alpha/reminders/items/{id}/reopen", stream: false },
  { method: Post, path: "/api/alpha/reminders/items/{id}/snooze", stream: false },
  { method: Post, path: "/api/alpha/reminders/items/{id}/restore", stream: false },
  { method: Get, path: "/api/auth/me", stream: false },
  { method: Get, path: "/api/workflow/workflows", stream: false },
  { method: Get, path: "/api/workflow/removed-workflows", stream: false },
  { method: Get, path: "/api/triggers", stream: false },
  { method: Get, path: "/api/triggers/{id}/runs", stream: false },
)
pure def admitted(listed: List[Route], r: Route): bool = listed.includes(r)
pure def routeListAdmitted(listed: List[Route]): bool =
  listed.length() == pageRoutes.length() and listed.every(r => pageRoutes.includes(r)) and pageRoutes.every(r => listed.includes(r))
```

### The agent keeps its memory across restarts, without embeddings

The old agent kept its history when it restarted, so the launch asks the
agent to persist its store. The old phone embedded memory on the device
with local inference; whether the pack does the same waits on the owner's
choice of model and embeddings, and until then memory is kept without
embeddings.

```quint
pure val persistMemory: bool = true
pure val localEmbeddings: bool = false
```

### The agent swaps the owner's secrets and personal details out of what it sends the cloud

The old agent was launched with eliza's secret swap and personal-detail
swap on (`legacy/android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java`,
`ELIZA_SECRET_SWAP_ENABLED` and `ELIZA_PII_SWAP_ENABLED`), so a key, a
number or an address the owner writes reaches the model only as a stable
reference. The launch asks eliza's privacy service for both.

```quint
pure val secretSwap: bool = true
pure val personalDetailSwap: bool = true
pure def privacyAdmitted(secrets: bool, details: bool): bool = secrets == secretSwap and details == personalDetailSwap
```

### The agent changes the owner's mail and calendar through Google only where the launch consents, and the pack's host file consents to neither

eliza's launch carries the owner's consent for the agent to change Gmail
and to edit Google Calendar (`spec/agent/host/launch.md`, `google`), off
unless named. The pack's host file consents to neither. The owner's own
choice in Settings replaces it at each launch once the phone has read or
saved it (`spec/app/settings/preferences.md`, "The agent is launched
allowed to change Gmail and Calendar exactly as the phone last read or
saved, allowed neither once it could not read them, and Alpha says nothing
of it before the first answer"): Alpha's agent service keeps that choice
and gives it to eliza's, which launches with it in place of the host
file's.

```quint
pure val gmailChanges: bool = false
pure val calendarEdits: bool = false
pure def googleAdmitted(gmail: bool, calendar: bool): bool = gmail == gmailChanges and calendar == calendarEdits
```

### The agent's text goes to the owner's cloud account, which is asked for the model the old agent used

The old agent's default model was `qwen-3.8-27b` (the old tree's agent model script at
`26e827f06`, line 4), called directly at its provider; now the cloud is asked for it, at
the origin of the environment's deployment in `packages/deployment`. The local
environment has no fixed origin (the harness's cloud listens where it can), so
a pack is built only for a hosted environment; a journey runs the pack
against its own local cloud and that cloud's model.

```quint
type Environment = Local | Staging | Production
pure val cloudModel: str = "qwen-3.8-27b"
pure def packedFor(e: Environment): bool = e != Local
```

## Story: Build the pack only from the pinned eliza

> As the maker of Alpha, I want the pack on the phone to be exactly the
> pinned eliza's agent with the plugins I chose, for Node 26, with no local
> inference, carrying the workflow worker it pins and every action Alpha
> allows, so that what ships is what was reviewed.

### A pack is admitted only when its manifest names the pinned commit, Node 26, no local inference, the plugins it carries, the Alpha product plugin, a pinned workflow worker and every allowed action

The manifest is the one `readBundleManifest` reads back for the bundle's own
bytes (eliza's "A manifest is read only for its own bundle bytes and only when
it is one a build could write"). The pin is `eliza.lock.json`'s commit as the
harness reads it. eliza pins the workflow worker's digest exactly when the
bundle carries the workflow plugin.

```quint
type Manifest = { sourceCommit: str, node: str, localInference: bool, plugins: List[str], productPlugin: str, workerPinned: bool, actions: List[str] }
pure def packAdmitted(m: Manifest, pin: str): bool =
  m.sourceCommit == pin and m.node == "26" and not(m.localInference) and sameNames(m.plugins, packedPlugins)
    and m.productPlugin == productPluginName and m.workerPinned and allowedActions.every(a => m.actions.includes(a))
```

### Every package the bundle carries is the pinned eliza's, except the pack's entry and Alpha's product plugin

The bundle is built from a private clone of the pinned commit, never from
Alpha's own tree: the only packages of Alpha's in it are the entry the build
writes inside that clone (which starts eliza's agent with the plugins above
and builds the notes and product modules) and Alpha's `alpha-apps` product
plugin staged inside that entry. Every other package is the pinned eliza's
own or one its lockfile installs.

```quint
pure val packEntry: str = "@repo/agent-pack-entry"
pure def inputAdmitted(name: str, alphaOwned: bool): bool = not(alphaOwned) or name == packEntry or name == productPluginName
pure def entryCarried(packages: List[str]): bool = packages.includes(packEntry) and packages.includes(productPluginName)
```

### The launch names the pack's pinned workflow worker, and the agent refuses any other with its configuration code

The workflow plugin runs workflows only in the worker whose digest the
bundle pinned (eliza's `spec/agent/plugins/profile.md`, "The worker is
installed only after its executable digest matches the launch"), so the
launch names that worker. A launch naming a worker with any other digest
ends with the configuration code, 78, before the store opens
(`spec/agent/host/process.md`, "A refused launch fails before the store
opens, as a configuration or credential error").

```quint
pure val configurationExit: int = 78
pure val launchCarriesWorkflowWorker: bool = true
pure def workerAdmitted(named: str, pinned: str): bool = named == pinned
```

## Story: Say plainly what the phone cannot do yet

> As the owner, I want the phone to tell me which parts of the old agent's
> work have no device service behind them yet, rather than pretend they do.

### The host services the pack's entry does not give its plugins yet are named, and nothing in the pack fakes them

eliza's plugins find some device services by name, which Alpha's entry is to
supply (`spec/agent/plugins/profile.md` in eliza, "Host runtime services
register with storage before every listed plugin, never under an agent
service's name, and a pinned worker is the workflow-worker service"):
`workflow-device`, the enrolled phone's steps inside a workflow;
`workflow-native-digests`, the reviewed native sources of a digest; and
Maps' saved places, kept under the agent's state. The pack's entry is
written inside the pinned clone and cannot carry Alpha's code until eliza's
bundle builder admits a package outside its source root, so these stay
unavailable: a workflow step on the device, a native digest source and a
saved place each answer that the phone cannot do it yet.

```quint
pure val awaitingHostServices: Set[str] = Set("workflow-device", "workflow-native-digests", "maps-saved-places")
pure def serviceAvailable(service: str): bool = not(awaitingHostServices.contains(service))
```
