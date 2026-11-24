# Alpha's agent pack

The resident agent the phone runs is eliza's: `agent.mjs`, built by
`buildAgentBundle` of `@elizaos/agent/bundle` from the commit `eliza.lock.json`
pins, and started by eliza's Android agent service from three data files
(`spec/os/agentService/config.md` in eliza). What the bundle may hold, how its
manifest is written and read, and what it refuses are eliza's
(`spec/agent/plugins/bundle.md`); how a launch is read, which keys it refuses
and with which exit code are eliza's too (`spec/agent/host/launch.md`,
`spec/agent/host/process.md`), as is the route gate (`spec/agent/access/routes.md`).
This spec holds only what Alpha decides: who the agent is, which of the
bundle's actions it may run, which routes the page may reach, that it
remembers, which cloud model it asks, and what the phone does without while
the bundle carries no plugin. `apps/agent` builds the pack into
`apps/agent/dist/bundle` and checks it against these rules
(`node dist/src/main.js build --env <staging|production>`, then `check`).

## Story: Run Alpha's agent on the phone

> As the owner, I want the agent on my phone to be Alpha, to answer me
> through my cloud account, to remember our conversation when it restarts,
> and to be reachable from the page only where the page needs it.

### The agent is Alpha, made by Alpha Compute, with a system prompt

The name is the product's character name, `identity.characterName` of the
old product record (`legacy/apps/app/src/product/alpha-product-registration.ts`),
and the bio is the one the old agent was given
(the old tree's agent identity script at `26e827f06`, line 14). The old agent had no system
prompt of its own and kept its preset's origin line, "{{name}}, made by Alpha
Compute" (line 10); eliza's launch needs one, so that line, with the name, is
it. The words are in `apps/agent/host/character.json`.

```quint
pure val characterName: str = "Alpha"
pure def characterAdmitted(name: str, system: str): bool = name == characterName and system != ""
```

### The agent may run exactly the actions Alpha's stories need, and every other action the bundle registers is listed as refused

A turn is answered by `REPLY`, and core's own `IGNORE` and `NONE` let it end
without one. Nothing else the bundle registers (today `CALCULATE` and
`VIEWS`) is needed by an area of the phone, so each is named in the policy's
refused list with its reason. The policy loads no module of the agent: no
route the page reaches belongs to one.

```quint
pure val allowedActions: List[str] = List("REPLY", "IGNORE", "NONE")
pure def sameNames(a: List[str], b: List[str]): bool =
  a.length() == b.length() and a.every(x => b.includes(x)) and b.every(x => a.includes(x))
pure def refusedActions(registered: List[str]): List[str] = registered.select(a => not(allowedActions.includes(a)))
pure def policyAdmitted(allowed: List[str], refused: List[str], loaded: List[str], registered: List[str]): bool =
  sameNames(allowed, allowedActions) and sameNames(refused, refusedActions(registered)) and loaded.length() == 0
```

### The page reaches exactly the routes its platform services call, and nothing else

The page's agent service (`apps/app/src/platform/agent.vibe`) on the phone
goes through eliza's `ElizaAgent` plugin, which checks each request against
the host file's route list. Ask Alpha opens its conversation with
`POST /api/conversations` (`apps/app/src/ask/ask.vibe`), and eliza's
`TurnController`, which carries its turns, posts each message buffered or
streamed and asks the agent to stop a turn by its room. The agent's health
is the plugin's own status, not a route of the page. A route an area fakes
for want of an agent plugin is not listed: none does today. Each line of
`apps/agent/host/routes.jsonl` is one route; the pack is refused unless that
list is this one, and eliza's route gate admits each of its routes.

```quint
type Method = Get | Post | Put | Patch | Delete
type Route = { method: Method, path: str, stream: bool }
pure val pageRoutes: List[Route] = List(
  { method: Post, path: "/api/conversations", stream: false },
  { method: Post, path: "/api/conversations/{id}/messages", stream: false },
  { method: Post, path: "/api/conversations/{id}/messages/stream", stream: true },
  { method: Post, path: "/api/turns/{roomId}/abort", stream: false },
)
pure def admitted(listed: List[Route], r: Route): bool = listed.includes(r)
pure def routeListAdmitted(listed: List[Route]): bool =
  listed.length() == pageRoutes.length() and listed.every(r => pageRoutes.includes(r)) and pageRoutes.every(r => listed.includes(r))
```

### The agent keeps its memory across restarts, without embeddings

The old agent kept its history when it restarted, so the launch asks the
agent to persist its store. No embedding service runs on the phone (D11), so
memory is kept without embeddings.

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
> pinned eliza's agent, for Node 26, with no local inference, carrying every
> action Alpha allows, so that what ships is what was reviewed.

### A pack is admitted only when its manifest names the pinned commit, Node 26, no local inference, no plugin, and every allowed action

The manifest is the one `readBundleManifest` reads back for the bundle's own
bytes (eliza's "A manifest is read only for its own bundle bytes and only when
it is one a build could write"). The pin is `eliza.lock.json`'s commit as the
harness reads it.

```quint
type Manifest = { sourceCommit: str, node: str, localInference: bool, plugins: List[str], actions: List[str] }
pure def packAdmitted(m: Manifest, pin: str): bool =
  m.sourceCommit == pin and m.node == "26" and not(m.localInference) and m.plugins.length() == 0
    and allowedActions.every(a => m.actions.includes(a))
```

## Story: Say plainly what the phone cannot do yet

> As the owner, I want the phone to tell me which apps have no agent behind
> them yet, rather than pretend they do.

### While the bundle carries no plugin, the areas whose agent side is a plugin are unavailable on the phone, and nothing in the pack fakes them

eliza cannot bundle a plugin from outside its own workspace yet
(`found-by-alpha` item 2), so by decision D11 (a) the bundle is built with no
plugin. These areas need one for their agent side, and the page shows each as
unavailable on the phone until the bundle carries it.

```quint
pure val unavailableOnThePhone: Set[str] = Set("Workflows", "Digests", "Notes", "Calendar", "Inbox", "Files", "Maps", "Browser")
pure def areaAvailable(area: str, plugins: List[str]): bool = plugins.length() > 0 or not(unavailableOnThePhone.contains(area))
```

### A launch never names the workflow worker, and the agent refuses one that does with its configuration code

The workflow worker belongs to the workflow plugin, which the pack does not
carry. eliza's agent measures a named worker before it opens anything and
ends with its configuration code, 78, when the worker is not the one named
(`spec/agent/host/process.md`, "A refused launch fails before the store
opens, as a configuration or credential error").

```quint
pure val configurationExit: int = 78
pure val launchCarriesWorkflowWorker: bool = false
```
