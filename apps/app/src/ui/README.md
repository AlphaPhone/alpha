# Alpha UI

Alpha's own renderer UI library: the mobile shell (registration, navigation, Home, app grid),
gestures, the voice session client and its worklets, durable drafts, overview cards, the
permission walkthrough, dock clearance, screen focus and the remaining shell helpers.

The modules started as copies of elizaOS `packages/ui` (plus the mailbox folder picker and the
Calendar event-editor policy/command from upstream plugins) at commit
`11040b3555c9a7db51ac2104ee68dd66cdd51046`, under the MIT licence recorded from
`vendor/eliza/LICENSE` in the generated notices. They are now Alpha-owned: change them here,
not upstream, and never re-import elizaOS UI. `test/ui-self-contained.test.mjs` enforces that.

The tree still imports framework-free upstream contracts, protocol and native-bridge modules
through the `@elizaos/*` aliases in `vite.config.ts` and `tsconfig.json` (for example
`@elizaos/contracts`, `@elizaos/core/speech`, `@elizaos/capacitor-system/launcher`). Those are
shared with the agent, not UI.
