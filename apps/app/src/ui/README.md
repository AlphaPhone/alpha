# Alpha UI

Alpha's own renderer UI library: the mobile shell (registration, navigation, Home, app grid),
gestures, the voice session client and its worklets, durable drafts, overview cards, the
permission walkthrough, dock clearance, screen focus, the mailbox folder picker, the Calendar
event-editor policy and command, and the remaining shell helpers.

The modules started as copies of elizaOS `packages/ui` (plus the mailbox folder picker from
`plugins/plugin-inbox` and the Calendar event-editor policy and command from
`plugins/plugin-calendar`) at commit `49d8b466043ca6c3316127b616362c9d80836084`, under the MIT
licence recorded from `vendor/eliza/LICENSE` in the generated notices. Each file keeps its
upstream subpath (`packages/ui/src/<path>` is `ui/<path>`; the plugin files are under `mailbox/`
and `calendar/`). Modules Alpha does not reach, unused exports and Eliza's product registration
and default theme were left out. They are now Alpha-owned: change them here, not upstream, and
never re-import elizaOS UI.

Two more renderer modules started the same way at that commit and are Alpha-owned too:
`config/theme.ts` holds the theme tokens, CSS variable map and theme shape check copied from
`packages/contracts/src/contracts/theme.ts` (the elizaOS UI design tokens), and
`../maps/map-plane.ts` holds the MapLibre renderer copied from
`plugins/plugin-maps/src/client/map-plane.ts` (map style, pins, position puck and route line),
without the viewport callback Alpha never used. Upstream `maps-screen.ts` still names the
renderer's overlay type, so the prepared tree keeps that upstream file only for the type; no Alpha
module loads it.

The tree still imports framework-free upstream contracts, protocol and native-bridge modules
through the `@elizaos/*` aliases in `vite.config.ts` and `tsconfig.json` (for example
`@elizaos/contracts`, `@elizaos/core/speech`, `@elizaos/capacitor-system/launcher`). Those are
shared with the agent, not UI. The one `@elizaos/ui` specifier left, `@elizaos/ui/api/transport`,
resolves to `ui/api/transport.ts` here: upstream `plugin-notes` types its fetch with it.
