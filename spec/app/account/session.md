# Session

The Alpha Cloud account signed in on this phone, held here and nowhere
else. [Sign-in](./signIn.md) hands over an account it verified; the
session stores it only once the [agent](./index.md) is held stopped,
signs out the same way, and ends the sign-in when Cloud refuses it.
Every other machine of the account takes the current sign-in from here
as an event parameter, `currentSignIn` below, and is reset when it changes.
The phone's secure store keeps the sign-in itself; the session only
knows which account it is, the number of the sign-in and when it ends.

## Story: Hold the account signed in

> As the owner, I want one answer to who is signed in, changed only when
> the phone has stored or removed my sign-in.

### The session holds the account signed in, the number of its sign-in, how it was made and when it ends, the change in flight, the sign-out review and what to tell the owner

```quint
import review as V from "../../kit/review"

type Method = Email | Phone | Google
type Work = Resting | Holding | Storing | Leaving | Removing
type Ending = ByOwner | ByCloud
type Notice = Quiet | SignedOut | Ended
type Trouble = Fine | NotStored | NotSignedOut
type Effect = HoldAgent | ReleaseAgent | StoreSignIn({ ticket: int }) | RemoveSignIn({ ticket: int }) | NewSignIn({ signIn: int })
type Session = {
  account: int, signIn: int, how: Method, restored: bool, endsAt: int,
  work: Work, pending: int, pendingHow: Method, ending: Ending, ticket: int,
  leave: V::Review, notice: Notice, devices: bool, trouble: Trouble,
}
type Moved = { state: Session, out: List[Effect] }

pure val initial: Session = {
  account: 0, signIn: 0, how: Email, restored: false, endsAt: 0,
  work: Resting, pending: 0, pendingHow: Email, ending: ByOwner, ticket: 0,
  leave: V::unreviewed, notice: Quiet, devices: false, trouble: Fine,
}

pure val accountValues = Set(0, 1, 2)
pure val signInValues = Set(0, 1, 3)
pure val ticketValues = Set(1, 2, 3, 4)
pure val nowValues = Set(0, 500, 5000)
pure val endsAtValues = Set(1000)
pure val weight_agentHeld = 10
pure val weight_signInStored = 10
```

### The current sign-in is its number while an account is signed in, and none otherwise

```quint
pure def currentSignIn(s: Session): int = if (s.account > 0) s.signIn else 0

pure def alwaysASignInIsNumbered(s: Session): bool =
  s.account >= 0 and s.signIn >= 0 and (s.account > 0 implies s.signIn > 0)
```

### A change in flight names the account it stores, or the account it removes

```quint
pure def alwaysAChangeNamesItsAccount(s: Session): bool = and {
  (s.work == Holding or s.work == Storing) iff s.pending > 0,
  (s.work == Leaving or s.work == Removing) implies s.account > 0,
}
```

### Every request to the phone takes the next number

```quint
pure def ticketed(out: List[Effect]): bool =
  out.some(e => match e { | StoreSignIn(x) => true | RemoveSignIn(x) => true | _ => false })

pure def stepEveryRequestTakesTheNextNumber(before: Session, after: Session, out: List[Effect]): bool =
  out.every(e => match e {
    | StoreSignIn(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | RemoveSignIn(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | _ => true
  }) and (ticketed(out) or after.ticket == before.ticket)
```

## Story: Store a new sign-in

> As the owner, I want the account I signed in with stored only while the
> agent is stopped, and the agent started again on it.

### A verified sign-in waits for the agent to be held before the phone stores it

A sign-in made while another is held keeps the earlier one until the new
one is stored: this is how the owner renews.

