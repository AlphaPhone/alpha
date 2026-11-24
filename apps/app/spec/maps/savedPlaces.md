# Saved places

Saved places live only on this phone, in the owner's private storage. A saved
place keeps a name, its coordinates and, for a provider place, the provider's
identity, and nothing else: no address, hours or location history. A Google
place is never saved. Coordinates are whole millionths of a degree.

## Domain

### The store holds at most 200 places, each with an id never reused

```quint
import vocabulary.* from "./vocabulary"

type SavedItem = { id: int, label: str, lat: int, lng: int, provider: str, providerPlaceId: str }
type SaveRequest = { label: str, lat: int, lng: int, provider: str, providerPlaceId: str, kind: ProviderKind }
type SavedPlaces = { items: List[SavedItem], nextId: int }
pure val initial: SavedPlaces = { items: List(), nextId: 0 }
pure def coordinateValid(lat: int, lng: int): bool = lat >= -90000000 and lat <= 90000000 and lng >= -180000000 and lng <= 180000000
pure def samePlace(saved: SavedItem, place: SaveRequest): bool =
  if (place.provider != "") saved.provider == place.provider and saved.providerPlaceId == place.providerPlaceId
  else saved.provider == "" and saved.lat == place.lat and saved.lng == place.lng
pure def has(s: SavedPlaces, id: int): bool = s.items.some(i => i.id == id)
pure val placeValues = Set(
  { label: "Home", lat: 43730000, lng: 7420000, provider: "", providerPlaceId: "", kind: NoProvider },
  { label: "Cafe", lat: 43731000, lng: 7421000, provider: "osm", providerPlaceId: "n1", kind: OpenProvider },
  { label: "Gallery", lat: 37795000, lng: -122394000, provider: "google", providerPlaceId: "g1", kind: GoogleProvider },
  { label: "", lat: 1, lng: 1, provider: "", providerPlaceId: "", kind: NoProvider })
pure val idValues = Set(1, 2, 3)
pure val labelValues = Set("", "Work")
```

## Story: Keep the places I care about on this phone

> As the owner, I want to save a place, rename it and remove it, and find it
> again from search, without the phone keeping what Google served.

### A place is saved with a name and a valid identity; saving it again updates the same row

A provider place is the same place when the provider and its id match; a
place without one when its coordinates match exactly. Saving says "Place saved
on this device.", removing "Place removed from saved." and renaming "Saved
place renamed."; a full list says "Saved places are full. Remove one before
adding another." The 201st place is
refused. A stored list that
cannot be read is never written over, and a change is reported done only
after the stored list reads back as written.

```quint
pure def canSavePlace(s: SavedPlaces, place: SaveRequest): bool =
  mayKeep(place.kind) and place.label != "" and coordinateValid(place.lat, place.lng) and
  ((place.provider == "") iff (place.providerPlaceId == "")) and
  (s.items.some(i => samePlace(i, place)) or s.items.length() < maxSaved)
pure def savePlace(s: SavedPlaces, place: SaveRequest): SavedPlaces =
  if (s.items.some(i => samePlace(i, place)))
    { ...s, items: s.items.listMap(i => if (samePlace(i, place)) { ...i, label: place.label } else i) }
  else {
    items: s.items.append({ id: s.nextId + 1, label: place.label, lat: place.lat, lng: place.lng, provider: place.provider, providerPlaceId: place.providerPlaceId }),
    nextId: s.nextId + 1,
  }
pure def lawAGooglePlaceIsNeverSaved(s: SavedPlaces, place: SaveRequest): bool = place.kind == GoogleProvider implies not(canSavePlace(s, place))
pure def alwaysAtMost200Places(s: SavedPlaces): bool = s.items.length() <= maxSaved
pure def alwaysIdsAreDistinctAndIssued(s: SavedPlaces): bool =
  s.items.every(i => i.id >= 1 and i.id <= s.nextId and s.items.select(j => j.id == i.id).length() == 1)
pure def alwaysEveryPlaceIsNamedAndValid(s: SavedPlaces): bool =
  s.items.every(i => i.label != "" and coordinateValid(i.lat, i.lng) and ((i.provider == "") iff (i.providerPlaceId == "")))
pure def sometimesSaved(s: SavedPlaces): bool = s.items.length() >= 2
```

