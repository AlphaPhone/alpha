# Home role

What Alpha does on its own, on an Alpha image, about the Home role and the
access the image gives it: once, it takes Home over from the launcher the
image shipped with, and it grants itself the access the image allows by
default. Alpha's role service on the phone does both; the startup area
starts it. Settings shows the role as the phone reports it, and Set as Home
is the owner's own request ([Facts](./facts.md)).

## Story: Alpha becomes Home only by the owner's word or a recorded upgrade

> As the owner, I want Alpha to take over Home from the launcher my phone
> shipped with once, safely, and never to take it back from an app I
> chose.

### The role service holds who has Home, the upgrade's receipt, Alpha's request to Android in flight, the owner's choice, and the default access

The receipt is kept on the phone: none yet, pending while the upgrade is
under way, or done. The owner chooses Home in Android's settings, and
grants or denies access there too.

```quint
import read as R from "../../kit/read"

type HomeHolder = Shipped | AlphaHolds | OtherHolds | NobodyHolds
type Receipt = NoReceipt | Pending | Done
type Default = Unset | Allowed | Denied
type Taken = Took | NotTaken | Lost

type Roles = {
  holder: HomeHolder, receipt: Receipt, grant: R::Read, giving: R::Read,
  chosen: bool, choice: HomeHolder, eligible: bool, access: Default,
}

type Effect = TakeHome({ grant: int }) | GiveBackHome({ giving: int })
type Asked = { state: Roles, out: List[Effect] }

pure val initial: Roles = {
  holder: Shipped, receipt: NoReceipt, grant: R::unread, giving: R::unread,
  chosen: false, choice: Shipped, eligible: true, access: Unset,
}

pure def busy(s: Roles): bool = s.grant.status == R::Loading or s.giving.status == R::Loading
```

### An automatic upgrade is recorded before Android is asked, and only while the image allows it and the owner has chosen nothing

Alpha asks to take Home only from the launcher the image shipped with, or
from no app after an upgrade that went half way.

```quint
pure def canPrepare(s: Roles): bool =
  s.eligible and not(s.chosen) and s.receipt != Done and not(busy(s))
    and (s.holder == Shipped or (s.holder == NobodyHolds and s.receipt == Pending))

pure def prepare(s: Roles): Asked =
  val asking = R::ask(s.grant)
  { state: { ...s, receipt: Pending, grant: asking }, out: List(TakeHome({ grant: asking.ticket })) }

pure def isTakeHome(e: Effect): bool = match e { | TakeHome(t) => true | _ => false }

pure def stepAnUpgradeIsRecordedBeforeAndroidIsAsked(before: Roles, via: str, after: Roles, out: List[Effect]): bool =
  out.some(e => isTakeHome(e)) implies (after.receipt == Pending and not(after.chosen) and before.eligible)
```

### Android takes Home for Alpha, does not, or takes it from the old launcher without giving it to Alpha

The receipt is done only once Alpha holds Home. If Alpha stops before
Android answers, the receipt stays pending.

```quint
pure val grantValues = Set(1, 2)

pure def canHomeTaken(s: Roles, grant: int, taken: Taken): bool = R::canAnswer(s.grant, grant)

pure def homeTaken(s: Roles, grant: int, taken: Taken): Roles =
  if (taken == Took) { ...s, grant: R::answer(s.grant, true), holder: AlphaHolds, receipt: Done }
  else if (taken == Lost) { ...s, grant: R::answer(s.grant, false), holder: NobodyHolds }
  else { ...s, grant: R::answer(s.grant, false) }
```

### When an upgrade left no app holding Home, Alpha gives it back to the launcher the image shipped with

```quint
pure val givingValues = Set(1, 2)

pure def canGiveBack(s: Roles): bool = s.holder == NobodyHolds and s.receipt == Pending and not(s.chosen) and not(busy(s))

pure def giveBack(s: Roles): Asked =
  val asking = R::ask(s.giving)
  { state: { ...s, giving: asking }, out: List(GiveBackHome({ giving: asking.ticket })) }

pure def canGivenBack(s: Roles, giving: int, ok: bool): bool = R::canAnswer(s.giving, giving)

pure def givenBack(s: Roles, giving: int, ok: bool): Roles =
  { ...s, giving: R::answer(s.giving, ok), holder: if (ok) Shipped else s.holder }
```

### The owner's choice of Home app in Android is final: it retires Alpha's request in flight and ends the upgrade

```quint
pure def drop(r: R::Read): R::Read = if (r.status == R::Loading) R::answer(r, false) else r

pure def ownerChose(s: Roles, holder: HomeHolder): Roles =
  { ...s, holder: holder, choice: holder, chosen: true, receipt: Done, grant: drop(s.grant), giving: drop(s.giving) }
```

### The owner's choice of Home app is never undone by an automatic upgrade

```quint
pure def alwaysTheOwnersChoiceStands(s: Roles): bool = s.chosen implies (s.holder == s.choice and s.receipt == Done)
```

### Alpha is waiting on Android only for an upgrade it recorded and the owner has not overruled

```quint
pure def alwaysAnUpgradeInFlightIsRecorded(s: Roles): bool =
  busy(s) implies (s.receipt == Pending and not(s.chosen) and not(s.grant.status == R::Loading and s.giving.status == R::Loading))
```

### Alpha starting again drops what it asked Android, and the upgrade goes on from its receipt

```quint
pure def restart(s: Roles): Roles = { ...s, grant: drop(s.grant), giving: drop(s.giving) }
```

### The image allows the upgrade, or stops allowing it, only between requests

The image allows it again when setup completes or Alpha is enabled again.

```quint
pure def canEligibility(s: Roles, eligible: bool): bool = not(busy(s))

pure def eligibility(s: Roles, eligible: bool): Roles = { ...s, eligible: eligible }
```

### A default grants access only where the image allows it and the owner has not decided; a denial the owner made in Android is never replaced by a default

```quint
pure def canGrantDefault(s: Roles): bool = s.eligible and s.access == Unset

pure def grantDefault(s: Roles): Roles = { ...s, access: Allowed }

pure def ownerSetAccess(s: Roles, allow: bool): Roles = { ...s, access: if (allow) Allowed else Denied }

pure def stepADefaultNeverReplacesTheOwner(before: Roles, via: str, after: Roles): bool =
  after.access != before.access implies (via == "ownerSetAccess" or (before.access == Unset and before.eligible))
```

### Alpha can take over Home

```quint
pure def sometimesAlphaTookHome(s: Roles): bool = s.holder == AlphaHolds and s.receipt == Done and not(s.chosen)
```

### Alpha can stop after asking, and go on from its pending receipt

```quint
pure def sometimesStoppedWhileAsking(s: Roles): bool = s.receipt == Pending and s.grant.status == R::Failed and s.holder == Shipped
```

### An upgrade that went half way can give Home back to the shipped launcher

```quint
pure def sometimesGivenBack(s: Roles): bool = s.holder == Shipped and s.receipt == Pending and s.giving.status == R::Loaded
```

### The owner can choose another Home app

```quint
pure def sometimesOwnerChoseAnother(s: Roles): bool = s.chosen and s.holder == OtherHolds
```

### The owner's denial can stand while the image allows a default

```quint
pure def sometimesDenialStands(s: Roles): bool = s.access == Denied and s.eligible
```
