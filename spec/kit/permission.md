# Permission

An Android permission: the microphone, the camera, location, the calendar,
photos, files, notifications. Android shows its own prompt once; after
that only its Settings can change the answer.

## Story: Ask for access

> As the owner, I want Alpha to ask for each access once, and afterwards to
> send me to Settings rather than ask again.

### A permission is unasked, granted, limited to part, or denied, and Alpha remembers having asked

```quint
type Grant = Unasked | Granted | Limited | Denied
type Permission = { grant: Grant, asked: bool }

pure val unasked: Permission = { grant: Unasked, asked: false }

pure def allows(p: Permission): bool = p.grant == Granted or p.grant == Limited
```

### Alpha asks only for what it lacks, and only once

```quint
pure def canAsk(p: Permission): bool = not(allows(p)) and not(p.asked)

pure def ask(p: Permission): Permission = { ...p, asked: true }
```

### What Android reports replaces what Alpha believed

```quint
pure def observe(p: Permission, grant: Grant): Permission = { ...p, grant: grant }
```

### After asking, what is still lacking or limited is changed in Android's Settings

```quint
pure def needsSettings(p: Permission): bool = p.asked and p.grant != Granted
```

### A permission is never asked for twice

```quint
pure def lawAskedOnce(grant: Grant, later: Grant): bool =
  not(canAsk(observe(ask({ grant: grant, asked: false }), later)))
```
