# Saved places

The places the owner keeps on the phone, each under a name of their own.
[Maps](./index.md) holds the list, writes it to the phone at every change,
and takes it back after a restart.

## Story: Keep my saved places

> As the owner, I want to save a place under a name, rename it or forget
> it, and find each place saved once.

### A saved place is a place on the map and the name the owner gave it

```quint
type Saved = { place: int, name: str }

pure def isSaved(saved: List[Saved], place: int): bool = saved.some(s => s.place == place)

pure val savedValues = Set(
  List(),
  List({ place: 1, name: "Home" }),
  List({ place: 1, name: "Home" }, { place: 2, name: "Work" }),
  List({ place: 1, name: "Home" }, { place: 1, name: "Work" }),
)
pure val placeValues = Set(0, 1, 2)
pure val nameValues = Set("", "Home", "Gym")
```

### Every saved place is a real place, saved once, under a name

```quint
pure def distinctAndNamed(saved: List[Saved]): bool =
  saved.every(s => s.place > 0 and s.name != "" and saved.select(o => o.place == s.place).length() == 1)
```

### Naming a place saves it, or renames it where it already is in the list

```quint
pure def named(saved: List[Saved], place: int, name: str): List[Saved] =
  if (isSaved(saved, place)) saved.listMap(s => if (s.place == place) { place: s.place, name: name } else s)
  else saved.append({ place: place, name: name })
```

### Forgetting a place takes it out of the list

```quint
pure def forgotten(saved: List[Saved], place: int): List[Saved] = saved.select(s => s.place != place)
```

### A named place is saved, and the list stays one entry per place, each named

```quint
pure def lawNamingSavesOnce(saved: List[Saved], place: int, name: str): bool =
  (distinctAndNamed(saved) and place > 0 and name != "") implies
    (distinctAndNamed(named(saved, place, name)) and isSaved(named(saved, place, name), place))
```

### A forgotten place is no longer saved, and the rest stay as they were

```quint
pure def lawForgettingKeepsTheRest(saved: List[Saved], place: int): bool =
  distinctAndNamed(saved) implies
    (distinctAndNamed(forgotten(saved, place)) and not(isSaved(forgotten(saved, place), place)))
```
