# Alpha design system

Black and white with one blue. Type and space carry the hierarchy; blue marks Alpha and the one thing to
do next.

- **Identity.** `alpha` is Alpha blue, the same in both themes, with `alpha-foreground` on it: the Alpha
  mark, the Ask Alpha button and the app icon. The marks are in `@repo/ui` (`Mark`, `Wordmark`).
- **Surfaces.** `background` is the page: white, or true black in the dark. `card` is a raised panel,
  `popover` anything floating: a sheet, a menu, a dialog. `secondary` and `muted` are the quiet fill of a
  tile, a chip or a field, `accent` the pressed and selected fill.
- **Text.** `foreground` by default, `muted-foreground` for what matters less. Light muted text keeps
  AA contrast on the pressed surface. Every `x-foreground` is
  the text color on `x`, and each pair meets WCAG AA in both themes.
- **Edges.** `border` divides and may be faint. `input` is the edge of a control and `ring` the keyboard
  focus: both stand at least 3:1 off `background` and `card` in both themes (WCAG 1.4.11).
- **Meaning.** `primary` is the accent as text, a link and a mark: Alpha blue on white, a lighter
  blue on black where Alpha blue cannot be read. What the accent fills, the main action, a switch that is on
  and a chosen box or radio, is `alpha` with `alpha-foreground`, Alpha blue in both themes. `destructive`, `ok`, `warn` and `info` are states,
  `call` a live or answerable call, `dial` the button that places one, `record` a running recording. A state color always sits beside a
  word or an accessible name, never alone.
- **Type.** `font-sans` is Public Sans, for everything read or pressed. `font-display` is Denton, with
  Fraunces behind it, at weight `light`: a screen's display title on the launcher, the date on Home, a large figure. The sizes
  are in rem, so Android's text size scales them: `base` is body text, `md` a row title or a field,
  `caption` and `sm` the quieter line beside it, `xl` a shared app header title in the browser, `3xl` a screen title
  (also the shared app header title in `font-display` on the launcher), and `4xl` the Home date. Text up to `lg` is set at Public Sans's own line height (1.175), as develop sets it; copy that
  is read at length takes `leading-normal`. `tracking-caps` with `text-xs` is a small uppercase label; `text-label` names an app tile on
  Home and in the drawer. A list row reads `text-base`,
  `text-subject` and `text-snippet` line by line; `text-meta` is a status line under a header, and `text-body`
  the text of a message or of a field being typed; `text-2xs` is the time under a text message or a
  keypad key's letters; `text-keypad-number` the number being dialled, `text-keypad-digit` a key's
  digit and `text-keypad-letters` the letters under it; `text-contact-name` and `text-contact-initials`, in
  `font-display`, are a contact's name and initials at the top of their card. `text-lead` is the street of the next turn,
  `text-title` a document's name over its preview, and `text-figure` and `text-figure-sm` a route's time.
  `leading-row` sets `text-body` as a note's or a routine's title in a list.
  `text-badge` is a video's length over a thumbnail and `text-tile-name` an album's name under its cover.
  `text-headline` is an open voice or link note's title and `text-quote` a clip kept from a page.
  `text-tab-count` in a `rounded-tab-count` outline is the Browser's count of open tabs.
  In Calendar, `text-fine` is an invitation's time, `text-prose` an event's notes and `text-date` a day
  chip's date; an event's page is titled `text-display` and its form `text-display-sm`. `leading-plain` is
  the browser's own line height for Public Sans, for a line whose box the design measures.
- **Shape.** `radius` is a card; `rounded-group` a group of rows; `rounded-panel` a notice or a search bar; `rounded-home-card` is a Home overview card;
  `rounded-drawer-icon` rounds an installed app icon; `rounded-option` is a row of a floating menu and
  `rounded-box` the box of a list row's selection check; `rounded-chip` is a choice chip and an invitation
  row, `rounded-action` a labelled action button; `rounded-segment` is a segmented control and
  `rounded-segment-option` the option chosen in it. `rounded-tile` is an app tile, a menu and a dialog;
  `rounded-sheet` the top of a bottom sheet, `rounded-chat` the top of the Ask Alpha sheet; `rounded-full` a
  button and a chip, `rounded-dock` the Ask Alpha bar and `rounded-dock-compact` its compact controls.
  Everything pressed is at least 44px in both directions.
