# PDF pages

A PDF in the preview is shown one page at a time, rendered on the device and never uploaded. On Android
an isolated, permissionless worker renders the page and hands back a read-only image; in the browser
build pdf.js renders it in its own worker. Each page asked for is numbered, one is asked for at a time,
and a page is shown only from the reply to the newest request, within the document's page count. A
render that takes too long is given up, and its late reply shows nothing. The device keeps one
read-only copy of the PDF for its next pages only while the provider reports the same size and time.

## Domain

### The pages of one opened PDF

`count` is 0 until the first page answered.

```quint
type PageOutcome = PageRendered | PageUnavailable | PageNotPdf | PageTimedOut | PageEncrypted | PageMalformed
type PdfPages = { doc: int, ticket: int, pending: bool, requested: int, page: int, count: int, shown: bool, image: str, outcome: PageOutcome }
pure val initial: PdfPages = { doc: 0, ticket: 0, pending: false, requested: 0, page: 0, count: 0, shown: false, image: "", outcome: PageUnavailable }
pure val imageValues = Set("", "file:///page.png")
pure val pageValues = Set(0, 1, 2)
pure val countValues = Set(0, 2, 3)
pure val ticketValues = Set(1, 2, 3)
```

## Story: Read a PDF page by page on the phone

> As the owner, I want a PDF to open at its first page, move to the next and previous page, and say
> when it cannot be shown, without ever showing a page of another document or a page that is not there.

### Opening a document starts at its first page and retires every earlier request

```quint
pure def openDocument(s: PdfPages): PdfPages =
  { ...initial, doc: s.doc + 1, ticket: s.ticket + 1, pending: true, requested: 0 }
pure def canCloseDocument(s: PdfPages): bool = s.doc > 0
pure def closeDocument(s: PdfPages): PdfPages = { ...initial, doc: s.doc, ticket: s.ticket + 1 }
```

### One page is asked for at a time, and only a page inside the document

```quint
pure def canRequestPage(s: PdfPages, page: int): bool =
  s.doc > 0 and not(s.pending) and s.count > 0 and page >= 0 and page < s.count and page != s.page
pure def requestPage(s: PdfPages, page: int): PdfPages = { ...s, ticket: s.ticket + 1, pending: true, requested: page }
pure def alwaysOneRequestAtATime(s: PdfPages): bool = s.pending implies s.ticket >= 1
```

### A page is shown only from the newest request's reply, and only within the page count

```quint
pure def canPageReply(s: PdfPages, ticket: int): bool = ticket >= 1 and ticket <= s.ticket
pure def pageReply(s: PdfPages, ticket: int, result: PageOutcome, page: int, count: int, image: str): PdfPages = {
  val accepted = result == PageRendered and page == s.requested and count >= 1 and page >= 0 and page < count and image != ""
  if (not(s.pending) or ticket != s.ticket) s
  else if (accepted) { ...s, pending: false, page: page, count: count, shown: true, image: image, outcome: result }
  else { ...s, pending: false, shown: false, image: "", outcome: if (result == PageRendered) PageMalformed else result }
}
pure def alwaysAShownPageIsInTheDocument(s: PdfPages): bool = s.shown implies (s.count >= 1 and s.page >= 0 and s.page < s.count and s.image != "")
pure def stepOnlyTheNewestRequestRenders(before: PdfPages, via: str, after: PdfPages): bool =
  (via == "pageReply" and after.shown and not(before.shown and after.page == before.page)) implies before.pending
pure def sometimesSecondPage(s: PdfPages): bool = s.shown and s.page == 1 and s.count == 3
```

### A page that takes too long is given up, and its late reply shows nothing

```quint
pure def canTimeOutPage(s: PdfPages): bool = s.pending
pure def timeOutPage(s: PdfPages): PdfPages = { ...s, pending: false, ticket: s.ticket + 1, shown: false, image: "", outcome: PageTimedOut }
pure def sometimesTimedOut(s: PdfPages): bool = s.outcome == PageTimedOut and not(s.pending)
```

## Story: Keep the renderer's output to itself

> As the owner, I want a document rendered by a worker that can reach nothing else, whose page cannot
> be changed once it is handed over.

### A rendered page is accepted only from the isolated worker's protected, in-bounds output

The Android worker runs in an isolated process with no permissions; it maps the page, then makes the
shared memory read-only before replying, closes the input and every bitmap first, and is killed by
its watchdog or memory limit. The shell accepts a page only when the reply says all of that.

```quint
pure def pageAccepted(isolated: bool, readOnly: bool, inBounds: bool, closed: bool): bool = isolated and readOnly and inBounds and closed
pure def lawAnUnprotectedPageIsRefused(isolated: bool, inBounds: bool, closed: bool): bool = not(pageAccepted(isolated, false, inBounds, closed))
pure def lawANonIsolatedWorkerIsRefused(readOnly: bool, inBounds: bool, closed: bool): bool = not(pageAccepted(false, readOnly, inBounds, closed))
```
