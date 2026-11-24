# Selected media and reviewed bytes

A photo or video the owner selects is read only while Alpha is in front,
unlocked and allowed, at the revision that was selected; its bytes leave
Photos only after the owner reviewed that exact revision, as an attachment
to the conversation that asked for it, a reviewed email attachment or a
picture Messages can send. A capture that was never published is deleted
when its review is cancelled. Revoking access, pausing, locking or a change
to the source ends every read, review and playback in flight.

## Domain

### A media session holds the grant, the device state, the selected revision and what it published

```quint
type MediaScope = MediaDenied | MediaFull | MediaSelected
type MediaPhase = MediaIdle | MediaChosen | MediaReading | MediaLoaded | MediaReviewed | MediaPublished
type Invalidation = AccessRevoked | AppPaused | PhoneLocked | SourceChanged
type Media = {
  scope: MediaScope, foreground: bool, unlocked: bool, epoch: int, revision: int,
  phase: MediaPhase, selected: bool, selectedRevision: int, requestEpoch: int,
  loaded: bool, reviewed: bool, reviewedRevision: int, published: bool, publishedRevision: int,
  publicationReviewedRevision: int, publicationAdmitted: bool, ownedCapture: bool, temporaryBytes: bool,
  catalogRows: int, playback: bool,
  conversation: int, asking: bool, askConversation: int, attached: int, attachedConversation: int, refusedChanged: int
}
pure val initial: Media = {
  scope: MediaDenied, foreground: true, unlocked: true, epoch: 0, revision: 0,
  phase: MediaIdle, selected: false, selectedRevision: -1, requestEpoch: -1,
  loaded: false, reviewed: false, reviewedRevision: -1, published: false, publishedRevision: -1,
  publicationReviewedRevision: -1, publicationAdmitted: false, ownedCapture: false, temporaryBytes: false,
  catalogRows: 0, playback: false,
  conversation: 1, asking: false, askConversation: 0, attached: 0, attachedConversation: 0, refusedChanged: 0
}
pure def allowed(m: Media): bool = m.foreground and m.unlocked and m.scope != MediaDenied
pure val grantedValues = Set(MediaFull, MediaSelected)
pure val ticketValues = Set(-1, 0, 1, 2)
pure val revisionValues = Set(0, 1)
pure val reasonValues = Set(AccessRevoked, AppPaused, PhoneLocked, SourceChanged)
pure val chatValues = Set(1, 2)
```

## Story: Use a photo only as I selected it

> As the owner, I want a photo I chose read and shared only while I am using
> Alpha and only as I saw it, so that a changed photo or a revoked
> permission never lets older bytes through.

### Access is granted as the whole library or chosen items; a selection names the revision it saw

```quint
pure def canGrant(m: Media, granted: MediaScope): bool = granted != MediaDenied and m.phase == MediaIdle
pure def grant(m: Media, granted: MediaScope): Media = { ...m, scope: granted }
pure def canSelectMedia(m: Media): bool = allowed(m)
pure def selectMedia(m: Media): Media =
  { ...m, selected: true, selectedRevision: m.revision, phase: MediaChosen, loaded: false, reviewed: false, catalogRows: 1,
    playback: false, ownedCapture: false, temporaryBytes: false }
pure def alwaysDeniedCatalogEmpty(m: Media): bool = m.scope == MediaDenied implies m.catalogRows == 0
```

### A read is admitted while Alpha is in front, unlocked and allowed, and only its own current answer loads the bytes

```quint
pure def canBeginRead(m: Media): bool = m.selected and allowed(m) and m.selectedRevision == m.revision and m.phase == MediaChosen
pure def beginRead(m: Media): Media = { ...m, phase: MediaReading, requestEpoch: m.epoch }
pure def canReadComplete(m: Media, ticket: int, revision: int): bool = m.phase == MediaReading
pure def readComplete(m: Media, ticket: int, revision: int): Media =
  if (ticket == m.epoch and ticket == m.requestEpoch and revision == m.revision and allowed(m))
    { ...m, phase: MediaLoaded, loaded: true, temporaryBytes: true }
  else m
pure def alwaysActiveReadAdmitted(m: Media): bool = m.phase == MediaReading implies (allowed(m) and m.requestEpoch == m.epoch)
```

