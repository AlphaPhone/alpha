# Password entry

The New password and Edit password form: a name, a user name, the websites
it is for, and a password the owner types or asks the vault to generate.
The form is a part of the [vault](./index.md), which holds it with the
typed password beside it, sends what it saves and forgets it; this spec
says what the form itself keeps.

## Story: Write a password entry

> As the owner, I want to name a password, say which websites it is for,
> type one or have a strong one generated, and save it only when it is
> complete.

### A form is closed, new or an edit; it knows whether it has a name and a website, whether a password is typed, or the length of one to generate

A typed password is a secret: the vault holds it beside the form until it
takes it, and it is never shown, logged or given to the agent. A generated
password is made by the vault and never passes through the form.

```quint
type SecretPassword = str
type Form = Closed | New | Edit
type Problem = Fine | NoDetails | Retype | NoPassword | Refused
type Entry = {
  form: Form, named: bool, website: bool, typed: bool,
  generate: bool, chars: int, dropped: bool, confirmDelete: bool, problem: Problem,
}

pure val closed: Entry = {
  form: Closed, named: false, website: false, typed: false,
  generate: false, chars: 20, dropped: false, confirmDelete: false, problem: Fine,
}
```

### Only whether a password was typed is ever let out of it

The form learns whether the password field is empty, and nothing else
about the password.

```quint
pure def declassifyTyped(p: SecretPassword): bool = p != ""
```

### A new form starts empty; an edit starts from the entry's name, user name and websites, and keeps its password unless one is typed or generated

```quint
pure def startNew(e: Entry): Entry = { ...closed, form: New }

pure def startEdit(e: Entry): Entry = { ...closed, form: Edit, named: true, website: true }
```

### Every change to a field clears the problem shown

```quint
pure def details(e: Entry, named: bool, website: bool): Entry = { ...e, named: named, website: website, problem: Fine }

pure def typePassword(e: Entry, typed: bool): Entry =
  { ...e, typed: typed, generate: false, dropped: e.dropped and not(typed), problem: Fine }
```

### Generating drops a typed password, and a generated password is 16, 20 or 32 characters long

```quint
pure val lengths = Set(16, 20, 32)

pure def generate(e: Entry, chars: int): Entry =
  { ...e, generate: true, chars: if (lengths.contains(chars)) chars else 20, typed: false, dropped: false, problem: Fine }
```

### A save needs a name and a website, a new entry needs a password, and a password dropped by the lock must be typed again rather than quietly kept

```quint
pure def problemOf(e: Entry): Problem =
  if (not(e.named and e.website)) NoDetails
  else if (e.generate or e.typed) Fine
  else if (e.dropped) Retype
  else if (e.form == New) NoPassword
  else Fine
```

### When the unlock ends, the typed password is dropped and remembered as dropped, and the rest of the form is kept

```quint
pure def expire(e: Entry): Entry =
  { ...e, typed: false, dropped: e.form != Closed and (e.dropped or e.typed), confirmDelete: false }
```

### Delete asks for a second tap

```quint
pure def armDelete(e: Entry): Entry = { ...e, confirmDelete: true, problem: Fine }
```

### The vault refusing a save keeps the form, typed password included, and says so

```quint
pure def refuse(e: Entry): Entry = { ...e, problem: Refused }
```

### A typed password is dropped by the lock, and an edit whose password was dropped cannot be saved with the field left empty

```quint
pure def lawTheLockDropsOnlyThePassword(typed: bool): bool =
  val e = expire(typePassword(startEdit(closed), typed))
  not(e.typed) and e.form == Edit and e.named and e.website and problemOf(e) == (if (typed) Retype else Fine)
```

### A generated password leaves nothing typed in the form

```quint
pure def lawGeneratingHoldsNoTypedPassword(typed: bool, chars: int): bool =
  val e = generate(typePassword(startNew(closed), typed), chars)
  not(e.typed) and lengths.contains(e.chars) and problemOf({ ...e, named: true, website: true }) == Fine
```

### A form without a name or a website is never saved

```quint
pure def lawDetailsAreNeeded(typed: bool, named: bool): bool =
  problemOf(details(typePassword(startNew(closed), typed), named, false)) == NoDetails
```
