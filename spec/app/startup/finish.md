# Finish

How the [Access](./access.md) walkthrough ends: whether the owner is set
up, whether this sign-in created the account, and whether "All set" shows
or the walkthrough ended quietly, still open to a late error. Access holds
one and moves it only through these.

## Story: Hear that all is set

> As a new owner, I want to be told when setup is done; as a returning
> one, I want to go straight Home unless something went wrong.

### The finish knows whether the owner is set up and new, whether "All set" shows, whether a quiet finish may still hear of trouble, and what went wrong

```quint
type Trouble = NoTrouble | ConnectionFailed | SignInNeedsAttention
type Finish = { setUp: bool, created: bool, allSet: bool, silent: bool, trouble: Trouble }

pure val unset: Finish = { setUp: false, created: false, allSet: false, silent: false, trouble: NoTrouble }
```

### Setting up shows "All set" at once for a new account whose walkthrough was already done, and ends quietly for one that is not new

```quint
pure def welcomed(f: Finish, created: bool, completed: bool): Finish =
  { setUp: true, created: created, allSet: completed and created, silent: completed and not(created), trouble: NoTrouble }
```

### A restart or signing out ends what was waiting for the owner

```quint
pure def restarted(f: Finish): Finish = { ...f, setUp: false, allSet: false, silent: false, trouble: NoTrouble }

pure def signedOut(f: Finish): Finish = { ...f, setUp: false, allSet: false, silent: false }
```

### The last step passed shows "All set" for a new account, and otherwise ends quietly

```quint
pure def finished(f: Finish): Finish = { ...f, allSet: f.created, silent: not(f.created) }
```

### A quiet finish hears of trouble only until the sign-in has settled, which is said or seen once nothing covers the walkthrough

```quint
pure def canTrouble(f: Finish, why: Trouble): bool = f.silent and why != NoTrouble

pure def troubled(f: Finish, why: Trouble): Finish = { ...f, allSet: true, silent: false, trouble: why }

pure def calmed(f: Finish): Finish = { ...f, silent: false }

pure def uncovered(f: Finish, covered: bool): Finish = { ...f, silent: f.silent and covered }
```

### Done ends "All set"

```quint
pure def dismissed(f: Finish): Finish = { ...f, allSet: false }
```

### "All set" for an account that is not new says what went wrong

```quint
pure def saysWhy(f: Finish): bool = (f.allSet and not(f.created)) implies f.trouble != NoTrouble

pure def lawAllSetForAnOldAccountComesOnlyWithTrouble(created: bool, completed: bool, why: Trouble): bool =
  val w = welcomed(unset, created, completed)
  saysWhy(w) and saysWhy(finished(w))
    and (canTrouble(w, why) implies saysWhy(troubled(w, why)))
```

### Once settled, a quiet finish hears of no trouble

```quint
pure def lawSettledHearsNoTrouble(created: bool, why: Trouble): bool =
  not(canTrouble(calmed(finished(welcomed(unset, created, true))), why))
```