### A review binds the revision it showed, and only reviewed bytes are published

A capture of Alpha's own is published even without library access.

```quint
pure def canReview(m: Media): bool = m.loaded and m.phase == MediaLoaded and m.selectedRevision == m.revision
pure def review(m: Media): Media = { ...m, phase: MediaReviewed, reviewed: true, reviewedRevision: m.revision }
pure def canPublish(m: Media): bool =
  m.phase == MediaReviewed and m.reviewed and m.foreground and m.unlocked and (m.scope != MediaDenied or m.ownedCapture) and
  m.reviewedRevision == m.revision and m.selectedRevision == m.revision
pure def publish(m: Media): Media =
  { ...m, phase: MediaPublished, published: true, publishedRevision: m.selectedRevision, publicationReviewedRevision: m.reviewedRevision,
    publicationAdmitted: m.foreground and m.unlocked and (m.scope != MediaDenied or m.ownedCapture), temporaryBytes: false, ownedCapture: false }
pure def alwaysReviewBindsRevision(m: Media): bool = m.reviewed implies (m.loaded and m.reviewedRevision == m.revision)
pure def alwaysPublishedBytesReviewed(m: Media): bool = m.published implies (m.publicationAdmitted and m.publishedRevision == m.publicationReviewedRevision)
pure def sometimesPublished(m: Media): bool = m.published and m.scope == MediaSelected
```

### A capture of Alpha's own is held until its review publishes it, and a cancelled one leaves no bytes

```quint
pure def canCapture(m: Media): bool = m.foreground and m.unlocked and m.phase == MediaIdle
pure def capture(m: Media): Media =
  { ...m, phase: MediaLoaded, loaded: true, selected: true, selectedRevision: m.revision, ownedCapture: true, temporaryBytes: true }
pure def cancel(m: Media): Media =
  { ...m, phase: MediaIdle, selected: false, loaded: false, reviewed: false, ownedCapture: false, temporaryBytes: false, playback: false }
pure def alwaysIdleHasNoTemporaryCapture(m: Media): bool = m.phase == MediaIdle implies (not(m.temporaryBytes) and not(m.ownedCapture))
```

### Playback runs only on loaded bytes while Alpha is in front and unlocked

```quint
pure def canStartPlayback(m: Media): bool = m.loaded and m.foreground and m.unlocked
pure def startPlayback(m: Media): Media = { ...m, playback: true }
pure def alwaysPlaybackAdmitted(m: Media): bool = m.playback implies (m.foreground and m.unlocked and m.loaded)
```

### Revoking access, pausing, locking or a changed source ends every read, review and playback

```quint
pure def invalidate(m: Media, reason: Invalidation): Media =
  { ...m, scope: if (reason == AccessRevoked) MediaDenied else m.scope,
    foreground: if (reason == AppPaused) false else m.foreground, unlocked: if (reason == PhoneLocked) false else m.unlocked,
    revision: if (reason == SourceChanged) 1 - m.revision else m.revision,
    epoch: m.epoch + 1, phase: MediaIdle, selected: false, loaded: false, reviewed: false, temporaryBytes: false,
    ownedCapture: false, catalogRows: 0, playback: false, asking: false }
pure def resume(m: Media): Media = { ...m, foreground: true, unlocked: true }
```

## Story: Ask Alpha about the photo I am looking at

> As the owner, I want the photo I ask about attached to the conversation I
> asked from, exactly as I saw it, so that it never lands in another chat or
> as a different photo.

### An ask binds the conversation it came from; a read that finishes after a switch attaches nothing

The owner chooses the photo again in the current chat.

