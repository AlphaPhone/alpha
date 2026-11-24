# World clock

The time zones the owner follows on the Clock screen, in the order added. The shell checks that a
zone is one the phone knows (an IANA name) before adding it; the time in each is computed from the
[Ringer](./ringer.md)'s instant.

## Story: See the time where others are

> As the owner, I want to add and remove the cities I follow, so that I see their time at a glance.

### A zone is added once, up to twenty, and can be removed

```quint
type WorldClock = { zones: List[str] }
pure val maxZones = 20
pure val initial: WorldClock = { zones: List() }
pure val zoneValues = Set("Europe/Paris", "Asia/Tokyo", "")
pure def canAddZone(w: WorldClock, zone: str): bool = zone != "" and not(w.zones.includes(zone)) and w.zones.length() < maxZones
pure def addZone(w: WorldClock, zone: str): WorldClock = { ...w, zones: w.zones.append(zone) }
pure def canRemoveZone(w: WorldClock, zone: str): bool = w.zones.includes(zone)
pure def removeZone(w: WorldClock, zone: str): WorldClock = { ...w, zones: w.zones.select(z => z != zone) }
pure def alwaysZonesAreDistinctAndBounded(w: WorldClock): bool =
  w.zones.length() <= maxZones and w.zones.every(z => z != "" and w.zones.select(y => y == z).length() == 1)
pure def sometimesTwoZones(w: WorldClock): bool = w.zones.length() >= 2
```
