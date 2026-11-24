# Alpha landing page

Run `node apps/site/build.mjs` from the repository root to build `apps/site/dist`.

The page keeps one phone in view while the visitor scrolls: Home, then a
passage each for Calendar, Messages and calls, Maps, Inbox and Voice, and the
phone plays that passage's scene. The phone's screen is drawn in the page's
HTML and CSS after the app's own Home and conversation, sized from a 360 by
780 screen, so it stays sharp at any width. `public/demo.js` picks the scene
from the scroll position and stages its beats; every conversation is staged in
the browser and makes no service requests. Without the script the page reads
whole and the phone rests on Home, and under reduced motion each scene is
shown complete. `alpha-home.webp`, cut from `docs/assets/alpha-screens.png`,
remains as the social card.

The Alpha site workflow builds and deploys to the Cloudflare Pages project
`alphaphone` when site files or the shared Alpha mark and font change on `vibestack`.
It reads `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_PAGES_API_TOKEN` from the
`alpha-site-production` GitHub environment. Use a Cloudflare account API token
with Cloudflare Pages Edit for that account.
