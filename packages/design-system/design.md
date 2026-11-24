# Alpha design system

Black and white with one blue. Type and space carry the hierarchy; blue marks Alpha and the one thing to
do next.

- **Identity.** `alpha` is Alpha blue, the same in both themes, with `alpha-foreground` on it: the Alpha
  mark, the Ask Alpha button and the app icon. The marks are in `@repo/ui` (`Mark`, `Wordmark`).
- **Surfaces.** `background` is the page: white, or true black in the dark. `card` is a raised panel,
  `popover` anything floating: a sheet, a menu, a dialog. `secondary` and `muted` are the quiet fill of a
  tile, a chip or a field, `accent` the pressed and selected fill.
- **Text.** `foreground` by default, `muted-foreground` for what matters less. Every `x-foreground` is
  the text color on `x`, and each pair meets WCAG AA in both themes.
- **Edges.** `border` divides and may be faint. `input` is the edge of a control and `ring` the keyboard
  focus: both stand at least 3:1 off `background` and `card` in both themes (WCAG 1.4.11).
- **Meaning.** `primary` is the accent as text and as the main action: Alpha blue on white, a lighter
  blue on black where Alpha blue cannot be read. `destructive`, `ok`, `warn` and `info` are states,
  `call` a live or answerable call, `record` a running recording. A state color always sits beside a
  word or an accessible name, never alone.
- **Type.** `font-sans` is Public Sans, for everything read or pressed. `font-display` is Denton, with
  Fraunces behind it, at weight `light`: a screen's one title, the date on Home, a large figure. The sizes
  are in rem, so Android's text size scales them: `base` is body text, `3xl` a screen title, `4xl` the
  Home date, `5xl` and `6xl` the public site's headline on a narrow and a wide screen. `tracking-caps` with `text-xs` is a small uppercase label.
- **Shape.** `radius` is a card or a row group; `rounded-tile` an app tile, a menu and a dialog;
  `rounded-sheet` the top of a bottom sheet; `rounded-full` a button, a chip and the Ask Alpha bar.
  Everything pressed is at least 44px in both directions.
- **Elevation.** `shadow-sm` lifts a control, `shadow-md` a menu or dialog, `shadow-lg` the Ask Alpha
  bar, `shadow-sheet` a bottom sheet.
- **Layers.** `z-dock` is the Ask Alpha bar, `z-sheet` the conversation and bottom sheets, `z-dialog` a
  dialog, `z-toast` a notice, `z-voice` the voice overlay. `z-10`, `z-20` and `z-50` order things inside one view.
- **Motion.** `fast` for press, `base` for most changes, `slow` for entering and leaving, on
  `ease-standard`; `animate-rise` brings in a sheet, `animate-drop` a menu, `animate-fade` a screen,
  `animate-shimmer` work in progress. Reduced motion stops them all.
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
| `card` | oklch(0.985 0 0) | oklch(0.15 0 0) |
| `card-foreground` | oklch(0 0 0) | oklch(1 0 0) |
| `popover` | oklch(1 0 0) | oklch(0.196 0 0) |
| `popover-foreground` | oklch(0 0 0) | oklch(1 0 0) |
| `primary` | oklch(0.452 0.313 264.1) | oklch(0.704 0.157 278) |
| `primary-foreground` | oklch(1 0 0) | oklch(0 0 0) |
| `secondary` | oklch(0.964 0 0) | oklch(0.196 0 0) |
| `secondary-foreground` | oklch(0 0 0) | oklch(1 0 0) |
| `muted` | oklch(0.964 0 0) | oklch(0.196 0 0) |
| `muted-foreground` | oklch(0.5 0 0) | oklch(0.65 0 0) |
| `accent` | oklch(0.925 0 0) | oklch(0.269 0 0) |
| `accent-foreground` | oklch(0 0 0) | oklch(1 0 0) |
| `destructive` | oklch(0.532 0.198 27.9) | oklch(0.71 0.183 27) |
| `destructive-foreground` | oklch(1 0 0) | oklch(0 0 0) |
| `border` | oklch(0.916 0 0) | oklch(0.269 0 0) |
| `input` | oklch(0.64 0 0) | oklch(0.528 0 0) |
| `ring` | oklch(0.452 0.313 264.1) | oklch(0.704 0.157 278) |
| `ok` | oklch(0.509 0.134 149.4) | oklch(0.727 0.208 148.3) |
| `warn` | oklch(0.514 0.111 70.3) | oklch(0.761 0.159 77.7) |
| `info` | oklch(0.354 0.245 264.1) | oklch(0.704 0.157 278) |
| `alpha` | oklch(0.452 0.313 264.1) | — |
| `alpha-foreground` | oklch(1 0 0) | — |
| `call` | oklch(0.509 0.134 149.4) | oklch(0.614 0.162 149.3) |
| `record` | oklch(0.578 0.206 29) | oklch(0.663 0.224 28.3) |

| Token | Value |
| --- | --- |
| `radius` | 1rem |
| `rounded.tile` | 1.375rem |
| `rounded.sheet` | 1.75rem |
| `font.sans` | "Public Sans", system-ui, -apple-system, "Segoe UI", sans-serif |
| `font.display` | Denton, Fraunces, Georgia, serif |
| `font.mono` | ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace |
| `text.xs.size` | 0.75rem |
| `text.xs.leading` | 1.25 |
| `text.sm.size` | 0.875rem |
| `text.sm.leading` | 1.4 |
| `text.base.size` | 0.9375rem |
| `text.base.leading` | 1.4 |
| `text.lg.size` | 1.0625rem |
| `text.lg.leading` | 1.4 |
| `text.xl.size` | 1.25rem |
| `text.xl.leading` | 1.25 |
| `text.2xl.size` | 1.5rem |
| `text.2xl.leading` | 1.2 |
| `text.3xl.size` | 2rem |
| `text.3xl.leading` | 1.1 |
| `text.3xl.tracking` | -0.01em |
| `text.4xl.size` | 2.5rem |
| `text.4xl.leading` | 1.08 |
| `text.4xl.tracking` | -0.01em |
| `text.5xl.size` | 3.25rem |
| `text.5xl.leading` | 1.04 |
| `text.5xl.tracking` | -0.05em |
| `text.6xl.size` | 5.5rem |
| `text.6xl.leading` | 1.04 |
| `text.6xl.tracking` | -0.06em |
| `weight.light` | 300 |
| `weight.normal` | 400 |
| `weight.medium` | 500 |
| `weight.semibold` | 600 |
| `weight.bold` | 700 |
| `leading.none` | 1 |
| `leading.tight` | 1.1 |
| `leading.snug` | 1.25 |
| `leading.normal` | 1.4 |
| `leading.relaxed` | 1.6 |
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
| `keyframes.rise` | from{opacity:0;transform:translateY(1.75rem)}to{opacity:1;transform:none} |
| `keyframes.drop` | from{opacity:0;transform:translateY(-2.25rem)}to{opacity:1;transform:none} |
| `keyframes.fade` | from{opacity:0}to{opacity:1} |
| `keyframes.shimmer` | from{background-position:200% 0}to{background-position:-200% 0} |
| `animate.rise` | rise 460ms cubic-bezier(0.19, 1, 0.22, 1) both |
| `animate.drop` | drop 500ms cubic-bezier(0.19, 1, 0.22, 1) both |
| `animate.fade` | fade 700ms ease both |
| `animate.shimmer` | shimmer 2s linear infinite |
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
