# Routes

Everything the phone may ask of the cloud, as one table: which service
routes exist for it, under which method and shape, and which credential
each travels with. The page names an address and a method; the phone looks
it up here before anything is sent, and what is not in the table never
leaves the phone. The [transport](./transport.md) sends the page's requests
through this table; [Sign-in](./signIn.md) and the [billing session](./session.md)
send theirs through it too; the [edge](./edge.md) is the other side of the
web host.

## Story: Ask the cloud only for what the app is for

> As the owner, I want my phone to call its cloud for my account, my plan,
> speech, maps, mail and calendar and nothing else, so that a page or an
> agent cannot use my sign-in for anything I was never shown.

### A call names a host, a family of routes, a method, and whether it carries a query or a body

`plain` says the address is spelled plainly: no user name, no fragment, no
escape, no doubled slash, and any identifier or map tile in it in range.

```quint
type Method = Get | Post | Patch | Delete
type Host = Api | StagingApi | WebHost | AnotherHost
type Family =
  | Account | KeyRevocation
  | Entitlement | EntitlementKeys | Redeem | Limits
  | Plans | Checkout | CheckoutConfirmation | Credits | Referrals | ReferralApply
  | Voice | MapsCapabilities | MapsQuery | MapsTile
  | GoogleStatus | GoogleAccounts | GoogleConnect | GoogleDisconnect
  | GmailRead | GmailWrite | CalendarRead | CalendarSyncCapabilities | CalendarSyncEvent
  | Jobs
  | SignInToken | SignInAcknowledgement
  | PlanReview | PlanConfirmation | PlanPayment | Cancellation | CancellationUndo
  | CommandLineSession | Pairing | HostedAgents | Unlisted
type Call = { host: Host, family: Family, method: Method, query: bool, body: bool, plain: bool }
```

### Each family travels with one credential: the phone's key, a billing session, a sign-in proof, or none at all

A command-line session, pairing with a remote agent and hosted agents
travel with none: the agent runs on the phone, and the phone signs in
itself. Whatever the table does not list travels with none either.

```quint
type Bearer = PhoneKey | BillingSession | SignInProof | Nobody

pure def needs(family: Family): Bearer =
  if (family == SignInToken or family == SignInAcknowledgement) SignInProof
  else if (family == PlanReview or family == PlanConfirmation or family == PlanPayment
    or family == Cancellation or family == CancellationUndo) BillingSession
  else if (family == CommandLineSession or family == Pairing or family == HostedAgents or family == Unlisted) Nobody
  else PhoneKey
```

### Each family has one shape under each method it allows

Reads are bare or carry a query; what changes something is a post with a
body and no query. Revoking the phone's own key is the only bare delete. A
calendar event is read or deleted by a query and written by a body.

```quint
type Shape = Bare | WithBody | WithQuery | WithoutQuery | WithoutBody | Never

pure def shape(family: Family, method: Method): Shape =
  if (method == Get) (
    if (family == Account or family == Entitlement or family == EntitlementKeys or family == Limits
      or family == Plans or family == Referrals or family == MapsCapabilities or family == MapsTile
      or family == GoogleStatus or family == GoogleAccounts) Bare
    else if (family == GmailRead or family == CalendarRead or family == Jobs) WithoutBody
    else if (family == CalendarSyncCapabilities or family == CalendarSyncEvent) WithQuery
    else Never)
  else if (method == Post) (
    if (family == Redeem or family == Checkout or family == CheckoutConfirmation or family == Credits
      or family == ReferralApply or family == Voice or family == MapsQuery or family == CalendarSyncEvent
      or family == SignInToken or family == SignInAcknowledgement
      or family == PlanReview or family == PlanConfirmation or family == Cancellation or family == CancellationUndo) WithBody
    else if (family == GoogleConnect or family == GoogleDisconnect or family == GmailWrite) WithoutQuery
    else if (family == PlanPayment) Bare
    else Never)
  else if (method == Patch) (if (family == CalendarSyncEvent) WithBody else Never)
  else if (family == KeyRevocation) Bare
  else if (family == CalendarSyncEvent) WithQuery
  else Never

pure def fits(form: Shape, query: bool, body: bool): bool =
  if (form == Bare) not(query) and not(body)
  else if (form == WithBody) not(query) and body
  else if (form == WithQuery) query and not(body)
  else if (form == WithoutQuery) not(query)
  else if (form == WithoutBody) not(body)
  else false
```

### A call is sent only to the API of the cloud this build ships against, plainly spelled, in its family's shape, with its family's credential

A build made for development may also reach the staging API.

```quint
pure def admitted(c: Call, bearer: Bearer, development: bool): bool =
  c.plain and (c.host == Api or (development and c.host == StagingApi))
    and bearer != Nobody and needs(c.family) == bearer
    and fits(shape(c.family, c.method), c.query, c.body)

pure def asked(host: Host, family: Family, method: Method, query: bool, body: bool, plain: bool): Call =
  { host: host, family: family, method: method, query: query, body: body, plain: plain }
```

