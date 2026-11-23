# Browser page context for Alpha

Status: implemented, not yet device-tested (2026-11-22). Owner request: when the owner talks to Alpha
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
- Rank the targets: on a link-aggregator page (Hacker News) the site's own
  navigation, user, time and hide links filled 17 of 20 slots and left three
  stories. Headline-like links (at least four words or 24 characters) now come
  first, and links to action endpoints (hide, vote, flag, delete, ...) are never
  offered, since opening one changes something.

## What this change does

1. **Contract (elizaOS).** `clientDevice.browserPage`, beside the 2 KB
   observation: tab id and revision, address, title, capture time, visible
   text (at most 6,000 characters, head and tail kept with a cut marker),
   optional selection and up to 20 links. Strictly validated and at most
   16 KB. A peer declares it in `clientTurnObservationSupport` as the optional
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
5. **Opening a page link (elizaOS [#40193](https://github.com/elizaOS/eliza/pull/40193)
   and Alpha).** "Open the second story" proposes `browser_navigate` with that
   link's exact url. The server used to ground every destination in an address
   the owner typed, so such an open was always refused. It now also accepts an
   exact link of the page the request carried, and the phone shows it on its
   review card: the page, not the owner, wrote the address, so it never opens
   on its own.
6. **Settings.** Settings → Privacy → Browser page for Alpha (on by default,
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

## Local results (2026-11-22)

Headless Chromium with a Pixel user agent at 412 px, against 24 public pages.
The machine was under heavy shared load, so several pages never finished loading
in either run; those are excluded.

| | Shared excerpt script | Page-context script |
| --- | --- | --- |
| Pages refused or empty (of those that loaded) | 9 (Wikipedia, NPR, GitHub, Allrecipes, Reddit refused; MDN, NYT, Yelp empty) | 2 empty (NYT, Yelp), none refused |
| Structure | one run of text | headings, list items and lines kept |
| Links | none | up to 20 public HTTPS targets |
| Script time | not measured | 3–14 ms in the page (ESPN, Craigslist, Wikipedia, NPR, Allrecipes; up to 6,500 elements) |

Bot walls (Amazon, IMDb, DuckDuckGo) return only their wall text with either
script. Wikipedia's mobile layout shows only the lead section until sections are
opened, and only visible text is read. The fixture spec
`test/browser/page-context-script.spec.ts` covers the safety rules on crafted
pages.

## What has been checked, and what has not

| Check | Result | What it does not prove |
| --- | --- | --- |
| Upstream contract and projection tests ([eliza#40067](https://github.com/elizaOS/eliza/pull/40067), merged as `fe5c02faed`) | pass | a model's use of the page |
| `test/browser/page-context-script.spec.ts`: the Java `SCRIPT` text block in Chromium | 8 of 8 | Android WebView's isolated world |
| `test/browser-page-context-native.test.mjs`: `AlphaPageContext` validators on the host JVM | pass | the plugin on a device |
| `test/browser-page-context.test.mjs`: gating, binding, timeout, peer support | 8 of 8 | |
| Production Playwright, flag-off bundle with a native-plugin stub (page context and Settings) | 21 of 21 | the native read |
| `bun run android:build --release` and `android:verify` | both variants built and verified; the release dex holds `pageContext` and its refusals | install, emulator or device |

Not yet checked: a real read on the Pixel (the emulator's WebView 133 lacks
`JS_INJECTION_IN_FRAME_AND_WORLD`, so it can only withhold as `unreadable`), a
model turn that uses the page, and owner acceptance.

## Not in this change

- Clicking, typing or scrolling inside pages from chat.
- Other open tabs as context, and screenshots.