```quint
pure def canAdmit(s: Session, account: int, method: Method): bool = account > 0 and s.work == Resting

pure def admit(s: Session, account: int, method: Method): Moved =
  { state: { ...s, work: Holding, pending: account, pendingHow: method, trouble: Fine, leave: V::dismiss(V::revise(s.leave)) },
    out: List(HoldAgent) }

pure def canAgentHeld(s: Session): bool = s.work == Holding or s.work == Leaving

pure def agentHeld(s: Session): Moved =
  if (s.work == Holding) { state: { ...s, work: Storing, ticket: s.ticket + 1 }, out: List(StoreSignIn({ ticket: s.ticket + 1 })) }
  else { state: { ...s, work: Removing, ticket: s.ticket + 1 }, out: List(RemoveSignIn({ ticket: s.ticket + 1 })) }
```

### A sign-in is stored or removed only once the agent is held for it, and every change lets the agent go when it ends

```quint
pure def stepASignInIsStoredOrRemovedOnlyOnceTheAgentIsHeld(before: Session, via: str, after: Session, out: List[Effect]): bool =
  out.every(e => match e {
    | StoreSignIn(x) => via == "agentHeld" and before.work == Holding
    | RemoveSignIn(x) => via == "agentHeld" and before.work == Leaving
    | _ => true
  })

pure def stepEveryChangeHoldsTheAgentFirst(before: Session, after: Session, out: List[Effect]): bool =
  (before.work == Resting and after.work != Resting) implies out == List(HoldAgent)

pure def stepTheAgentIsLetGoWhenAChangeEnds(before: Session, via: str, after: Session, out: List[Effect]): bool =
  (via == "signInStored" or via == "signedOut") implies out.includes(ReleaseAgent)
```

### Only the phone's answer stores the sign-in; one it could not store leaves the earlier sign-in, and the owner is told

When the new sign-in replaces an earlier one that the phone could not
confirm as ended, the owner is told to check their devices.

```quint
pure def canSignInStored(s: Session, ticket: int): bool = s.work == Storing and ticket == s.ticket

pure def signInStored(s: Session, ticket: int, ok: bool, revoked: bool, endsAt: int): Moved =
  if (ok)
    { state: { ...s, account: s.pending, signIn: s.signIn + 1, how: s.pendingHow, restored: false, endsAt: endsAt,
        work: Resting, pending: 0, notice: Quiet, devices: s.devices or (s.account > 0 and not(revoked)), leave: V::revise(s.leave) },
      out: List(ReleaseAgent, NewSignIn({ signIn: s.signIn + 1 })) }
  else { state: { ...s, work: Resting, pending: 0, trouble: NotStored }, out: List(ReleaseAgent) }
```

### The account changes only on the phone's word, and every new sign-in is told to the plan and to Google

```quint
pure def stepTheAccountChangesOnlyOnThePhonesWord(before: Session, via: str, after: Session): bool =
  (after.account != before.account or after.signIn != before.signIn)
    implies (via == "signInStored" or via == "signedOut" or via == "restart" or via == "erase")

pure def stepEveryNewSignInIsTold(before: Session, via: str, after: Session, out: List[Effect]): bool =
  (currentSignIn(after) != currentSignIn(before) and via != "restart" and via != "erase")
    implies out.includes(NewSignIn({ signIn: currentSignIn(after) }))
```

### An owner can sign in with a code

```quint
pure def sometimesSignedInWithACode(s: Session): bool = s.account > 0 and s.how == Email and not(s.restored)
```

### An owner can sign in with Google

```quint
pure def sometimesSignedInWithGoogle(s: Session): bool = s.account > 0 and s.how == Google and not(s.restored)
```

### A sign-in the phone could not store can leave the owner signed out

```quint
pure def sometimesNotStored(s: Session): bool = s.trouble == NotStored and s.account == 0
```

### A renewal can wait for the agent while the earlier sign-in is kept

```quint
pure def sometimesRenewingKeepsTheAccount(s: Session): bool = s.work == Holding and s.account > 0
```

## Story: Sign out

> As the owner, I want to sign out only after confirming it for the
> account I was shown, and to be told when it is done.

