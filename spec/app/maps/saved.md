# Saved places

The places the owner keeps in [Maps](./index.md), only on this phone, in
Alpha's own storage. A saved place keeps a name, its coordinates and, for a
provider's place, the provider's identity, and nothing else: no address,
hours or location history. A Google place is never saved.

## Story: Keep the places I care about on this phone

> As the owner, I want to save a place, rename it and remove it, and find it
> again from search, without the phone keeping what Google served.

### The saved places are at most 200, each under a number never given twice

```quint
import vocabulary.* from "./vocabulary"

type Saved = { id: int, label: str, lat: int, lng: int, provider: str, ref: str }
type Keeping = { label: str, lat: int, lng: int, provider: str, ref: str, kind: ProviderKind }
type Places = { items: List[Saved], nextId: int }

pure val initial: Places = { items: List(), nextId: 0 }

pure def samePlace(saved: Saved, place: Keeping): bool =
  if (place.provider != "") saved.provider == place.provider and saved.ref == place.ref
  else saved.provider == "" and saved.lat == place.lat and saved.lng == place.lng

pure def has(s: Places, id: int): bool = s.items.some(i => i.id == id)

pure val placeValues = Set(
  { label: "Home", lat: 43730000, lng: 7420000, provider: "", ref: "", kind: NoProvider },
  { label: "Cafe", lat: 43731000, lng: 7421000, provider: "osm", ref: "n1", kind: OpenProvider },
  { label: "Gallery", lat: 37795000, lng: -122394000, provider: "google", ref: "g1", kind: GoogleProvider },
  { label: "", lat: 1, lng: 1, provider: "", ref: "", kind: NoProvider })
pure val idValues = Set(1, 2, 3)
pure val labelValues = Set("", "Work")
```

### A place is saved with a name and a valid identity, and saving it again renames the same entry

A provider's place is the same place when the provider and its identity
match; a place without one when its coordinates match exactly. Saving,
removing and renaming each say so once done; a full list says to remove one
before adding another, and the 201st place is refused.

```quint
pure def canSavePlace(s: Places, place: Keeping): bool =
  mayKeep(place.kind) and place.label != "" and coordinateValid(place.lat, place.lng)
    and ((place.provider == "") iff (place.ref == ""))
    and (s.items.some(i => samePlace(i, place)) or s.items.length() < maxSaved)

pure def savePlace(s: Places, place: Keeping): Places =
  if (s.items.some(i => samePlace(i, place)))
    { ...s, items: s.items.listMap(i => if (samePlace(i, place)) { ...i, label: place.label } else i) }
  else {
    items: s.items.append({ id: s.nextId + 1, label: place.label, lat: place.lat, lng: place.lng, provider: place.provider, ref: place.ref }),
    nextId: s.nextId + 1,
  }

pure def lawAGooglePlaceIsNeverSaved(s: Places, place: Keeping): bool = place.kind == GoogleProvider implies not(canSavePlace(s, place))

pure def alwaysAtMost200Places(s: Places): bool = s.items.length() <= maxSaved

pure def alwaysEveryNumberWasGivenOnce(s: Places): bool =
  s.items.every(i => i.id >= 1 and i.id <= s.nextId and s.items.select(j => j.id == i.id).length() == 1)

pure def alwaysEveryPlaceIsNamedAndValid(s: Places): bool =
  s.items.every(i => i.label != "" and coordinateValid(i.lat, i.lng) and ((i.provider == "") iff (i.ref == "")))

pure def sometimesTwoSaved(s: Places): bool = s.items.length() >= 2
```

### A saved place can be renamed to a name that is not empty, and removed

```quint
pure def canRenamePlace(s: Places, id: int, label: str): bool = has(s, id) and label != ""

pure def renamePlace(s: Places, id: int, label: str): Places =
  { ...s, items: s.items.listMap(i => if (i.id == id) { ...i, label: label } else i) }

pure def canRemovePlace(s: Places, id: int): bool = has(s, id)

pure def removePlace(s: Places, id: int): Places = { ...s, items: s.items.select(i => i.id != id) }

pure def sometimesRenamed(s: Places): bool = s.items.some(i => i.label == "Work")

pure def sometimesRemovedThenSaved(s: Places): bool = s.nextId > s.items.length() and s.items.length() >= 1
```

### When Alpha opens again the saved places are as they were

Nothing is under way between two changes, so there is nothing to take up.

```quint
pure def reopen(s: Places): Places = s

pure def stepReopeningChangesNothing(before: Places, via: str, after: Places): bool = via == "reopen" implies after == before
```

### A saved provider place is used only with the open-data provider that served it

A saved place of another provider, or of a Google provider, is shown under
its name and can be removed, but is restricted as Google content is, and is
never a starting point: choosing it clears the starting point and its route
and asks nothing.

```quint
pure def savedLocal(provider: str, serving: str, servingKind: ProviderKind): bool =
  provider == "" or (provider == serving and servingKind == OpenProvider)

pure val providerValues = Set("", "osm", "google")
pure val servingValues = Set("", "osm")

pure def lawAnotherProvidersPlaceIsRestricted(provider: str, serving: str, servingKind: ProviderKind): bool =
  (provider != "" and provider != serving) implies not(savedLocal(provider, serving, servingKind))

pure def lawAGoogleProvidersPlaceIsRestricted(provider: str, serving: str): bool =
  provider != "" implies not(savedLocal(provider, serving, GoogleProvider))
```