- **Elevation.** `shadow-sm` lifts a control, `shadow-menu` a menu, `shadow-md` a dialog or a notice, `shadow-lg` a raised card,
  `shadow-dock` the floating Ask Alpha bar, `shadow-dock-compact` its compact controls, and `shadow-sheet` a bottom sheet.
  Both dock shadows have a `-dark` variant for black surfaces.
- **Layers.** `z-dock` is the Ask Alpha bar, `z-sheet` the conversation and bottom sheets, `z-dialog` a
  dialog, `z-toast` a notice, `z-voice` the voice overlay. `z-10`, `z-20` and `z-50` order things inside one view.
- **Motion.** `fast` for press, `base` for most changes, `slow` for entering and leaving, on
  `ease-standard`; `animate-rise` brings in a sheet, `animate-drop` a menu, `animate-fade` a screen,
  `animate-shimmer` work in progress, `animate-blink` the dots of a reply being written, `animate-wiggle` an app tile on Home while Home is being edited.
  Reduced motion stops them all.
- **Width.** Layout follows the measured width, not the orientation: from `md` a centered reading
  column, from `lg` a list beside its detail.
- **Dark.** Follows the system; a `.dark` or `.light` class on an ancestor overrides it.

Name a value by its token (`bg-primary`, `var(--primary)`), never by its value. Where a literal color
is unavoidable, such as a map layer or third-party markup, say why on the line above:
`// eslint-disable-next-line design-system/no-literal-colors -- map layer`.

## Changing it

`tokens.json` is the source; the CSS in `generated/` and the table below are built from it. Nothing reads
this prose into tokens. To change the design, describe it, and have the change written as a list in a file:

```json
[{ "path": "color.light.primary", "value": "oklch(0.45 0.2 277)", "reason": "deeper accent" }]
```

- `node ../../vibestack/design/cli.ts apply changes.json` refuses an unknown path, an invalid value or a
  pair below AA, and prints each token before and after.
- The same with `--write` updates `tokens.json`, the CSS and the table.
- `pnpm build` regenerates; `pnpm check` fails on invalid tokens, low contrast or a stale table.

<!-- tokens:start -->
| Color | Light | Dark |
| --- | --- | --- |
| `background` | oklch(1 0 0) | oklch(0 0 0) |
| `foreground` | oklch(0 0 0) | oklch(1 0 0) |
| `card` | oklch(0.98510365 0 0) | oklch(0.14957712 0 0) |
| `card-foreground` | oklch(0 0 0) | oklch(1 0 0) |
| `popover` | oklch(1 0 0) | oklch(0 0 0) |
| `popover-foreground` | oklch(0 0 0) | oklch(1 0 0) |
| `primary` | oklch(0.45201372 0.31321437 264.05202064) | oklch(0.70366126 0.15682550 277.95756294) |
| `primary-foreground` | oklch(1 0 0) | oklch(0 0 0) |
| `secondary` | oklch(0.96415350 0 0) | oklch(0.19573496 0 0) |
| `secondary-foreground` | oklch(0 0 0) | oklch(1 0 0) |
| `muted` | oklch(0.96415350 0 0) | oklch(0.19573496 0 0) |
| `muted-foreground` | oklch(0.51027835 0 0) | oklch(0.65004127 0 0) |
| `accent` | oklch(0.92493954 0 0) | oklch(0.26861828 0 0) |
| `accent-foreground` | oklch(0 0 0) | oklch(1 0 0) |
| `destructive` | oklch(0.532 0.198 27.9) | oklch(0.71 0.183 27) |
| `destructive-foreground` | oklch(1 0 0) | oklch(0 0 0) |
| `border` | oklch(0.91583147 0 0) | oklch(0.26861828 0 0) |
| `input` | oklch(0.64 0 0) | oklch(0.528 0 0) |
| `ring` | oklch(0.45201372 0.31321437 264.05202064) | oklch(0.704 0.157 278) |
| `ok` | oklch(0.509 0.134 149.4) | oklch(0.727 0.208 148.3) |
| `warn` | oklch(0.514 0.111 70.3) | oklch(0.761 0.159 77.7) |
| `info` | oklch(0.354 0.245 264.1) | oklch(0.704 0.157 278) |
| `alpha` | oklch(0.45201372 0.31321437 264.05202064) | — |
| `alpha-foreground` | oklch(1 0 0) | — |
| `call` | oklch(0.509 0.134 149.4) | oklch(0.614 0.162 149.3) |
| `record` | oklch(0.578 0.206 29) | oklch(0.663 0.224 28.3) |
| `dial` | oklch(0.614 0.162 149.3) | — |
| `dial-foreground` | oklch(1 0 0) | — |

