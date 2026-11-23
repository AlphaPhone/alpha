# Browser page context for Alpha

Status (2026-11-23): ported to the vibestack app; renderer and Chromium tests only. On the Pixel
image no page is read: a public page goes as withheld `unreadable`, a sensitive one as
`sensitive-page` (see [Device status](#device-status)).
Owner request: when the owner talks to Alpha while a Browser page is open, the agent gets that page
as context.

## Where it lives

The rules are in [`apps/app/spec/browser/pageContext.md`](../apps/app/spec/browser/pageContext.md):
which message may read a page, how long it waits, what a withheld page keeps, the bounds of the
page, the peer that may receive it, page links and the refused page-text read. The assistant's side
(asking Browser once per turn and sending what it was handed) is the rule "A turn carries the page
Browser hands it for the observed tab, beside the observation, only to a peer that declares it" in
[`apps/app/spec/assistant/context.md`](../apps/app/spec/assistant/context.md). The setting is
"The open Browser page goes with a chat turn only while Browser page for Alpha is on" in
[`apps/app/spec/settings/preferences.md`](../apps/app/spec/settings/preferences.md).

| Part | Source |
| --- | --- |
| Page read for one message: gating, the page-read machine, the wait, the recheck, the links the message carried | `apps/app/src/browser/pageContext.vibe` (`BrowserPageContext`) |
| The contract: `pageAddress`, `agentPageTitle`, `admittedPage` (bounds, plain text, HTTPS links, 16 KB) and `boundPage` (binds a read to the observed tab and revision; a refused read goes as `unreadable`) | `apps/app/src/browser/page-context.ts` |
| Sending it: `pageForTurn` asks Browser only for an observed turn on a Browser tab, `wirePage` shapes the turn context's `browserPage` | `apps/app/src/assistant/browser-page.vibe`, called from `apps/app/src/assistant/composer.vibe` |
| Native read on Android: `AlphaBrowser.pageContext` runs `AlphaPageContext.SCRIPT` in the tab's isolated reading world | `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaBrowserPlugin.java`, `android/app/src/main/java/ai/alphacompute/alphaphone/browser/AlphaPageContext.java` |
| Browser build read: the public address fetched again without credentials | `apps/app/src/browser/page-text.ts` |
| The refusal for a page-text request and the page-link card notice | `apps/app/src/browser/messages.ts` (`NO_PAGE_READ`, `PAGE_LINK_UNREVIEWED`) |
| Settings → Privacy → Browser page for Alpha (on by default, like Location for Alpha) | `apps/app/src/settings/preferences.vibe`, `apps/app/src/web/settings/PrivacyPages.tsx` |

## How a page reaches the agent

1. **Gate.** A message reads a page only when its observation is the non-sensitive Browser view,
   its selected `browser-tab` is the tab Browser shows on the unlocked phone at the same revision,
   that tab is a normal (never private) tab with a settled public HTTPS page, Browser page for Alpha
   is on, and the peer takes the page. Preferences that cannot be read share no page.
2. **Read.** On Android the native tab host reads the page in the tab's isolated world with Alpha's
   script. It reads no field values, editable regions, frames or storage; withholds a page with a
   visible password, one-time-code or card field or credential-like text; masks six-to-eight digit
   runs; keeps headings, list items and lines; keeps the head, tail and on-screen part of long text;
   and offers up to 20 public HTTPS links that neither sign in nor act when opened, headline-like
   links first. The browser build fetches the public address again without credentials.
3. **Bind.** The answer counts only for the tab, revision and navigation the read began on, and
   only while it is the latest message's read. The setting and the shown page are checked again
   before the page is handed over. A sensitive page keeps only its origin and path, and a read the
   contract refuses is sent as `unreadable` with the address and title it would have had.
4. **Send.** The page rides in the message metadata as the turn context's `browserPage`, beside the
   observation, never in the message text. It goes only to the peer compared for this turn (the
   process instance the client learned and compared from a fresh status, which takes the optional
   turn-context fields); Eliza's `encodeTurnContext` drops it for any other peer. Nothing of it is
   stored.
5. **Agent.** The agent renders it once, for the current message only, inside the shared
   untrusted-content envelope with the page origin. History keeps message text only.
6. **Page links.** "Open the second story" proposes `browser_navigate` with that link's exact
   address. An exact link of the page the latest message carried keeps its review card and opens
   only after the owner approves it; any other address the owner did not type gets a notice.
7. **No separate read.** A `get-text` view interaction is refused with where the page comes from
   (`NO_PAGE_READ`); only back, forward and reload are Browser view commands from chat.

## Latency

A message waits at most 1.2 s for its page; a refused, slow, changed or invalid read sends it
without the page. On the phone Browser also captures the shown page ahead of a message (700 ms
after the tab loads it, and when the assistant opens over Browser unless a capture under 20 s old
holds) and keeps one capture in memory for its tab, revision and navigation, for at most 10
minutes. A message with a capture of its page waits at most 250 ms for a fresher read and then
sends the capture. With the setting off nothing is captured, and private tabs are never read. The
exact rule is "On the phone Browser captures the shown page ahead of a message, and a message with
a capture of its page waits at most 250 ms for a fresher read" in the spec.

On the model side the page sits in the current turn's segment after the history, so it never
changes the prefix a provider caches; at most 6,000 characters of text (about 1,500 tokens).

## Device status

On the Pixel image the page is not read. The image ships AOSP WebView 145, which does not offer
`JS_INJECTION_IN_FRAME_AND_WORLD`, so Browser cannot create the isolated reading world:
`AlphaBrowser.readingSupport()` reports `available: false`. `pageContext` still checks the tab
first: a private tab or a page that is not public HTTPS is refused and nothing goes, and a sensitive
address is withheld as `sensitive-page` with only its origin. Every other public page goes as
withheld `unreadable` with its address and title, so a message on such a page carries only those
two. The same WebView gap disables Read aloud and Ask about page on the image.

This lasts until the image ships a WebView with `JS_INJECTION_IN_FRAME_AND_WORLD` (Chromium 146 or
later). A build of the current stable WebView for the image is in progress. The agent side is being
changed so that, for an `unreadable` page, the agent says it cannot read the page instead of
proposing a reload.

## Tests

| Check | Covers | Does not prove |
| --- | --- | --- |
| `apps/app/test/browser/pageContext.test.vibe` | gating, binding to tab and revision, the wait, withheld forms, bounds, page-link cards, the refused page-text read | Android, a WebView or a model |
| `apps/app/test/assistant/upstream.test.vibe` ("Let my agent read the page I have open in Browser", page-link card) | the page in `metadata.browserPage` only with the setting on and only for the compared peer; a page link keeps its card | a real agent's prompt |
| `apps/app/test/settings/settings.test.vibe` | Browser page for Alpha: on by default, turned off, kept across an update | |
| `apps/app/test/browser/pageContextScript.browser.test.ts` (`pnpm test:browser`) | the `AlphaPageContext.SCRIPT` text block, Java escapes undone, in Chromium on fixture pages, its results admitted by `admittedPage` | Android WebView's isolated world |
| `test/browser-page-context-native.test.mjs` (held in `test/root-tests.json`: it needs JDK 21 and the pinned org.json jar, which the verify job does not prepare; run it locally with `node --test`) | `AlphaPageContext` validators on the host JVM, and that the compiled script is the text the browser test runs | the plugin on a device |

Retired with this port (`scripts/legacy-retirement.json`, mapped to
`apps/app/spec/browser/pageContext.md`): `test/browser-page-context.test.mjs` (legacy renderer
modules that no longer exist), `test/browser/page-context-script.spec.ts` (ported to the Vitest
browser test above) and `test/browser/browser-page-context.production.spec.ts` (the legacy flag-off
Playwright harness).

## Results recorded on develop (2026-11-22)

These were measured on the legacy renderer with the same Android script.

- Headless Chromium with a Pixel user agent at 412 px, 24 public pages. The shared read-aloud
  excerpt script refused or returned nothing for 9 (Wikipedia, NPR, GitHub, Allrecipes and Reddit
  refused; MDN, NYT and Yelp empty); the page-context script returned 2 empty (NYT, Yelp) and
  refused none, in 3 to 14 ms in the page. Bot walls (Amazon, IMDb, DuckDuckGo) return only their
  wall text with either script.
- On a link-aggregator page (Hacker News) the site's own navigation, user, time and hide links
  filled 17 of 20 link slots; headline-like links now come first and action links are never
  offered.
- A local resident agent with real captured pages answered from the page (Wikipedia, NPR, MDN, a
  GitHub README), ignored a page telling it to text a number, said a withheld bank page was
  withheld, and with elizaOS #40193 offered a review card for "open the second story".

Not yet checked: a real read on a device (blocked by the WebView above), a model turn on a device,
and owner acceptance.

## Design notes

Researched 2026-11-22 (Claude in Chrome, Playwright MCP, browser-use, Stagehand, Vercel
agent-browser, Gemini in Chrome, Edge Copilot, Comet, Dia, Brave Leo, Firefox AI chatbot):
send the page with the turn within a budget; fence page data with a marker the page cannot forge and
treat the address and title as untrusted too; keep enforcement outside the model; never share
private tabs, non-web schemes, sign-in pages or pages with password or one-time-code fields, and
never read input values; offer a visible off switch; give the agent link targets bound to the page
revision.

## Not in this change

- Clicking, typing or scrolling inside pages from chat.
- Other open tabs as context, and screenshots. "Show my open tabs" (`browser.tabs.show.v1`) shows
  Browser's own tab overview on the phone; the agent learns only whether it is showing, never a
  tab, title, address or count.
