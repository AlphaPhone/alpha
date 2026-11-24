# B3 migration map: from `Bag` / `Shell` to `prototype/shell-types.ts`

`apps/app/src/prototype/shell-types.ts` types what model.js and dc-lite.js define, nothing else
(RECOMMENDATIONS.md R5). This note says how one adapter moves off `type Bag = Record<string, any>` and
`type Shell = any`. Migrate one adapter per change (types.md §5 step 4).

## What replaces what

| Today in the adapter | Use |
|---|---|
| `Component: any` / `Component: Shell` / `{prototype: Bag}` | `Component: {prototype: ShellPrototype}` (accepts today's `ComponentType<any>` export and a typed `ShellComponent`) |
| `views: Bag` / `Record<string, Bag>` | `views: ViewRegistry` |
| `this` / `shell` / `owner: any` inside prototype wrappers | `ShellHost`, or a local `type XShell = ShellHost & {…}` for fields other adapters attach |
| `api: Bag` in `render`, `back`, `reply`, … | `ViewApi` (or `ViewApi<MyViewState>`); extra members another adapter puts on `api(k)` go in a local `type XApi = ViewApi & {…}` |
| `state: Bag` / `st: Bag` | a local `type XState = ViewState & {…}` with the keys the adapter reads |
| `const out = render(state, api)` then `out.foo = …` | `render(state, api) as XOutput` where `type XOutput = ViewOutput & {…}` names only the keys this adapter reads or writes |
| `shell.vget('k').list` | `shell.vget<XState>('k').list` (same for `api.get<XState>('k')`) |
| `p.renderVals` wrapper output | `RenderValues`, narrowed locally the same way |
| `ReplyShell`, `ContactsShell`, `AgentStatusShell`, `ExternalHandoffDeps.shell` | `Pick<ShellHost, 'S' \| 'vget' \| 'openView'>` and similar |
| `ShellPrototype` in camera-adapter.ts:163 | `Partial<ShellLifecycle>` from shell-types |

Rules:

- Never add a field to `ShellHost`, `ViewApi`, `ShellState` or `ViewDefinition` because an adapter attaches
  it. Declare it locally in the adapter that owns it (or the adapter that reads it, citing the owner).
  `ShellHost` lists only two such hooks, `expandAndroidShade` and `chatMotion`, because model.js itself
  reads them.
- An adapter that writes its own top-level state through `setState` (`homeEdit`, `*Revision` counters,
  `turnStatus` is the one model.js reads) uses `ShellHost<ShellState & {homeEdit?: boolean}>`.
- `ViewState`, `ViewOutput` and `RenderValues` are `Record<string, unknown>`. A read needs a local type or
  a narrowing check; do not cast to `any`.
- Prototype wrappers that replace a method keep its signature: write
  `p.api = function (this: XShell, key: string) {…} as ShellPrototype['api']` when the local `this` is
  narrower than `ShellHost`.

## Known gaps to handle while migrating

1. **`live`** is set by agent-adapter.ts (mount/unmount) and read by about 10 files. It is an adapter field,
   so it is not in `ShellHost`; readers use `ShellHost & {live?: boolean}`. If the D3 work keeps it, its
   owner (agent-adapter) should export that intersection.
2. **`vset` options.** model.js accepts `{afterCommit}` only. agent-adapter's override adds `exact` and
   `keepSelection` and returns `boolean | Promise<boolean>`. `ShellHost.vset` returns `unknown` so
   `await shell.vset(…) === true` still compiles; callers passing `{exact: true}` (agent-adapter,
   notes-trash-adapter, notes-organize-executor, voice-adapter) need a local
   `type NotesShell = ShellHost & {vset(key: string, patch: ViewState, options?: ViewSetOptions & {exact?: boolean; keepSelection?: boolean}): unknown}`
   exported by agent-adapter.
3. **`send`** returns `unknown` for the same reason (voice and agent adapters make it async).
4. **model.d.ts** is not retyped by this unit. When it becomes `Component: ShellComponent` and
   `VIEWS: ViewRegistry`, main.tsx's `<Component configureChatPull={…} chatPullBinding={…}>` fails because
   those two props are read only by chat-overlay-motion-adapter.ts. That adapter should export
   `type ChatPullProps` and model.d.ts should use `ShellComponent` with `ShellProps & ChatPullProps`, or
   main.tsx passes them through a narrower cast. Every other prop main.tsx passes is in `ShellProps`
   (checked by compiling a JSX use of `ShellComponent`).
5. `mod(k)` returns `Partial<ViewDefinition>` because model.js returns `{}` for an unknown key.

## Worked example 1: a views-only adapter (notes-share-adapter.ts)

Before:

```ts
type Bag=Record<string,any>;
export function installNotesShareAdapter(views:Record<string,Bag>){
 const notes=views.notes,render=notes.render;
 notes.render=(state:Bag,api:Bag)=>{
  const view=render(state,api);
  const selected=()=>{const current=api.get('notes');…const note=current.list.find((row:Bag)=>row.id===current.open);…return noteShareText(note);};
  …
  for(const key of ['ed','vo','lk'])if(view[key]){view[key].share=share;}
```

After (compiled against shell-types.ts with `tsc --noEmit`, no errors in the adapter):

```ts
import {noteShareText,type ShareableNote} from '…/note-share-text.ts';
import type {ViewApi,ViewOutput,ViewRegistry} from './shell-types';
type NoteRow=ShareableNote&{id:string};
type NotesState={open?:unknown;list:NoteRow[]};
type NoteDetail={share?:()=>void};
type NotesOutput=ViewOutput&{ed?:NoteDetail;vo?:NoteDetail;lk?:NoteDetail;shareSheet?:boolean;copyText?:()=>void;shareMail:()=>void;canExportText?:boolean;exportText:()=>unknown};
export function installNotesShareAdapter(views:ViewRegistry){
 const notes=views.notes,render=notes.render;
 notes.render=(state,api:ViewApi)=>{
  const view=render(state,api) as NotesOutput;
  const selected=()=>{const current=api.get<NotesState>('notes');…const note=current.list.find(row=>row.id===current.open);…return noteShareText(note);};
  …
  for(const key of ['ed','vo','lk'] as const){const detail=view[key];if(detail)detail.share=share;}
```

What changed: `views` is `ViewRegistry`; the render output is narrowed once to the keys this adapter
touches; `api.get` names the state it expects; the `noteShareText` argument is checked against the
upstream `ShareableNote` instead of passing `any`. The `openSharePanel` argument object is unchanged.

## Worked example 2: a prototype wrapper that extends `api(k)` (notes-folders-adapter.ts)

Before:

```ts
type Bag=Record<string,any>;
type Shell=any;
export function installNotesFoldersAdapter(Component:Shell,views:Record<string,Bag>){
 const notes=views.notes,render=notes.render;
 const p=Component.prototype,originalApi=p.api;
 async function load(shell:Shell){…if(shell.live)shell.vset('notes',{…});}
 …
 p.api=function(key:string){
  const api=originalApi.call(this,key);
  if(key==='notes'){const shell=this;api.notesFolders={create:…,rename:…,remove:…,reload:()=>load(shell)};}
  return api;
 };
 notes.render=(state:Bag,api:Bag)=>{
  if(!state.foldersLoaded&&!loading&&api.notesFolders)loading=…api.notesFolders.reload()…;
  const view=render(state,api);
  for(const detail of [view.ed,view.vo,view.lk])if(detail?.menuShown)…
```

After (compiled the same way):

```ts
import type {ShellHost,ShellPrototype,ViewApi,ViewOutput,ViewRegistry,ViewState} from './shell-types';
/** Fields other adapters attach that this one reads (live: agent-adapter; notesSourceMode: agent-adapter). */
type NotesShell=ShellHost&{live?:boolean;notesSourceMode?:string};
type NotesFoldersApi={create(name:string):Promise<NotesFolder|null>;rename(id:string,name:string):Promise<boolean>;remove(id:string):Promise<boolean>;reload():Promise<void>};
type NotesApi=ViewApi&{notesFolders?:NotesFoldersApi};
type NotesState=ViewState&{list?:Array<{id:string;folderId?:unknown}>;foldersLoaded?:boolean};
type MenuDetail={menuShown?:boolean;[action:string]:unknown};
type NotesOutput=ViewOutput&{ed?:MenuDetail;vo?:MenuDetail;lk?:MenuDetail};

export function installNotesFoldersAdapter(Component:{prototype:ShellPrototype},views:ViewRegistry){
 const notes=views.notes,render=notes.render;
 const p=Component.prototype,originalApi=p.api;
 async function load(shell:NotesShell){…if(shell.live)shell.vset('notes',{…});}
 …
 p.api=function(this:NotesShell,key:string){
  const api:NotesApi=originalApi.call(this,key);
  if(key==='notes'){const shell=this;api.notesFolders={create:name=>create(shell,name),…,reload:()=>load(shell)};}
  return api;
 } as ShellPrototype['api'];
 notes.render=(state:NotesState,api:NotesApi)=>{
  if(!state.foldersLoaded&&!loading&&api.notesFolders)loading=…api.notesFolders!.reload()…;
  const view=render(state,api) as NotesOutput;
  for(const detail of [view.ed,view.vo,view.lk])if(detail?.menuShown)…
```

What changed: the two `any` aliases are gone. The adapter's own extension of `api(k)` (`notesFolders`) is a
local type, as R5 asks; the two shell fields it reads from agent-adapter (`live`, `notesSourceMode`) are
named in one local intersection, which is the list the D3 work has to replace. `releaseNotesFolder(list, id)`
now type-checks against its real `FolderNote` parameter. The caller in main.tsx compiles unchanged with
today's untyped `Component`/`VIEWS` exports and with a future typed `ShellComponent`/`ViewRegistry`.