| Token | Value |
| --- | --- |
| `radius` | 1rem |
| `rounded.tile` | 1.375rem |
| `rounded.sheet` | 1.75rem |
| `rounded.home-card` | 1.875rem |
| `rounded.drawer-icon` | 1.125rem |
| `rounded.option` | 0.625rem |
| `rounded.box` | 0.375rem |
| `rounded.group` | 1.625rem |
| `rounded.panel` | 1.5rem |
| `rounded.dock` | 1.9375rem |
| `rounded.dock-compact` | 1.875rem |
| `rounded.chat` | 1.875rem |
| `rounded.tab-count` | 0.4375rem |
| `rounded.action` | 1.125rem |
| `rounded.chip` | 1.5rem |
| `rounded.segment` | 0.9375rem |
| `rounded.segment-option` | 0.6875rem |
| `font.sans` | "Public Sans", system-ui, -apple-system, "Segoe UI", sans-serif |
| `font.display` | Denton, Fraunces, Georgia, serif |
| `font.mono` | ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace |
| `text.2xs.size` | 0.6875rem |
| `text.2xs.leading` | 1.4 |
| `text.badge.size` | 0.71875rem |
| `text.badge.leading` | 1.2 |
| `text.xs.size` | 0.75rem |
| `text.xs.leading` | 1.175 |
| `text.fine.size` | 0.78125rem |
| `text.fine.leading` | 1.2 |
| `text.label.size` | 0.75rem |
| `text.label.leading` | 1.1667 |
| `text.meta.size` | 0.8125rem |
| `text.meta.leading` | 1.25 |
| `text.snippet.size` | 0.84375rem |
| `text.snippet.leading` | 1.2 |
| `text.caption.size` | 0.8125rem |
| `text.caption.leading` | 1.175 |
| `text.sm.size` | 0.875rem |
| `text.sm.leading` | 1.175 |
| `text.subject.size` | 0.90625rem |
| `text.subject.leading` | 1.2 |
| `text.tile-name.size` | 0.9375rem |
| `text.tile-name.leading` | 1.35 |
| `text.base.size` | 0.9375rem |
| `text.base.leading` | 1.175 |
| `text.prose.size` | 0.96875rem |
| `text.prose.leading` | 1.55 |
| `text.body.size` | 1rem |
| `text.body.leading` | 1.6 |
| `text.md.size` | 1rem |
| `text.md.leading` | 1.175 |
| `text.lg.size` | 1.0625rem |
| `text.lg.leading` | 1.175 |
| `text.date.size` | 1.125rem |
| `text.date.leading` | 1.2 |
| `text.lead.size` | 1.1875rem |
| `text.lead.leading` | 1.2 |
| `text.xl.size` | 1.25rem |
| `text.xl.leading` | 1.2 |
| `text.2xl.size` | 1.5rem |
| `text.2xl.leading` | 1.2 |
| `text.3xl.size` | 2rem |
| `text.3xl.leading` | 1.1 |
| `text.3xl.tracking` | -0.01em |
| `text.4xl.size` | 2.5rem |
| `text.4xl.leading` | 1.08 |
| `text.4xl.tracking` | -0.01em |
| `text.figure.size` | 2.75rem |
| `text.figure.leading` | 1 |
| `text.headline.size` | 2.125rem |
| `text.headline.leading` | 1.08 |
| `text.headline.tracking` | -0.01em |
| `text.quote.size` | 1.3125rem |
| `text.quote.leading` | 1.35 |
| `text.home-display.size` | 1.625rem |
| `text.home-display.leading` | 1.1 |
| `text.title.size` | 1.75rem |
| `text.title.leading` | 1.15 |
| `text.title.tracking` | -0.01em |
| `text.figure-sm.size` | 1.875rem |
| `text.figure-sm.leading` | 1.05 |
| `text.keypad-letters.size` | 0.59375rem |
| `text.keypad-letters.leading` | 1.15 |
| `text.keypad-letters.tracking` | 0.14em |
| `text.keypad-digit.size` | 1.875rem |
| `text.keypad-digit.leading` | 1 |
| `text.keypad-number.size` | 2.375rem |
| `text.keypad-number.leading` | 1.2 |
| `text.keypad-number.tracking` | 0.02em |
| `text.contact-name.size` | 2.125rem |
| `text.contact-name.leading` | 1.1 |
| `text.contact-name.tracking` | -0.01em |
| `text.contact-initials.size` | 2.625rem |
| `text.contact-initials.leading` | 1 |
| `text.tab-count.size` | 0.71875rem |
| `text.tab-count.leading` | 1.175 |
| `text.display-sm.size` | 2.125rem |
| `text.display-sm.leading` | 1.35 |
| `text.display-sm.tracking` | -0.01em |
| `text.display.size` | 2.375rem |
| `text.display.leading` | 1.05 |
| `text.display.tracking` | -0.01em |
| `weight.light` | 300 |
| `weight.normal` | 400 |
| `weight.medium` | 500 |
| `weight.semibold` | 600 |
| `weight.bold` | 700 |
| `leading.none` | 1 |
| `leading.tight` | 1.1 |
| `leading.snug` | 1.25 |
| `leading.row` | 1.3 |
| `leading.normal` | 1.4 |
| `leading.relaxed` | 1.6 |
| `leading.field` | 1.375 |
| `leading.chat` | 1.5 |
| `leading.plain` | 1.18 |
| `tracking.tight` | -0.01em |
| `tracking.caps` | 0.14em |
| `z.10` | 10 |
| `z.20` | 20 |
| `z.50` | 50 |
| `z.dock` | 100 |
| `z.sheet` | 200 |
| `z.dialog` | 300 |
| `z.toast` | 400 |
| `z.voice` | 500 |
| `focus.width` | 2px |
| `focus.offset` | 2px |
| `shadow.sm` | 0 1px 3px oklch(0 0 0 / 0.2) |
| `shadow.md` | 0 8px 24px oklch(0 0 0 / 0.12) |
| `shadow.lg` | 0 12px 34px oklch(0 0 0 / 0.16) |
| `shadow.sheet` | 0 -10px 40px oklch(0 0 0 / 0.12) |
| `shadow.menu` | 0 4px 20px oklch(0 0 0 / 0.12) |
| `shadow.dock` | 0 14px 40px oklch(0 0 0 / 0.12) |
| `shadow.dock-dark` | 0 14px 40px oklch(0 0 0 / 0.45) |
| `shadow.dock-compact` | 0 12px 34px oklch(0 0 0 / 0.12) |
| `shadow.dock-compact-dark` | 0 12px 34px oklch(0 0 0 / 0.45) |
| `keyframes.rise` | from{opacity:0;transform:translateY(1.75rem)}to{opacity:1;transform:none} |
| `keyframes.drop` | from{opacity:0;transform:translateY(-2.25rem)}to{opacity:1;transform:none} |
| `keyframes.fade` | from{opacity:0}to{opacity:1} |
| `keyframes.shimmer` | from{background-position:200% 0}to{background-position:-200% 0} |
| `keyframes.wiggle` | from{transform:rotate(-1.5deg)}to{transform:rotate(1.5deg)} |
| `keyframes.blink` | 0%,100%{opacity:0.2}50%{opacity:1} |
| `animate.rise` | rise 460ms cubic-bezier(0.19, 1, 0.22, 1) both |
| `animate.drop` | drop 500ms cubic-bezier(0.19, 1, 0.22, 1) both |
| `animate.fade` | fade 700ms ease both |
| `animate.shimmer` | shimmer 2s linear infinite |
| `animate.wiggle` | wiggle 300ms ease-in-out infinite alternate |
| `animate.blink` | blink 1.2s ease-in-out infinite |
| `breakpoint.sm` | 40rem |
| `breakpoint.md` | 47.5rem |
| `breakpoint.lg` | 62.5rem |
| `breakpoint.xl` | 80rem |
| `duration.fast` | 120ms |
| `duration.base` | 250ms |
| `duration.slow` | 460ms |
| `ease.standard` | cubic-bezier(0.19, 1, 0.22, 1) |
| `ease.emphasized` | cubic-bezier(0.83, 0, 0.17, 1) |
<!-- tokens:end -->