### A command-line session, pairing and hosted agents are refused however they are asked for

```quint
pure def lawRefusedFamiliesAreRefusedHoweverAsked(host: Host, method: Method, query: bool, body: bool, bearer: Bearer, development: bool): bool =
  not(admitted(asked(host, CommandLineSession, method, query, body, true), bearer, development))
    and not(admitted(asked(host, Pairing, method, query, body, true), bearer, development))
    and not(admitted(asked(host, HostedAgents, method, query, body, true), bearer, development))
    and not(admitted(asked(host, Unlisted, method, query, body, true), bearer, development))
```

### A build that is distributed calls the production API and no other host

```quint
pure def lawADistributedBuildCallsOnlyProduction(host: Host, family: Family, method: Method, query: bool, body: bool, plain: bool, bearer: Bearer): bool =
  admitted(asked(host, family, method, query, body, plain), bearer, false) implies host == Api
```

### The web host, and every other host, is never called

```quint
pure def lawOnlyAnApiIsCalled(family: Family, method: Method, query: bool, body: bool, bearer: Bearer, development: bool): bool =
  not(admitted(asked(WebHost, family, method, query, body, true), bearer, development))
    and not(admitted(asked(AnotherHost, family, method, query, body, true), bearer, development))
```

### An address that is not plainly spelled is refused

```quint
pure def lawAnOddAddressIsRefused(host: Host, family: Family, method: Method, query: bool, body: bool, bearer: Bearer, development: bool): bool =
  not(admitted(asked(host, family, method, query, body, false), bearer, development))
```

### Changing or cancelling a plan never travels with the phone's key, and nothing else travels with a billing session

```quint
pure def planChange(family: Family): bool =
  family == PlanReview or family == PlanConfirmation or family == PlanPayment
    or family == Cancellation or family == CancellationUndo

pure def lawPlanChangesTravelOnlyWithABillingSession(host: Host, family: Family, method: Method, query: bool, body: bool, development: bool): bool =
  val c = asked(host, family, method, query, body, true)
  (admitted(c, PhoneKey, development) implies not(planChange(family)))
    and (admitted(c, BillingSession, development) implies planChange(family))
```

### Sign-in sends only the token exchange and its acknowledgement, and they carry no credential the phone already holds

```quint
pure def lawSignInSendsOnlyItsTwoRoutes(host: Host, family: Family, method: Method, query: bool, body: bool, development: bool): bool =
  val c = asked(host, family, method, query, body, true)
  (admitted(c, SignInProof, development) implies (
    (family == SignInToken or family == SignInAcknowledgement) and method == Post and body and not(query)))
    and (admitted(c, PhoneKey, development) implies (family != SignInToken and family != SignInAcknowledgement))
```

### A read carries no body, and only a calendar event is patched

```quint
pure def lawReadsCarryNoBody(host: Host, family: Family, query: bool, body: bool, bearer: Bearer, development: bool): bool =
  admitted(asked(host, family, Get, query, body, true), bearer, development) implies not(body)

pure def lawOnlyACalendarEventIsPatched(host: Host, family: Family, query: bool, body: bool, bearer: Bearer, development: bool): bool =
  admitted(asked(host, family, Patch, query, body, true), bearer, development) implies family == CalendarSyncEvent
```

### The only things deleted are the phone's own key and a calendar event

```quint
pure def lawDeletesAreTheKeyOrAnEvent(host: Host, family: Family, query: bool, body: bool, bearer: Bearer, development: bool): bool =
  admitted(asked(host, family, Delete, query, body, true), bearer, development) implies (
    (family == KeyRevocation and not(query) and not(body)) or (family == CalendarSyncEvent and query and not(body)))
```

### Whatever touches money is a post with a body and no query

A membership code, a checkout and its confirmation, a credit top-up, a
referral code, and every plan change but the payment step of an upgrade.

```quint
pure def touchesMoney(family: Family): bool =
  family == Redeem or family == Checkout or family == CheckoutConfirmation or family == Credits
    or family == ReferralApply or planChange(family)

pure def lawMoneyIsAPostWithABody(host: Host, family: Family, method: Method, query: bool, body: bool, bearer: Bearer, development: bool): bool =
  (touchesMoney(family) and admitted(asked(host, family, method, query, body, true), bearer, development)) implies (
    method == Post and not(query) and (body or family == PlanPayment))
```

### Every service the app is for can be reached in its own shape

The table is not so strict that the app loses a service: the account, the
plan, membership codes, referrals, speech, maps, mail, calendar, jobs, the
key's revocation, sign-in, and each plan change can all be sent.

