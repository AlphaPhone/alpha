# Alpha landing page

Run `node apps/site/build.mjs` from the repository root to build `apps/site/dist`.
The Home screenshot comes from `docs/assets/alpha-screens.png`.

The Alpha site workflow builds and deploys to the Cloudflare Pages project
`alphaphone` when site files or the shared Alpha mark change on `vibestack`.
It reads `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_PAGES_API_TOKEN` from the
`alpha-site-production` GitHub environment. Use a Cloudflare account API token
with Cloudflare Pages Edit for that account.
