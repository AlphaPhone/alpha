# Files filter coordination

`FilesFilter` executes the current prepared shared Files runner in a mounted
Browse view. The adapter observes pending and displayed filter identities,
reload and query generations, matched rows, native request order and agent
outcomes. Held storage ports can return a grant, denial, ready result,
unavailable result or transport rejection. The shared filter matcher and sorter
run against those replies.

A late rejected query previously erased a newer filter's rows, then reported a
successful zero-item result for the superseded request. The shared SDK fences
both successful and failed replies by the pending request, current filter and
query generation. Each request makes one access check independently of the
view reload. A replacement clears the old rows after access is granted.
Denied access, unavailable queries and superseded work produce a failed result,
while a successful empty query still reports zero matches. The agent's abort
signal prevents publication after cancellation.

Leaving Files retires the filter
([eliza#39740](https://github.com/elizaOS/eliza/pull/39740)): the pending and
displayed filter are dropped and the rows are cleared, so a late reply cannot
republish them. After leaving, the runner asks the agent host to reopen Files;
the campaign gives it a refusing port, so such a filter reports unavailable
before admission. A successful reopen is covered by `FilesAgentActions`
(`directFilterOpensFilesTest`), not this campaign.

The campaign checks 21 schedules with three operation identities, two text
classes and four unique rows. It covers repeated filter text with a different
owner, stale admission and query replies, clearing by chip or Back, leaving
the view with a shown, admitting or querying filter, a filter after leaving
whose reopen is refused,
and abort before or during each await. It also checks reloads during admission
and during an explicit query, with zero storage writes. Two separate source
regressions cover a reload query outside the model. One leaves the view during
the reload and checks that leaving clears the filter and its rows and that the
late reply leaves them cleared. The other hides the view without its leave
handler, which deactivates the adapter but keeps the filter shown. It then
checks that only the reload's own admission fence stops the late reply from
replacing the shown rows.

Native storage and provider effects remain controlled ports. The model starts
after mounting and settling the initial Browse read and ends at leave; it does
not model re-entering the view. It does not cover the
full watch/reload coordinator, provider query implementation, arbitrary
metadata or file mutations.

```sh
bun test test/quint-files-filter.test.mjs
```
