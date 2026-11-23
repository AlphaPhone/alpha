# Recovery

The listing of device actions still pending for this phone, read when a
conversation opens or reloads, when the agent session changes and when the
screen under the assistant changes (`DeviceReview.pending`). Each listing
belongs to a key: the agent session, the conversation's history revision and
the screen context. A listing is read once per key and applies only to the
key it was read for; one that settles after the key changed is dropped. A
failed listing is remembered for its key and is not read again until the key
changes, so a broken route is never polled. When the nearest card's review
time passes, the expired card is disabled and the listing is read again,
once. A card the listing returns becomes a recovered card
([Approvals](./approvals.md)).

## Story: See what still waits for me without the phone polling my agent

> As the owner, I want the action cards still waiting for my review to come
> back when I reopen a conversation, and never to see cards listed for
> another screen or session, so that every card I tap is current and the
> phone does not keep asking my agent.

### A listing is read once per key, applies only to its own key, and a failed one waits for a new key

```quint
type Recovery = { key: int, reading: bool, readKey: int, failedKey: int, doneKey: int, reads: int, triggers: int, applied: int, dropped: int }
pure val noKey = -1
pure val initial: Recovery = { key: 0, reading: false, readKey: noKey, failedKey: noKey, doneKey: noKey, reads: 0, triggers: 0, applied: 0, dropped: 0 }
pure def owed(r: Recovery): int =
  if (not(r.reading) and r.key != r.failedKey and r.key != r.doneKey) 1 else if (r.reading and r.readKey != r.key) 1 else 0
pure def canReadListing(r: Recovery): bool = not(r.reading) and r.key != r.failedKey and r.key != r.doneKey
pure def readListing(r: Recovery): Recovery = { ...r, reading: true, readKey: r.key, reads: r.reads + 1 }
pure def rekey(r: Recovery): Recovery = { ...r, key: r.key + 1, triggers: r.triggers + 1 }
pure def canListingSettles(r: Recovery, ok: bool): bool = r.reading
pure def listingSettles(r: Recovery, ok: bool): Recovery =
  if (r.readKey != r.key) { ...r, reading: false, dropped: r.dropped + 1 }
  else if (ok) { ...r, reading: false, doneKey: r.key, applied: r.applied + 1 }
  else { ...r, reading: false, failedKey: r.key }
pure def alwaysNoPolling(r: Recovery): bool = r.reads + owed(r) <= r.triggers + 1
pure def alwaysAFailedListingIsNotReadAgainForItsKey(r: Recovery): bool = r.reading implies r.readKey != r.failedKey
pure def alwaysAnAppliedListingWasRead(r: Recovery): bool = r.applied + r.dropped + (if (r.reading) 1 else 0) <= r.reads
pure def sometimesAStaleListingWasDropped(r: Recovery): bool = r.dropped >= 1 and r.applied == 0
pure def sometimesAFailedListingWaitedQuietly(r: Recovery): bool = r.failedKey == r.key and not(r.reading) and r.reads == 1
pure val okValues = Set(false, true)
```

### An expired card reads the listing again once, under the same key

```quint
pure def canCardExpires(r: Recovery): bool = not(r.reading) and r.doneKey == r.key
pure def cardExpires(r: Recovery): Recovery = { ...r, doneKey: noKey, triggers: r.triggers + 1 }
pure def stepAnExpiryNeverChangesTheKey(before: Recovery, via: str, after: Recovery): bool = via == "cardExpires" implies after.key == before.key
pure def sometimesReadAgainAfterExpiry(r: Recovery): bool = r.applied == 2 and r.reads == 2 and r.key == 0
```

## Story: Restart my agent when it stopped for review

> As the owner, when my agent stopped and the phone holds what it kept for
> my review, I want the chat to say "Restart needed" and restart it with
> one tap, so that I can keep chatting without anything it kept being
> replayed.

### Restart is offered only while the resident is refused and holds a reviewable recovery, once per tap

The composer offers Restart while the resident connection is refused and
the agent service reports a reviewable hold; the tap archives what the
owner reviewed under its one-use token and starts the agent again. A
failed restart says so and offers it again; nothing kept is replayed
(#1302).

```quint
pure def restartOffered(refused: bool, reviewable: bool, restarting: bool): bool = refused and reviewable and not(restarting)
pure def lawNoRestartWhileConnected(reviewable: bool): bool = not(restartOffered(false, reviewable, false))
pure def lawNoRestartWithoutAHold(refused: bool): bool = not(restartOffered(refused, false, false))
pure def lawOneRestartPerTap(refused: bool, reviewable: bool): bool = not(restartOffered(refused, reviewable, true))
```
