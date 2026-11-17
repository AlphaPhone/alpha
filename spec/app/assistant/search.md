# Search

Searching every conversation with Ask Alpha for words, a page of hits at a
time, and opening a hit in its conversation around its message, which
[chats](./chats.md) does.

## Story: Search my conversations

> As the owner, I want to search all my conversations, see more hits when
> there are more, and open one where it was said, never seeing hits for a
> search I have left behind.

### Search is open or closed, with the words asked, the hits shown and whether there are more

The hits come from a [read](../../kit/read.md): only the newest asking is
answered. A page has at most twenty hits; asked is where the page asked
for begins.

```quint
import read as R from "../../kit/read"

type Search = { open: bool, words: str, hits: R::Read, asked: int, shown: int, more: bool }

pure val initial: Search = { open: false, words: "", hits: R::unread, asked: 0, shown: 0, more: false }

pure val pageSize = 20
```

### What search needs done outside comes back as an answer naming its ticket

A page of hits for the words, from a position, and a hit opened.

```quint
type Effect = Find({ words: str, from: int, ticket: int }) | Open({ hit: int })
type Moved = { state: Search, out: List[Effect] }

pure def dropped(r: R::Read): R::Read = { ...r, status: R::Idle }

pure def finding(words: str, from: int, s: Search): Moved =
  val hits = R::ask(s.hits)
  { state: { ...s, words: words, hits: hits, asked: from, more: false },
    out: List(Find({ words: words, from: from, ticket: hits.ticket })) }
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2, 3, 4)
pure val countValues = Set(0, 3, 20)
pure val hitValues = Set(1, 4, 25)
pure val wordsValues = Set("", "lunch", "flight")
pure val weight_found = 4
```

### Search opens empty

```quint
pure def canOpenSearch(s: Search): bool = not(s.open)

pure def openSearch(s: Search): Search = { ...s, open: true, words: "", hits: dropped(s.hits), asked: 0, shown: 0, more: false }
```

### Words are searched from the first hit, and empty words are not searched

```quint
pure def canFind(s: Search, words: str): bool = s.open and words != ""

pure def find(s: Search, words: str): Moved = finding(words, 0, { ...s, shown: 0 })
```

### More hits are asked for from the last one shown, once a page said there were more

```quint
pure def canMore(s: Search): bool = s.open and s.hits.status == R::Loaded and s.more

pure def more(s: Search): Moved = finding(s.words, s.shown, s)
```

### Only the newest asking's hits are shown, a page at a time, after those already shown

A page that fails keeps the hits already shown, with nothing more.

```quint
pure def canFound(s: Search, ticket: int, count: int): bool =
  s.open and R::canAnswer(s.hits, ticket) and 0 <= count and count <= pageSize

pure def found(s: Search, ticket: int, ok: bool, count: int, further: bool): Search =
  { ...s, hits: R::answer(s.hits, ok), shown: if (ok) s.asked + count else s.shown, more: ok and further and count == pageSize }
```

### Opening a hit closes search and opens it in its conversation

```quint
pure def canOpenHit(s: Search, hit: int): bool = s.open and 1 <= hit and hit <= s.shown

pure def openHit(s: Search, hit: int): Moved =
  { state: { ...s, open: false, hits: dropped(s.hits), shown: 0, more: false }, out: List(Open({ hit: hit })) }
```

### Closing search, or another owner or session, leaves its asking behind

```quint
pure def canCloseSearch(s: Search): bool = s.open

pure def closeSearch(s: Search): Search = { ...s, open: false, hits: dropped(s.hits), shown: 0, more: false }
```

### Hits are shown only while search is open, and only for an answer that came

```quint
pure def alwaysHitsShowOnlyWhileOpen(s: Search): bool =
  (s.shown > 0 implies (s.open and s.hits.status != R::Idle)) and (s.more implies (s.open and s.hits.status == R::Loaded))
    and s.shown >= 0 and (s.hits.status == R::Loading implies s.asked == s.shown)
```

### Hits are only ever asked for words

Discovered by the proof: without it, More could ask again for empty words.

```quint
pure def alwaysHitsAreForWords(s: Search): bool = s.hits.status != R::Idle implies s.words != ""
```

### A page never takes back the hits before it

```quint
pure def stepAPageAddsToTheHitsBeforeIt(before: Search, via: str, after: Search): bool =
  (via == "found" or via == "more") implies after.shown >= before.shown
```

### An asking that was left behind is never answered

```quint
pure def stepALeftAskingIsNeverAnswered(before: Search, via: str, after: Search): bool =
  after.hits.ticket >= before.hits.ticket
    and ((via == "closeSearch" or via == "openHit" or via == "openSearch") implies after.hits.status == R::Idle)
```

### Empty words are never searched

```quint
pure def stepEmptyWordsAreNeverSearched(before: Search, via: str, after: Search, out: List[Effect]): bool =
  out.every(e => match e { | Find(f) => f.words != "" and f.words == after.words | _ => true })
```

### A second page of hits can show

```quint
pure def sometimesASecondPageShows(s: Search): bool = s.shown > pageSize
```

### A search can find nothing

```quint
pure def sometimesNothingIsFound(s: Search): bool = s.open and s.hits.status == R::Loaded and s.shown == 0
```

### A search can fail

```quint
pure def sometimesASearchFails(s: Search): bool = s.open and s.hits.status == R::Failed
```