```quint
pure def reaches(family: Family, method: Method, query: bool, body: bool, bearer: Bearer, development: bool): bool =
  admitted(asked(Api, family, method, query, body, true), bearer, development)

pure def lawEveryServiceIsReachable(development: bool): bool =
  reaches(Account, Get, false, false, PhoneKey, development) and reaches(KeyRevocation, Delete, false, false, PhoneKey, development)
    and reaches(Entitlement, Get, false, false, PhoneKey, development) and reaches(EntitlementKeys, Get, false, false, PhoneKey, development)
    and reaches(Redeem, Post, false, true, PhoneKey, development) and reaches(Limits, Get, false, false, PhoneKey, development)
    and reaches(Plans, Get, false, false, PhoneKey, development) and reaches(Checkout, Post, false, true, PhoneKey, development)
    and reaches(CheckoutConfirmation, Post, false, true, PhoneKey, development) and reaches(Credits, Post, false, true, PhoneKey, development)
    and reaches(Referrals, Get, false, false, PhoneKey, development) and reaches(ReferralApply, Post, false, true, PhoneKey, development)
    and reaches(Voice, Post, false, true, PhoneKey, development) and reaches(MapsCapabilities, Get, false, false, PhoneKey, development)
    and reaches(MapsQuery, Post, false, true, PhoneKey, development) and reaches(MapsTile, Get, false, false, PhoneKey, development)
    and reaches(GoogleStatus, Get, false, false, PhoneKey, development) and reaches(GoogleAccounts, Get, false, false, PhoneKey, development)
    and reaches(GoogleConnect, Post, false, false, PhoneKey, development) and reaches(GoogleDisconnect, Post, false, false, PhoneKey, development)
    and reaches(GmailRead, Get, true, false, PhoneKey, development) and reaches(GmailWrite, Post, false, true, PhoneKey, development)
    and reaches(CalendarRead, Get, true, false, PhoneKey, development) and reaches(CalendarSyncCapabilities, Get, true, false, PhoneKey, development)
    and reaches(CalendarSyncEvent, Patch, false, true, PhoneKey, development) and reaches(CalendarSyncEvent, Delete, true, false, PhoneKey, development)
    and reaches(Jobs, Get, false, false, PhoneKey, development)
    and reaches(SignInToken, Post, false, true, SignInProof, development) and reaches(SignInAcknowledgement, Post, false, true, SignInProof, development)
    and reaches(PlanReview, Post, false, true, BillingSession, development) and reaches(PlanConfirmation, Post, false, true, BillingSession, development)
    and reaches(PlanPayment, Post, false, false, BillingSession, development) and reaches(Cancellation, Post, false, true, BillingSession, development)
    and reaches(CancellationUndo, Post, false, true, BillingSession, development)
```

## Story: Leave the app only for Google, the checkout and an invoice

> As the owner, I want the only pages Alpha opens outside itself to be
> Google's consent, the payment page of a checkout I started, and the
> invoice of an upgrade I confirmed.

### The phone opens three hosts outside the cloud, each only for the answer of the route that leads there

Google's accounts host after asking to connect Google; the checkout host
after starting a checkout or a credit top-up; the invoice host after
confirming an upgrade that needs a payment step. Always over a secure
connection on the usual port, never with a user name in the address.

```quint
type Outside = GoogleSignIn | CheckoutPage | InvoicePage | AnotherPage

pure def pageAfter(family: Family): Outside =
  if (family == GoogleConnect) GoogleSignIn
  else if (family == Checkout or family == Credits) CheckoutPage
  else if (family == PlanConfirmation or family == PlanPayment) InvoicePage
  else AnotherPage

pure def mayOpen(family: Family, outside: Outside, secure: bool, usualPort: bool, userinfo: bool): bool =
  secure and usualPort and not(userinfo) and outside != AnotherPage and pageAfter(family) == outside
```

### No other page is opened, and none over an insecure connection

```quint
pure def lawOnlyThreeHostsAreOpened(family: Family, secure: bool, usualPort: bool, userinfo: bool): bool =
  not(mayOpen(family, AnotherPage, secure, usualPort, userinfo))

pure def lawAnOutsidePageIsOpenedSecurely(family: Family, outside: Outside, usualPort: bool, userinfo: bool): bool =
  not(mayOpen(family, outside, false, usualPort, userinfo)) and not(mayOpen(family, outside, true, false, userinfo))
    and not(mayOpen(family, outside, true, true, true))
```

### A refused route leads to no page

```quint
pure def lawARefusedRouteOpensNothing(outside: Outside, secure: bool, usualPort: bool, userinfo: bool): bool =
  not(mayOpen(CommandLineSession, outside, secure, usualPort, userinfo))
    and not(mayOpen(Pairing, outside, secure, usualPort, userinfo))
    and not(mayOpen(HostedAgents, outside, secure, usualPort, userinfo))
```
