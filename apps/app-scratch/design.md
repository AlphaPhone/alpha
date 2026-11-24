# Design

Alpha Phone's own identity: white paper, black ink and one pure blue accent. Serif for the few large
titles, Public Sans everywhere else, and small uppercase tabular labels for metadata.

- **Surfaces.** `background` is the page. `card` and `secondary` are the quiet fills of sheets and rows,
  `accent` the pressed fill, `scrim` the shade under a sheet.
- **Text.** `foreground` by default, `muted-foreground` for metadata. Every `x-foreground` is the text
  color on `x`, and each pair meets WCAG AA in both themes.
- **Edges.** `border` divides and may be faint. `input` is the edge of a control; it and `ring` stand
  at least 3:1 off `background` and `card`.
- **Meaning.** `primary` is the one accent: the Alpha mark, the send control, a selected item and the
  focus `ring`. `destructive` is only for an effect the owner confirms. `ok` and `warn` mark state.
- **Type.** `font-serif` for a view's one title, `font-sans` for content, `font-mono` with uppercase and
  tabular numerals for labels, `font-legible` when the owner turns on legible text.
- **Shape.** One generous `radius`; sheets take `rounded-xl` on their top edge only.
- **Motion.** Sheets move on `ease-sheet`; everything else on `ease-standard`. Motion is removed under
  `prefers-reduced-motion`.
- **Dark.** Follows the owner's appearance setting; a `.dark` or `.light` class on the root overrides it.

Name a value by its token (`bg-primary`, `var(--primary)`), never by its value.