### A saved place can be renamed to a non-empty name and removed

```quint
pure def canRenamePlace(s: SavedPlaces, id: int, label: str): bool = has(s, id) and label != ""
pure def renamePlace(s: SavedPlaces, id: int, label: str): SavedPlaces =
  { ...s, items: s.items.listMap(i => if (i.id == id) { ...i, label: label } else i) }
pure def canRemovePlace(s: SavedPlaces, id: int): bool = has(s, id)
pure def removePlace(s: SavedPlaces, id: int): SavedPlaces = { ...s, items: s.items.select(i => i.id != id) }
pure def sometimesRenamed(s: SavedPlaces): bool = s.items.some(i => i.label == "Work")
pure def sometimesRemovedThenSaved(s: SavedPlaces): bool = s.nextId > s.items.length() and s.items.length() >= 1
```

### A phone updated from the previous Alpha keeps its saved places

The previous Alpha kept the saved places in its own list on this phone. When this version has never
saved a place (its list is empty and has issued no id), it takes that list once, in its order, as if
each place were saved again: a Google place, a place without a name or valid coordinates, the same
place twice and anything past 200 are skipped, and each kept place gets a new id. Once this version
has saved, renamed or removed a place, or taken the previous list, it never takes it again. A
previous list that cannot be read leaves this version's list empty and untouched. The previous list
is never written or removed.

```quint
pure def keptOf(place: SaveRequest, s: SavedPlaces): SavedPlaces =
  if (canSavePlace(s, place) and not(s.items.some(i => samePlace(i, place)))) savePlace(s, place) else s
pure def canAdoptPrevious(s: SavedPlaces, places: List[SaveRequest]): bool = s.nextId == 0 and s.items.length() == 0 and places.length() > 0
pure def adoptPrevious(s: SavedPlaces, places: List[SaveRequest]): SavedPlaces = places.foldl(s, (acc, place) => keptOf(place, acc))
pure def stepThePreviousListIsTakenOnlyByAnUnusedList(before: SavedPlaces, via: str, after: SavedPlaces): bool =
  via == "adoptPrevious" implies (before.nextId == 0 and before.items.length() == 0)
pure def stepAdoptedPlacesAreNumberedAfresh(before: SavedPlaces, via: str, after: SavedPlaces): bool =
  via == "adoptPrevious" implies after.nextId == after.items.length()
pure def lawAPreviousGooglePlaceIsSkipped(place: SaveRequest): bool =
  place.kind == GoogleProvider implies adoptPrevious(initial, List(place)) == initial
pure def lawTheFirstPreviousPlaceIsKept(place: SaveRequest): bool =
  canSavePlace(initial, place) implies adoptPrevious(initial, List(place)).items.length() == 1
pure val placesValues = Set(
  List({ label: "Home", lat: 43730000, lng: 7420000, provider: "", providerPlaceId: "", kind: NoProvider },
    { label: "Gallery", lat: 37795000, lng: -122394000, provider: "google", providerPlaceId: "g1", kind: GoogleProvider },
    { label: "Cafe", lat: 43731000, lng: 7421000, provider: "osm", providerPlaceId: "n1", kind: OpenProvider },
    { label: "Home again", lat: 43730000, lng: 7420000, provider: "", providerPlaceId: "", kind: NoProvider }),
  List({ label: "", lat: 1, lng: 1, provider: "", providerPlaceId: "", kind: NoProvider }))
pure def sometimesAdopted(s: SavedPlaces): bool = s.items.length() >= 2 and s.nextId == s.items.length()
```

### A saved provider place is used only with the open-data provider that served it

A saved place of another provider, or of a Google provider, is shown under its
name and can be removed, but is restricted as Google content is, and is never
a starting point: choosing it clears the starting point and its route and
sends nothing ("Enter a saved place or latitude, longitude as the starting
point.").

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
