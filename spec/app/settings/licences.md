# Licences

The licences of what Alpha is built from, on the Licences page under About
([Settings](./index.md)): a file shipped with Alpha, never a remote source.
The row focused on the page is Settings' place there.

## Story: Read the licences

> As the owner, I want to search the licences of what Alpha is built from
> and read one, and to come back to my search.

### Licences hold the load, how many it found, the search and how many licences match it, and the licence open

A licence is open when its number is not negative. Nothing here outlives
Alpha: after a restart the licences load again when the page opens.

```quint
import read as R from "../../kit/read"
import timed as T from "./timed"

type Licences = { load: T::Timed, found: int, query: str, shown: int, licence: int }

type Effect = LoadLicences({ load: int })
type Loads = { state: Licences, out: List[Effect] }

pure val initial: Licences = { load: T::unasked, found: 0, query: "", shown: 0, licence: -1 }
```

### Opening the page clears the search, and loads the licences unless they are loading or loaded with some found

A load that failed, or found none, is tried again the next time the page
opens. A load has ten seconds to finish.

```quint
pure val loadLimit = 10
pure val atValues = Set(0, 4, 20)

pure def loadedSome(s: Licences): bool = s.load.read.status == R::Loaded and s.found > 0

pure def opened(s: Licences, at: int): Loads =
  val cleared = { ...s, query: "", shown: s.found, licence: -1 }
  val asking = T::ask(s.load, at, loadLimit)
  if (T::busy(s.load) or loadedSome(s)) { state: cleared, out: List() }
  else { state: { ...cleared, load: asking }, out: List(LoadLicences({ load: asking.read.ticket })) }
```

### A load ends with the licences it found, or as one that could not load

The page then says how many it found, that there are none, or that they
could not load.

```quint
pure val loadValues = Set(1, 2)
pure val foundValues = Set(-1, 0, 3)

pure def canLoaded(s: Licences, load: int, ok: bool, found: int): bool = T::canAnswer(s.load, load) and found >= 0

pure def loaded(s: Licences, load: int, ok: bool, found: int): Licences =
  val counted = if (ok) found else 0
  { ...s, load: T::answer(s.load, ok), found: counted, query: "", shown: counted, licence: -1 }
```

### A load not finished within ten seconds is given up as one that could not load

```quint
pure val nowValues = Set(0, 4, 20, 40)

pure def canGiveUpOnLoad(s: Licences, now: int): bool = T::canGiveUp(s.load, now)

pure def giveUpOnLoad(s: Licences, now: int): Licences = { ...s, load: T::answer(s.load, false), found: 0, query: "", shown: 0, licence: -1 }
```

### Every load of the licences ends

```quint
pure def leadsToALoadEnds(s: Licences, later: Licences): bool = T::busy(s.load) implies not(T::busy(later.load))

pure val fair_giveUpOnLoad = "weak"
```

### The licences are loaded once per opening at most, and only by opening the page

```quint
pure def isLoadLicences(e: Effect): bool = match e { | LoadLicences(l) => true | _ => false }

pure def stepLicencesLoadOnce(before: Licences, via: str, after: Licences, out: List[Effect]): bool =
  if (out.some(e => isLoadLicences(e)))
    via == "opened" and not(T::busy(before.load)) and not(loadedSome(before)) and out.length() == 1
      and out.every(e => match e { | LoadLicences(l) => l.load == after.load.read.ticket | _ => false })
  else after.load.read.ticket == before.load.read.ticket
```

### The list counts licences only once they have loaded

```quint
pure def alwaysLicencesAreCountedOnceLoaded(s: Licences): bool =
  s.load.read.status != R::Loaded implies (s.found == 0 and s.shown == 0)
```

### Searching narrows the loaded list to the licences that match, from its top, and an empty search shows them all

The page counts which licences match the words searched for.

```quint
pure val queryValues = Set("", "mit")
pure val shownValues = Set(-1, 0, 2, 3)

pure def canSearch(s: Licences, query: str, shown: int): bool =
  s.load.read.status == R::Loaded and s.licence < 0 and 0 <= shown and shown <= s.found and (query == "" implies shown == s.found)

pure def search(s: Licences, query: str, shown: int): Licences = { ...s, query: query, shown: shown }

pure def alwaysTheSearchNarrowsTheLoadedList(s: Licences): bool =
  0 <= s.shown and s.shown <= s.found and (s.query == "" implies s.shown == s.found)
```

### A licence opens only from the list the search shows

```quint
pure val licenceValues = Set(-1, 1, 2)

pure def canOpenLicence(s: Licences, licence: int): bool =
  s.load.read.status == R::Loaded and s.licence < 0 and 0 <= licence and licence < s.shown

pure def openLicence(s: Licences, licence: int): Licences = { ...s, licence: licence }

pure def alwaysALicenceShownWasLoadedAndMatches(s: Licences): bool =
  s.licence >= 0 implies (s.load.read.status == R::Loaded and s.licence < s.shown)
```

### Back from a licence returns to the same search

Settings keeps the row the owner left on the list.

```quint
pure def canCloseLicence(s: Licences): bool = s.licence >= 0

pure def closeLicence(s: Licences): Licences = { ...s, licence: -1 }

pure def stepClosingALicenceKeepsTheSearch(before: Licences, via: str, after: Licences): bool =
  (before.licence >= 0 and after.licence < 0 and via != "opened") implies (after.query == before.query and after.shown == before.shown)
```

### A licence can be read from a searched list

```quint
pure def sometimesALicenceFromASearch(s: Licences): bool = s.licence > 0 and s.query != "" and s.shown < s.found
```

### Licences can fail to load

```quint
pure def sometimesLicencesUnavailable(s: Licences): bool = s.load.read.status == R::Failed
```

### A load can find no licences

```quint
pure def sometimesNoLicencesFound(s: Licences): bool = s.load.read.status == R::Loaded and s.found == 0
```
