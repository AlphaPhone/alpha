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
pure def samePlace(item: SavedItem, place: SaveRequest): bool =
  if (place.provider != "") item.provider == place.provider and item.providerPlaceId == place.providerPlaceId
  else item.provider == "" and item.lat == place.lat and item.lng == place.lng
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
place without one when its coordinates match exactly. The 201st place is
refused: "Remove a saved place before adding another." A stored list that
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
