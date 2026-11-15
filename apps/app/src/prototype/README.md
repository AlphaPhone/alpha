# Product presentation

The renderer imports React from the application dependencies and `dc-lite.js` from
this source directory. `model.js` supplies presentation state; `template.html`
and `prototype.css` define the reference layout. Product adapters own real data,
capability policy and native actions. Synthetic model behavior must not be
presented as real account, device, payment or network state.

## Fixture data

All reference seed data lives in `fixtures.js`: people, calls, messages, mail,
calendar events, browser pages, photos, map places, notes, contacts, files,
wallet cards and passes, workflows, settings accounts and device facts, the
notification shade, quick-settings state, the heads-up banner, Home card
defaults, per-view suggestions, scripted replies and the scripted voice demo.
Every name, address, number and organisation in it is fictional.

`fixtures.empty.js` exports the same names with empty arrays, empty objects or
`null`. Builds without `ELIZA_DEV_ALLOW_TEST_MOCKS=1` resolve every import of
`./fixtures.js` to it, so production web and Android builds contain no seed data,
scripted replies or fixture images and start from empty, honest state.
`model.js` must render neutrally when a fixture value is empty: no simulated
voice, no canned replies, quick-settings tiles without an on/off state until a
fact is known, and explicit empty-state copy. `test/fixtures-parity.test.mjs`
keeps the two export lists identical, and `test/fixtures-swap.test.mjs` builds
the swapped bundle and checks that no fixture strings or images remain.

## Chat attachment picker

`attachment-picker.ts` selects authorized local Photos and Files for the composer.
Search, folders and multi-selection use metadata and thumbnails; Attach reads the
selected bytes. Cancel preserves the draft. Android Back clears search, then moves
up a folder, then closes. From computer is available only in the browser.

`chat-tools-adapter.ts` passes selections to shared intake, which owns supported
types, attachment count, the 20 MiB image limit, the 60 MiB aggregate limit and image
compression. Uploads occur on Send. Native Files reads require an opaque
`storageSelect` selection and the `chat` purpose; the selection grant is released
in `finally`. Owner, conversation, request and visibility checks discard late work.

The sheet inherits Public Sans controls, the Denton serif title and neutral Alpha
surfaces. Source segments use adaptive foreground/background colors; Attach and
selected checks use blue. Files and folders share aligned icon, name and trailing
columns. The sheet covers the assistant; its compact footer clears the bottom safe
area without padding for the hidden assistant dock. Loading, access, empty and
error states stay explicit. Browser previews do not qualify native permissions,
keyboard behavior, device acceptance or a live provider.

## Sources and licensing

Design source: https://alpha-phone-prototype.pages.dev/ (retrieved 2026-09-29).
Original HTML: 816757 bytes; SHA-256
`fd1ee08878c9ae8e8e0d112cc42e3b687326f290b1f86ddaca0f737cdb79afff`.
The supplied references remain under the repository's `design` directory.

`asset-manifest.json` records source URLs, sizes and SHA-256 hashes for the retained
images and fonts. Fonts and logos are public files under `apps/app/public`. The 42
generated reference photographs are fixture data under `fixtures/img/` and are
referenced only from `fixtures.js` with `new URL(..., import.meta.url)`, so they are
emitted only by test-mocks builds and never ship in production builds. They come
from the same design source as the layout (generated photography) and are used
only as reference imagery for the labeled mock mode and visual tests.
Public Sans faces use local files. The unavailable Fraunces text subset was
replaced with official Google Fonts full faces using the same family, weights and
optical axis; its recorded source describes those bytes. Denton is the primary
serif face. Original public React scripts and the unadapted helper are not runtime
dependencies and are not shipped.
