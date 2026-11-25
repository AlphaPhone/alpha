# World Clock

Pinned world cities, kept unique and ordered, with add, remove, reorder, and
sync with the resident agent.

## Story: Track times around the world

> As the owner, I want to add cities to my World Clock, reorder them, and
> remove them without duplicates.

### World Clock keeps an ordered list of unique positive city ids up to twenty-four

```quint
type WorldClock = { cities: List[int] }

pure val maxCities = 24
pure val initial: WorldClock = { cities: List() }

pure def uniqueCities(cities: List[int]): bool =
  cities.every(c => cities.select(other => other == c).length() == 1)

pure val cityIdValues = Set(1, 2, 3)
pure val ontoValues = Set(1, 2, 3)
pure val syncedValues = Set(List(), List(1, 2), List(3, 1))
```

### Adding a city appends it once while under the limit

```quint
pure val weight_addCity = 4

pure def canAddCity(s: WorldClock, cityId: int): bool =
  cityId > 0 and not(s.cities.includes(cityId)) and s.cities.length() < maxCities

pure def addCity(s: WorldClock, cityId: int): WorldClock =
  { cities: s.cities.append(cityId) }
```

### Removing a city drops it from the list

```quint
pure def canRemoveCity(s: WorldClock, cityId: int): bool = s.cities.includes(cityId)

pure def removeCity(s: WorldClock, cityId: int): WorldClock =
  { cities: s.cities.select(c => c != cityId) }
```

### Moving a city places it immediately before or after another pinned city without changing the set of cities

```quint
pure def placedCity(cities: List[int], cityId: int, onto: int, behind: bool): List[int] =
  cities.foldl(List(), (acc, c) => acc.concat(
    if (c == cityId) List()
    else if (c == onto) (if (behind) List(c, cityId) else List(cityId, c))
    else List(c)))

pure def canMoveCity(s: WorldClock, cityId: int, onto: int): bool =
  cityId != onto and s.cities.includes(cityId) and s.cities.includes(onto)

pure def moveCity(s: WorldClock, cityId: int, onto: int, behind: bool): WorldClock =
  { cities: placedCity(s.cities, cityId, onto, behind) }

pure def stepMovePreservesSet(before: WorldClock, via: str, after: WorldClock): bool =
  via == "moveCity" implies (
    after.cities.every(c => before.cities.includes(c))
    and before.cities.every(c => after.cities.includes(c)))
```

### Syncing from the resident agent admits only valid, unique, bounded city lists

```quint
pure def canApplySync(s: WorldClock, synced: List[int]): bool =
  synced.length() <= maxCities and synced.every(c => c > 0) and uniqueCities(synced)

pure def applySync(s: WorldClock, synced: List[int]): WorldClock = { cities: synced }

pure def reopen(s: WorldClock): WorldClock = s
```

### Cities stay positive, unique, and bounded, and multiple cities and reordering are reachable

```quint
pure def alwaysCitiesUnique(s: WorldClock): bool = uniqueCities(s.cities)

pure def alwaysCitiesBounded(s: WorldClock): bool = s.cities.length() <= maxCities

pure def alwaysValidCityIds(s: WorldClock): bool = s.cities.every(c => c > 0)

pure def sometimesMultipleCities(s: WorldClock): bool = s.cities.length() >= 2

pure def sometimesReordered(s: WorldClock): bool = s.cities.length() >= 2 and s.cities.nthOr(0, 0) > s.cities.nthOr(1, 0)
```