### Sign-out is reviewed for the account signed in, with nothing else under way

```quint
pure def canAskSignOut(s: Session): bool = s.account > 0 and s.work == Resting and not(s.leave.showing)

pure def askSignOut(s: Session): Session = { ...s, leave: V::present(s.leave) }

pure def canKeepSignedIn(s: Session): bool = s.leave.showing

pure def keepSignedIn(s: Session): Session = { ...s, leave: V::dismiss(s.leave) }

pure def alwaysSignOutIsReviewedOnlyWhileSignedIn(s: Session): bool =
  s.leave.showing implies (s.account > 0 and s.work == Resting)
```

### Confirming holds the agent, then asks the phone to remove the sign-in, and only the phone's answer signs out

A sign-in the phone could not remove stays, and the owner is told.

```quint
pure def canConfirmSignOut(s: Session): bool = V::canConfirm(s.leave) and s.account > 0 and s.work == Resting

pure def confirmSignOut(s: Session): Moved =
  { state: { ...s, leave: V::confirm(s.leave), work: Leaving, ending: ByOwner, trouble: Fine }, out: List(HoldAgent) }

pure def canSignedOut(s: Session, ticket: int): bool = s.work == Removing and ticket == s.ticket

pure def signedOut(s: Session, ticket: int, removed: bool): Moved =
  if (removed)
    { state: { ...s, account: 0, work: Resting, notice: if (s.ending == ByOwner) SignedOut else Ended, leave: V::revise(s.leave) },
      out: List(ReleaseAgent, NewSignIn({ signIn: 0 })) }
  else { state: { ...s, work: Resting, trouble: NotSignedOut }, out: List(ReleaseAgent) }
```

### A sign-in is removed only when the owner confirmed it or Cloud ended it

```quint
pure def stepASignInIsRemovedOnlyWhenConfirmedOrEnded(before: Session, via: str, after: Session): bool =
  (after.work == Leaving and before.work != Leaving)
    implies ((via == "confirmSignOut" and V::canConfirm(before.leave)) or via == "cloudRefused" or via == "lapsed")
```

### The owner is told of a sign-out, and of an earlier sign-in that could not be confirmed as ended until they dismiss it, across restarts

```quint
pure def canDismissNotice(s: Session): bool = s.notice != Quiet

pure def dismissNotice(s: Session): Session = { ...s, notice: Quiet }

pure def canDismissDevices(s: Session): bool = s.devices

pure def dismissDevices(s: Session): Session = { ...s, devices: false }

pure def stepCheckDevicesStaysUntilDismissed(before: Session, via: str, after: Session): bool =
  before.devices implies (after.devices or via == "dismissDevices" or via == "erase")
```

### An owner can be signed out and told so

```quint
pure def sometimesSignedOutAndTold(s: Session): bool = s.account == 0 and s.notice == SignedOut
```

### A sign-out can fail and leave the owner signed in

```quint
pure def sometimesASignOutFails(s: Session): bool = s.trouble == NotSignedOut and s.account > 0
```

### An owner can be told to check their devices after a restart

```quint
pure def sometimesToldToCheckDevicesAfterARestart(s: Session): bool = s.devices and s.restored and s.account > 0
```

## Story: Renew my sign-in

> As the owner, I want to see in Account when my sign-in is about to
> end, renew it there, and have it ended only when Cloud itself refuses
> it.

### A sign-in near its end is shown in Account with Renew, and never as a Home notice

Renew opens [Sign-in](./signIn.md); the account stays signed in until the
new sign-in is stored.

```quint
pure val renewWindow = 259200

pure def renewOffered(s: Session, now: int): bool = s.account > 0 and s.work == Resting and now >= s.endsAt - renewWindow

pure def onHome(s: Session): bool = s.notice != Quiet or s.devices

pure def lawANearEndIsShownInAccountNotOnHome(now: int): bool =
  val s = { ...initial, account: 1, signIn: 1, endsAt: now + 60 }
  renewOffered(s, now) and not(onHome(s)) and admit(s, 1, Email).state.account == 1
```

