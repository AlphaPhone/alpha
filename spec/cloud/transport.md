# Transport

The phone's one gate to the cloud for what the page asks: each request is
looked up in the [routes](./routes.md) before it is sent, travels with the
key [Sign-in](./signIn.md) keeps, and its answer is handed back only to the
signed-in account that asked. Sign-in and the [billing session](./session.md)
send their own routes from the phone itself; the page cannot send them
through this gate.

## Story: Send what the page asks, only when the routes allow it

> As the owner, I want every request the page makes to be checked before it
> leaves the phone, and an answer meant for one sign-in never to reach
> another, so that nothing the page does can use my key for something I was
> never shown.

### The gate numbers every request, holds those in flight with the key they were sent under, and knows whether this is a development build

A development build says so before its first request, and may then also
reach the staging API.

```quint
import routes as T from "./routes"

type Flight = { id: int, credential: int }
type Transport = { development: bool, credential: int, next: int, flights: List[Flight] }
type Effect =
  | Send({ id: int, call: T::Call, credential: int })
  | Refuse({ id: int })
  | Deliver({ id: int })
  | Abort({ id: int })
  | AbortAll({ credential: int })
type Moved = { state: Transport, out: List[Effect] }

pure val initial: Transport = { development: false, credential: 0, next: 0, flights: List() }

pure val credentialValues = Set(0, 1, 2)
pure val idValues = Set(0, 1, 2, 3)
pure val callValues = Set(
  { host: T::Api, family: T::Account, method: T::Get, query: false, body: false, plain: true },
  { host: T::Api, family: T::Voice, method: T::Post, query: false, body: true, plain: true },
  { host: T::StagingApi, family: T::Entitlement, method: T::Get, query: false, body: false, plain: true },
  { host: T::Api, family: T::HostedAgents, method: T::Get, query: false, body: false, plain: true },
  { host: T::Api, family: T::Cancellation, method: T::Post, query: false, body: true, plain: true },
  { host: T::Api, family: T::SignInToken, method: T::Post, query: false, body: true, plain: true },
  { host: T::WebHost, family: T::Account, method: T::Get, query: false, body: false, plain: true },
  { host: T::Api, family: T::Account, method: T::Get, query: false, body: false, plain: false },
  { host: T::Api, family: T::Account, method: T::Post, query: false, body: true, plain: true }
)
pure val weight_ask = 4
pure val weight_answer = 3
```

### A development build is declared before anything is sent

```quint
pure def canDevelop(s: Transport): bool = not(s.development) and s.next == 0

pure def develop(s: Transport): Transport = { ...s, development: true }
```

### The page's request is sent only when the routes admit it with the phone's key, and while a key is held; any other is refused before it leaves the phone

The phone chooses the credential, never the page: a request whose route
needs a sign-in proof or a billing session, or none, is refused here.

```quint
pure def admits(s: Transport, call: T::Call): bool =
  s.credential != 0 and T::admitted(call, T::PhoneKey, s.development)

pure def ask(s: Transport, call: T::Call): Moved =
  val id = s.next
  if (admits(s, call))
    { state: { ...s, next: id + 1, flights: s.flights.append({ id: id, credential: s.credential }) },
      out: List(Send({ id: id, call: call, credential: s.credential })) }
  else { state: { ...s, next: id + 1 }, out: List(Refuse({ id: id })) }
```

### An answer is delivered only for a request still in flight, once

An answer to a request that was refused, cancelled, already answered, or
sent under a key the phone no longer holds is dropped.

```quint
pure def inFlight(s: Transport, id: int): bool = s.flights.some(f => f.id == id)

pure def canAnswer(s: Transport, id: int): bool = inFlight(s, id)

pure def answer(s: Transport, id: int): Moved =
  { state: { ...s, flights: s.flights.select(f => f.id != id) }, out: List(Deliver({ id: id })) }
```

### The page can cancel a request in flight, and its answer is then dropped

```quint
pure def canCancel(s: Transport, id: int): bool = inFlight(s, id)

pure def cancel(s: Transport, id: int): Moved =
  { state: { ...s, flights: s.flights.select(f => f.id != id) }, out: List(Abort({ id: id })) }
```

### A new key, or signing out, aborts every request sent under the key before

```quint
pure def canUseKey(s: Transport, credential: int): bool = credential >= 0 and credential != s.credential

pure def useKey(s: Transport, credential: int): Moved =
  { state: { ...s, credential: credential, flights: List() }, out: List(AbortAll({ credential: s.credential })) }
```

### Every request in flight was sent under the key the phone holds now

```quint
pure def alwaysFlightsAreUnderTheKeyHeldNow(s: Transport): bool =
  s.flights.every(f => f.credential == s.credential and s.credential != 0)
```

### Every request in flight was numbered before the next one

```quint
pure def alwaysFlightsAreNumbered(s: Transport): bool = s.flights.every(f => 0 <= f.id and f.id < s.next)
```

### Numbers start from nought

Discovered by the proof: without it, a request sent first could not be
shown to carry a number of its own, since nothing said the next number is
never negative.

```quint
pure def alwaysNumbersStartFromNought(s: Transport): bool = s.next >= 0
```

### Only what the routes admit with the phone's key leaves the phone, under the key held now

```quint
pure def stepOnlyAdmittedRequestsLeave(before: Transport, via: str, after: Transport, out: List[Effect]): bool =
  out.every(e => match e {
    | Send(x) => via == "ask" and T::admitted(x.call, T::PhoneKey, before.development)
        and x.credential == before.credential and before.credential != 0 and x.id == before.next
    | _ => true
  })
```

### An answer is delivered only to a request that was in flight, and never again

```quint
pure def stepAnAnswerIsDeliveredOnce(before: Transport, after: Transport, out: List[Effect]): bool =
  out.every(e => match e {
    | Deliver(d) => inFlight(before, d.id) and not(inFlight(after, d.id))
    | _ => true
  })
```

### Every request gets a new number, sent or refused

```quint
pure def stepNumbersOnlyGrow(before: Transport, via: str, after: Transport): bool =
  after.next >= before.next and (via == "ask" implies after.next == before.next + 1)
```

### A hosted agent, a billing change and a sign-in route are never sent by the page

```quint
pure def lawThePageSendsOnlyPhoneKeyRoutes(credential: int, call: T::Call, development: bool): bool =
  admits({ ...initial, development: development, credential: credential }, call) implies T::needs(call.family) == T::PhoneKey
```

### A request can be in flight

```quint
pure def sometimesInFlight(s: Transport): bool = s.flights.length() > 0
```

### Two requests can be in flight at once in a development build

```quint
pure def sometimesTwoInFlight(s: Transport): bool = s.flights.length() > 1 and s.development
```
