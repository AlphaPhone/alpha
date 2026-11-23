# Account

The owner's Eliza Cloud account on the phone (PRD AP-03, AP-12). The agent always runs on the
phone; Cloud is a managed-services provider only: sign-in, subscription, metered inference and
speech, Maps, and the managed Google connection. There is no hosted agent, no provisioning and no
pairing. Every account-bound state, request and result belongs to the account it was read for, and
none survives a sign-out or an account switch. Membership and credits are read from Cloud by this
area itself, never through the resident agent (P-59). Codes, keys, sessions and OAuth material
stay in the native host; the renderer sees attempt numbers, steps and outcomes.

The build carries one deployment: the shipped Eliza Cloud, or Alpha Cloud when the
`ALPHA_CLOUD_CUTOVER` flag is on (off by default, never in a distributed build).

- [Session](./session.md): the signed-in account, its key's expiry and renewal, sign-out, the managed routes and the protected power launch's account.
- [Sign-in](./signIn.md): Alpha's own sign-in screen, its readiness check, network state and codes.
- [Development bridge](./devBridge.md): the test-mocks browser bridge's own sign-in.
- [Plan admission](./plan.md): the subscription entitlement, its offline grace, plan rechecks and the Ready card's AI chip.
- [Billing](./billing.md): plans, checkout, plan changes, funds, membership codes and referrals.
- [Account sheet](./sheet.md): the account presentation, sign-out review and plan notice.
- [Google](./google.md): the managed Google connection, its consent and its returns.
- [AI provider](./provider.md): Cloud inference or the owner's own keys, saved in the native host.
- [Agent access](./agentAccess.md): the owner's switches for agent writes through Google.
- [Delegation](./delegation.md): the Cloud delegation for hosted results and its return.
- [Dedicated setup](./dedicated.md): the test-mocks review of a dedicated Cloud agent.
- [Limits](./limits.md): Cloud's service limits and their waits, shared with voice.
