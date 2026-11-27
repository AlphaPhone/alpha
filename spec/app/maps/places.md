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

### At most 200 places are saved: a full list only renames

```quint
pure val maxSaved = 200

pure def hasRoom(saved: List[Saved], place: int): bool = isSaved(saved, place) or saved.length() < maxSaved

pure def lawAFullListOnlyRenames(saved: List[Saved], place: int, name: str): bool =
  (hasRoom(saved, place) and saved.length() <= maxSaved) implies named(saved, place, name).length() <= maxSaved
```

### A phone updated from the previous Alpha keeps its saved places

The previous Alpha kept its saved places in its own list on the phone. A
list this version has never written takes that list once, in its order, as
if each place were saved again: a place Google served, one without a name
or valid coordinates, the same place twice and anything past 200 are
skipped. A previous list that cannot be read leaves this version's list
empty and usable, and the previous list is only read, never written or
removed.

```quint
pure def adopted(saved: List[Saved]): List[Saved] =
  saved.foldl(List(), (taken, s) => if (s.place > 0 and s.name != "" and not(isSaved(taken, s.place)) and taken.length() < maxSaved) taken.append(s) else taken)

pure def lawAnAdoptedListIsSavedOncePerPlaceUnderAName(saved: List[Saved]): bool =
  distinctAndNamed(adopted(saved)) and adopted(saved).length() <= maxSaved

pure def lawAnAdoptedListKeepsTheFirstOfEachPlace(saved: List[Saved]): bool =
  saved.every(s => (s.place > 0 and s.name != "" and saved.length() <= maxSaved) implies isSaved(adopted(saved), s.place))
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

## Story: Keep only what identifies a saved place

> As the owner, I want my phone to keep of a saved place only its name and
> what finds it again, and the same place never saved twice.

### A saved place keeps its name, its coordinates and the provider's identity of it, and nothing else

No address, hours, number or website is kept. Two places are the same when
their provider and its id for them match, or, for places no provider named,
when their coordinates match exactly. Coordinates are whole millionths of a
degree, and a place's number is never given to another.

```quint
type Kept = { name: str, lat: int, lng: int, provider: str, providerPlaceId: str }

pure def samePlace(one: Kept, other: Kept): bool =
  if (one.provider != "" or other.provider != "") one.provider == other.provider and one.providerPlaceId == other.providerPlaceId
  else one.lat == other.lat and one.lng == other.lng

pure val oneValues = Set(
  { name: "Home", lat: 43730000, lng: 7420000, provider: "", providerPlaceId: "" },
  { name: "Cafe", lat: 43731000, lng: 7421000, provider: "osm", providerPlaceId: "n1" },
  { name: "Other", lat: 43731000, lng: 7421000, provider: "", providerPlaceId: "" },
)
pure val otherValues = oneValues

pure def lawSamePlaceIsMutual(one: Kept, other: Kept): bool = samePlace(one, other) == samePlace(other, one)

pure def lawAPlaceIsItself(one: Kept): bool = samePlace(one, one)
```

### A saved provider place is used only with the open-data provider that served it

A saved place of another provider, or of a Google provider, is shown under
its name and can be removed, but is restricted as Google content is and is
never offered as a starting point. With no starting point the owner can
use, the directions read "Choose your location, a saved place or a place by
its name as the starting point."

```quint
pure def servedHere(provider: str, serving: str, google: bool): bool =
  provider == "" or (provider == serving and not(google))

pure val providerValues = Set("", "osm", "google")
pure val servingValues = Set("osm", "google")

pure def lawAnotherProvidersPlaceIsRestricted(provider: str, serving: str, google: bool): bool =
  (provider != "" and (provider != serving or google)) implies not(servedHere(provider, serving, google))
```