### Only Cloud refusing the sign-in itself ends it: a refusal by the agent or another service never does

The plan's check reports Cloud's refusal. A sign-in past its end is
ended the same way. Ending holds the agent and removes the sign-in, and
the owner is asked to sign in again.

```quint
type Source = CloudSignIn | AgentRequest | OtherService

pure def canCloudRefused(s: Session, source: Source): bool = s.account > 0 and s.work == Resting and source == CloudSignIn

pure def cloudRefused(s: Session, source: Source): Moved =
  { state: { ...s, work: Leaving, ending: ByCloud, leave: V::dismiss(s.leave), trouble: Fine }, out: List(HoldAgent) }

pure def canLapsed(s: Session, now: int): bool = s.account > 0 and s.work == Resting and now >= s.endsAt

pure def lapsed(s: Session, now: int): Moved = cloudRefused(s, CloudSignIn)

pure def lawOnlyCloudRefusingTheSignInEndsIt(source: Source): bool =
  canCloudRefused({ ...initial, account: 1, signIn: 1 }, source) iff source == CloudSignIn
```

### An owner can be asked to sign in again after Cloud ended the sign-in

```quint
pure def sometimesEndedByCloud(s: Session): bool = s.account == 0 and s.notice == Ended
```

## Story: Use Alpha before signing in

> As the owner, I want Alpha usable without a sign-in when I bring my
> own key, and never to be sent to the sign-in page just because the
> phone is offline.

### Alpha asks for a sign-in only when none is saved and the owner's own key is not in use

Offline or not, a saved sign-in is used as it is; reconnecting it only
checks the plan again ([Plan](./plan.md)) and never restarts the agent.
Startup and the shell take this fact.

```quint
pure def signInRequired(s: Session, ownKey: bool): bool = s.account == 0 and not(ownKey)

pure def lawASavedSignInIsNeverAskedFor(ownKey: bool): bool =
  not(signInRequired({ ...initial, account: 1, signIn: 1 }, ownKey)) and (signInRequired(initial, ownKey) iff not(ownKey))
```

## Story: Keep my sign-in across a restart

> As the owner, I want my sign-in, and what I still need to be told, to
> survive Alpha restarting, and whatever was under way to end cleanly.

### A restart takes the account and its sign-in from the phone, ends what was under way, and keeps the notices

Requests numbered before the restart are refused after it.

```quint
pure def canRestart(s: Session, account: int, signIn: int): bool = account >= 0 and signIn >= 0 and (account > 0 implies signIn > 0)

pure def restart(s: Session, account: int, signIn: int, endsAt: int): Session =
  val same = account == s.account and signIn == s.signIn
  { ...s, account: account, signIn: if (account > 0) signIn else s.signIn, restored: if (same) s.restored else account > 0,
    endsAt: if (account > 0) endsAt else 0, work: Resting, pending: 0,
    leave: V::dismiss(V::revise(s.leave)), trouble: Fine }
```

### A sign-in the phone stored before a restart is found after it

```quint
pure def sometimesSignedInAfterARestart(s: Session): bool = s.account > 0 and s.restored
```

## Story: Erase Alpha

> As the owner, I want erasing Alpha to leave no sign-in behind.

### Erasing leaves no account, nothing under way and nothing to tell, and refuses every answer still in flight

```quint
pure def erase(s: Session): Session =
  { ...s, account: 0, endsAt: 0, work: Resting, pending: 0, notice: Quiet, devices: false,
    leave: V::dismiss(V::revise(s.leave)), trouble: Fine }

pure def stepErasingLeavesNoSignIn(before: Session, via: str, after: Session): bool =
  via == "erase" implies (after.account == 0 and after.work == Resting and not(onHome(after)))
```
