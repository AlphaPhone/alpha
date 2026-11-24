# Alpha landing page

Run `node apps/site/build.mjs` from the repository root to build `apps/site/dist`.
The Home and Calendar screenshots come from `docs/assets/alpha-screens.png`. The
Chat backdrop comes from `docs/assets/alpha-screens-more.png`. The conversation
is staged in the browser and makes no service requests.

The Alpha site workflow builds and deploys to the Cloudflare Pages project
`alphaphone` when site files or the shared Alpha mark and font change on GitHub
`main`. It can also run on demand on `main`. The Pages project uses the
`vibestack` production label for these uploads.

Allow `main` in the `alpha-site-production` GitHub environment. Set the
`CLOUDFLARE_ACCOUNT_ID` variable and the `CLOUDFLARE_PAGES_API_TOKEN` secret
there. The token needs Cloudflare Pages Edit for the account.
