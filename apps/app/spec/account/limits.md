# Service limits

What a Cloud refusal of a metered service tells the owner: a plan to choose or manage, an
allowance that resets, or a wait. Only a short limit code, a bounded wait and a bounded reset time
are kept from a refusal, never its text. Voice reads speech refusals (`voice-http-429`) through
these rules; chat reads plan and billing refusals, and any area reads a Cloud refusal through the
platform's `CloudUnavailable`, whose `retryAfter` is the wait in seconds and `resetAt` the epoch
milliseconds Cloud named for an allowance reset (spec/platform/index.md). These are pure readings
the areas import; the account area runs no service of its own for them.

## Story: Know when I can use a limited service again

> As the owner, I want a refused request to say whether I need a plan, when my allowance resets or
> how long to wait, so that I fix my account only when my account is the problem.

### A wait is between one second and one day, or there is none

`retryAfterSeconds` from the refusal body comes first, then a `Retry-After` header in seconds or as
an HTTP date, then `retryAt`. A `CloudUnavailable` already carries its wait and reset, which are
bounded the same way. A reset in the past, or more than 400 days ahead, is dropped.

```quint
pure val maxRetryAfterSeconds = 86400
pure val maxResetMillis = 400 * 86400000
pure def boundedWait(seconds: int): int =
  if (seconds < 0 or seconds > maxRetryAfterSeconds) 0 else if (seconds < 1) 1 else seconds
pure def boundedReset(resetAt: int, now: int): int = if (resetAt > now and resetAt - now <= maxResetMillis) resetAt else 0
pure val secondsValues = Set(-1, 0, 1, 30, 86400, 86401)
pure def lawAWaitIsNeverZeroOrUnbounded(seconds: int): bool =
  boundedWait(seconds) == 0 or (boundedWait(seconds) >= 1 and boundedWait(seconds) <= maxRetryAfterSeconds)
pure def lawANegativeWaitIsNone(seconds: int): bool = seconds < 0 implies boundedWait(seconds) == 0
pure def lawAResetIsInTheFuture(resetAt: int, now: int): bool = boundedReset(resetAt, now) != 0 implies boundedReset(resetAt, now) > now
```

### A refusal names a plan, an allowance or a wait, and a limit is shown only until it passes

```quint
type ServiceLimit = NoLimit | BillingRefused | SubscriptionRequired | AllowanceExhausted({ resetsAt: int }) | RateLimited({ retryAt: int })
type PlanCard = NoCard | ChoosePlanCard | ManagePlanCard
pure def planCardFor(limit: ServiceLimit): PlanCard = match limit {
  | NoLimit => NoCard
  | SubscriptionRequired => ChoosePlanCard
  | BillingRefused => ManagePlanCard
  | AllowanceExhausted(a) => ManagePlanCard
  | RateLimited(r) => NoCard
}
pure def limitShown(limit: ServiceLimit, now: int): bool = match limit {
  | NoLimit => false
  | AllowanceExhausted(a) => a.resetsAt > now
  | RateLimited(r) => r.retryAt > now
  | _ => true
}
pure val limitValues = Set(NoLimit, BillingRefused, SubscriptionRequired, AllowanceExhausted({ resetsAt: 5 }), RateLimited({ retryAt: 3 }))
pure val nowValues = Set(2, 4, 6)
pure def lawAWaitIsNeverAPlanCard(now: int): bool = planCardFor(RateLimited({ retryAt: now })) == NoCard
pure def lawAPassedWaitIsNotShown(limit: ServiceLimit, now: int): bool = match limit {
  | RateLimited(r) => r.retryAt <= now implies not(limitShown(limit, now))
  | AllowanceExhausted(a) => a.resetsAt <= now implies not(limitShown(limit, now))
  | _ => true
}
pure def lawAPlanRefusalOffersAPlan(now: int): bool = planCardFor(SubscriptionRequired) == ChoosePlanCard and planCardFor(BillingRefused) == ManagePlanCard
```

### Semantic end-of-turn has a daily quota, after which only a subscription continues

Clef end-of-turn in Cloud allows 2,000 turns a day, or 4,000 with operator credits or a paid plan;
past that only a subscription continues it. Responses name the quota's scope in
`X-Clef-Rate-Limit-Scope`; voice falls back to the long-gap endpoint while it is spent.

```quint
type ClefStanding = ClefFree | ClefFunded | ClefSubscribed
pure def clefDailyQuota(s: ClefStanding): int = if (s == ClefFree) 2000 else 4000
pure def clefContinues(s: ClefStanding, usedToday: int): bool = s == ClefSubscribed or usedToday < clefDailyQuota(s)
pure val usedTodayValues = Set(0, 1999, 2000, 3999, 4000)
pure def lawOnlyASubscriptionPassesTheQuota(s: ClefStanding, usedToday: int): bool =
  (usedToday >= 4000 and clefContinues(s, usedToday)) implies s == ClefSubscribed
```
