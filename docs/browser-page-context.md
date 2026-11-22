# Browser page context for Alpha

Status: in progress (2026-11-22). Owner request: when the owner talks to Alpha
while a Browser page is open, the agent gets that page as context.

## Where Alpha stood

- Each chat turn carried only `clientDevice.context` (at most 2 KB): the view
  name plus an opaque `browser-tab` id and revision. The agent never saw the
  address, the title or any page text.
- The agent's one read path (`get-text` view interaction) was refused by
  `view-navigation.ts`. Page text reached the agent only when the owner chose
  **Ask about page** and released an excerpt in a review.
- The shared excerpt script (`BrowserPageReading.EXTRACT`) is a read-aloud
  safeguard: any six-to-eight digit number or "sign in"/"log in" wording in
  the article refuses the whole page. On 24 public pages it refused 6
  (Wikipedia, GitHub, NPR, Reddit, Allrecipes, a Wikipedia-style article) and
  returned nothing for 3 more (MDN, NYT, Yelp).
- Browser actions from chat: search, tab new/switch/close, find, history and
  `browser_navigate`. With no page context the agent could not name a link on
  the page, answer about it or summarize it.

## What other browser agents do

Researched 2026-11-22 (Claude in Chrome, Playwright MCP, browser-use 1.0,
Stagehand, Vercel agent-browser, Gemini in Chrome, Edge Copilot, Comet, Dia,
Brave Leo, Firefox AI chatbot).

- Send the page with the turn: address, title, selection and the visible main
  text, within a budget (Firefox 7,000 chars, Firefox Smart Window 10,000,
  browser-use `state()` 3,000 with 80% head and 20% tail).
- Fence page data with a marker the page cannot forge, name its origin, and
  state that it is data, never instructions (Brave Leo `<page>`, agent-browser
  nonce boundaries, Anthropic and Google guidance). Treat the URL and title as
  untrusted too.
- Keep enforcement outside the model: consequential actions are confirmed by
  trusted code (Comet, Gemini, Claude in Chrome).
- Never share private tabs, non-web schemes, sign-in pages or pages with
  password or one-time-code fields; never read input values. Offer a visible
  off switch (Edge "Context clues", Gemini, Dia).
- Give the agent link targets it can act on, tied to the page revision so a
  stale target is refused.

## What this change does

1. **Contract (elizaOS).** `clientDevice.browserPage`, beside the 2 KB
   observation: tab id and revision, address, title, capture time, visible
   text (at most 6,000 characters, head and tail kept with a cut marker),
   optional selection and up to 20 links. Strictly validated and at most
   12 KB. A peer declares it in `clientTurnObservationSupport` as the optional
   field `browserPage`.
2. **Prompt (elizaOS).** The agent renders it once, for the current message
   only, inside the shared untrusted-content envelope with the page origin. It
   is shown only when the turn's observation is Browser with the same tab and
   revision. History keeps message text only.
3. **Capture (Alpha, Android).** `AlphaBrowser.pageContext` runs Alpha's
   page-context script in the tab's isolated world. It refuses private tabs,
   non-HTTPS or sensitive addresses, and pages with password or one-time-code
   fields; it reads no input values, storage or frames, redacts long digit
   runs, and returns title and address only for a page it withholds.
4. **Send (Alpha renderer).** While Browser is on screen with a loaded public
   page and Browser page for Alpha is on, each ordinary turn waits at most
   1.2 s for a capture and sends it to a peer that declared `browserPage`.
5. **Settings.** Settings → Privacy → Browser page for Alpha (on by default,
   like Location for Alpha). The PRD records the decision.

## Todo and how each is checked

| # | Item | Check |
| --- | --- | --- |
| 1 | Contract type, parser, size bounds, support field | upstream node:test: valid page, every bound, unknown keys, control characters, oversize |
| 2 | Prompt projection with fence and binding to the observed tab | upstream vitest: segment text, forged markers neutralized, wrong tab or view drops it, history unaffected |
| 3 | Page-context extraction script | Playwright on fixtures (password field, OTP, digits, hidden text, links) and a live 24-page corpus compared with the old script |
| 4 | Native `pageContext` method | emulator: real WebView pages through `Capacitor.nativePromise`, private tab refused |
| 5 | Renderer reader, gating and timeout | node tests: setting off, private tab, loading page, other view, timeout, unsupported peer |
| 6 | End-to-end agent prompt | local resident agent: a turn with a captured page, inspect the assembled prompt |
| 7 | Settings toggle and PRD line | production Playwright settings spec |
| 8 | Builds | `bun run verify`, `bun run android:build:local`, both variants |

## Not in this change

- Clicking, typing or scrolling inside pages from chat. Opening a link the
  page shows already works through `browser_navigate`, with its review card.
- Other open tabs as context, and screenshots.