```quint
pure def canAskAboutPhoto(m: Media): bool = m.selected and allowed(m) and not(m.asking)
pure def askAboutPhoto(m: Media): Media = { ...m, asking: true, askConversation: m.conversation }
pure def canSwitchConversation(m: Media, chat: int): bool = chat != m.conversation
pure def switchConversation(m: Media, chat: int): Media = { ...m, conversation: chat }
pure def canPhotoRead(m: Media, unchanged: bool): bool = m.asking
pure def photoRead(m: Media, unchanged: bool): Media =
  if (unchanged and m.askConversation == m.conversation and allowed(m))
    { ...m, asking: false, attached: m.attached + 1, attachedConversation: m.askConversation }
  else { ...m, asking: false, refusedChanged: m.refusedChanged + 1 }
pure def alwaysAttachedToTheAskingConversation(m: Media): bool = m.attached > 0 implies m.attachedConversation != 0
pure def stepAttachmentKeepsItsConversation(before: Media, via: str, after: Media): bool =
  (after.attached > before.attached) implies (via == "photoRead" and after.attachedConversation == before.askConversation and before.askConversation == before.conversation)
pure def sometimesChatChangedRefused(m: Media): bool = m.refusedChanged > 0 and m.conversation != m.askConversation
pure def sometimesAttached(m: Media): bool = m.attached > 0
```

## Story: Send a photo only as a reviewed copy

> As the owner, I want a photo I email or text sent as the exact file I
> reviewed, and Messages offered only for pictures it can send, so that a
> send never fails late or carries the wrong file.

### Email takes a JPEG, PNG or WebP source of at most 5 MiB, unchecked until the owner checks it

The draft it joins is a fresh email draft; nothing is sent from Photos.

```quint
type PictureType = Jpeg | Png | Webp | Heic | OtherType
pure val emailAttachmentLimit = 5242880
pure def emailable(kind: PictureType, bytes: int): bool = (kind == Jpeg or kind == Png or kind == Webp) and bytes > 0 and bytes <= emailAttachmentLimit
pure def lawUnknownSizeIsNeverEmailed(kind: PictureType): bool = not(emailable(kind, 0))
```

### Messages is offered only for a JPEG or PNG Messages can send; an unknown size is never treated as small

```quint
pure val messagesPictureLimit = 1048576
pure def messagesSendable(kind: PictureType, bytes: int): bool = (kind == Jpeg or kind == Png) and bytes > 0 and bytes <= messagesPictureLimit
pure def lawLargeCameraPhotoIsNotOfferedToMessages(kind: PictureType, bytes: int): bool = bytes > messagesPictureLimit implies not(messagesSendable(kind, bytes))
pure val kindValues = Set(Jpeg, Png, Webp, Heic, OtherType)
pure val bytesValues = Set(0, 1048576, 1048577, 5242880, 5242881)
```

## Story: Look closely without changing anything

> As the owner, I want to zoom into a photo or an attachment and pan around
> it, so that I can see detail without changing the photo or my draft.

### A preview zooms between 1× and 8× and pans only while zoomed; it never changes the image

Double tap toggles 2×, the keys `+`, `-` and `0` zoom in, out and reset, and
a tap outside the image closes the preview.

```quint
pure def zoomedTo(scale: int): int = if (scale < 10) 10 else if (scale > 80) 80 else scale
pure def doubleTapped(scale: int): int = if (scale == 10) 20 else 10
pure def pans(scale: int): bool = scale > 10
pure def lawZoomStaysInRange(scale: int): bool = zoomedTo(scale) >= 10 and zoomedTo(scale) <= 80
pure def lawUnzoomedNeverPans(scale: int): bool = zoomedTo(scale) == 10 implies not(pans(zoomedTo(scale)))
pure val scaleValues = Set(0, 10, 15, 20, 80, 120)
```

## Story: Ask Alpha about what Camera sees

> As the owner, I want "what am I looking at?" in Camera to send one frame I
> can review with my question, so that nothing leaves the phone before I see
> it.

### A frame question needs the ready, idle preview, and its frame is reviewed before it joins the draft

The question matches a whole short message ("what is this?", "read this to
me"); the frame is never saved to Photos.

```quint
type FrameAsk = { matches: bool, ready: bool, busy: bool }
pure def asksAboutFrame(ask: FrameAsk): bool = ask.matches and ask.ready and not(ask.busy)
pure def lawBusyCameraAsksNothing(ask: FrameAsk): bool = ask.busy implies not(asksAboutFrame(ask))
pure val askValues = Set({ matches: true, ready: true, busy: false }, { matches: true, ready: false, busy: false }, { matches: true, ready: true, busy: true }, { matches: false, ready: true, busy: false })
```
