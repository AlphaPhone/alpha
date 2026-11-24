# Alpha landing page

Run `node apps/site/build.mjs` from the repository root to build `apps/site/dist`.
The Home and Calendar screenshots come from `docs/assets/alpha-screens.png`. The
Chat backdrop comes from `docs/assets/alpha-screens-more.png`. The conversation
is staged in the browser and makes no service requests.

The Alpha site workflow builds and deploys to the Cloudflare Pages project
`alphaphone` when site files or the shared Alpha mark and font change on `vibestack`.
It reads `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_PAGES_API_TOKEN` from the
`alpha-site-production` GitHub environment. Use a Cloudflare account API token
with Cloudflare Pages Edit for that account.
