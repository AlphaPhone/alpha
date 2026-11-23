# Design

Alpha Phone's own identity: white paper, black ink and one pure blue accent. Serif for the few large
titles, Public Sans everywhere else, and small uppercase tabular labels for metadata.

- **Surfaces.** `background` is the page. `card` and `secondary` are the quiet fills of sheets and rows,
  `accent` the pressed fill, and `scrim` the shade under a sheet. The scrim uses black at
  18% opacity in light and 55% in dark.
- **Text.** `foreground` by default, `muted-foreground` for metadata. Every `x-foreground` is the text
  color on `x`, and each pair meets WCAG AA in both themes.
- **Edges.** `border` divides and may be faint. `input` is the edge of a control; it and `ring` stand
  at least 3:1 off `background` and `card`.
- **Meaning.** `primary` is the one accent: the Alpha mark, the send control, a selected item and the
  focus `ring`. `destructive` is only for an effect the owner confirms. `ok` and `warn` mark state.
- **Type.** `font-display` for a view's one title, `font-sans` for content, `font-mono` with uppercase and
  tabular numerals for labels, `font-legible` when the owner turns on legible text.
- **Shape.** One generous `radius`; sheets take `rounded-xl` on their top edge only.
- **Motion.** Sheets move on `ease-sheet`; everything else on `ease-standard`. Motion is removed under
  `prefers-reduced-motion`.
- **Dark.** Follows the owner's appearance setting; a `.dark` or `.light` class on the root overrides it.

Name a value by its token (`bg-primary`, `var(--primary)`), never by its value.

## Design tokens

<!-- tokens:start -->
| Color | Light | Dark |
| --- | --- | --- |
| `background` | oklch(1 0 0) | oklch(0.13 0 0) |
| `foreground` | oklch(0 0 0) | oklch(0.98 0 0) |
| `card` | oklch(0.985 0 0) | oklch(0.18 0 0) |
| `card-foreground` | oklch(0 0 0) | oklch(0.98 0 0) |
| `popover` | oklch(1 0 0) | oklch(0.18 0 0) |
| `popover-foreground` | oklch(0 0 0) | oklch(0.98 0 0) |
| `primary` | oklch(0.452 0.313 264.05) | oklch(0.72 0.16 264) |
| `primary-foreground` | oklch(1 0 0) | oklch(0.13 0 0) |
| `secondary` | oklch(0.967 0 0) | oklch(0.24 0 0) |
| `secondary-foreground` | oklch(0 0 0) | oklch(0.98 0 0) |
| `muted` | oklch(0.967 0 0) | oklch(0.24 0 0) |
| `muted-foreground` | oklch(0.525 0 0) | oklch(0.74 0 0) |
| `accent` | oklch(0.94 0 0) | oklch(0.28 0 0) |
| `accent-foreground` | oklch(0 0 0) | oklch(0.98 0 0) |
| `destructive` | oklch(0.55 0.22 27) | oklch(0.7 0.17 22) |
| `destructive-foreground` | oklch(1 0 0) | oklch(0.13 0 0) |
| `border` | oklch(0.922 0 0) | oklch(0.3 0 0) |
| `input` | oklch(0.62 0 0) | oklch(0.55 0 0) |
| `ring` | oklch(0.452 0.313 264.05) | oklch(0.72 0.16 264) |
| `ok` | oklch(0.52 0.14 150) | oklch(0.8 0.18 152) |
| `warn` | oklch(0.53 0.11 85) | oklch(0.84 0.15 90) |
| `info` | oklch(0.452 0.313 264.05) | oklch(0.72 0.16 264) |

| Token | Value |
| --- | --- |
| `radius` | 1rem |
| `font.sans` | "Public Sans", system-ui, sans-serif |
| `font.display` | "Denton", "Fraunces", Georgia, serif |
| `font.mono` | "Public Sans", system-ui, sans-serif |
| `font.legible` | "Atkinson Hyperlegible", "Public Sans", system-ui, sans-serif |
| `shadow.sm` | 0 1px 2px oklch(0 0 0 / 0.08) |
| `shadow.md` | 0 4px 12px oklch(0 0 0 / 0.12) |
| `shadow.lg` | 0 12px 32px oklch(0 0 0 / 0.2) |
| `breakpoint.sm` | 24rem |
| `breakpoint.md` | 40rem |
| `breakpoint.lg` | 56rem |
| `breakpoint.xl` | 72rem |
| `duration.fast` | 120ms |
| `duration.base` | 200ms |
| `duration.slow` | 320ms |
| `ease.standard` | cubic-bezier(0.2, 0, 0, 1) |
| `ease.sheet` | cubic-bezier(0.32, 0.72, 0, 1) |
<!-- tokens:end -->
