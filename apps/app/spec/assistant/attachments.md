# Attachments

Files, photos and captures the owner attaches to a message: picked in the
attachment picker (Photos and Files tabs, and the computer on a browser
build), handed over by another area (`Assistant.attach`, for example Files ›
Ask Alpha or a Camera capture), or a reviewed email or voice-note
transcript. A composed attachment belongs to the owner, conversation and
binding generation that composed it; it is saved beside its message under
`["chat-attachment-v1", origin, owner, agent, conversation, message]` before
the message is dispatched, and a reload shows it again only once the agent
recorded the message. Bytes reach the agent only on Send.

## Story: Attach a photo or file to my message

> As the owner, I want to attach up to four photos or documents, see them in
> my message after a reload, and never have them land in another
> conversation or account.

### An attachment is placed once: in the draft, or in the pending message, never both

```quint
type Custody = {
  owner: int, conversation: int, draft: bool, pending: bool, generation: int, preparing: bool,
  heldOwner: int, heldConversation: int, heldGeneration: int, sent: bool, saved: Set[int], recorded: Set[int],
  visible: bool, preview: bool,
}
pure val initial: Custody = {
  owner: 1, conversation: 1, draft: false, pending: false, generation: 0, preparing: false,
  heldOwner: 0, heldConversation: 0, heldGeneration: 0, sent: false, saved: Set(), recorded: Set(),
  visible: false, preview: false,
}
pure def slotKey(owner: int, conversation: int): int = owner * 10 + conversation
pure def held(c: Custody): bool = c.heldOwner == c.owner and c.heldConversation == c.conversation and c.heldGeneration == c.generation
pure def canAttach(c: Custody): bool = not(c.pending or (c.preparing and held(c)))
pure def attach(c: Custody): Custody = { ...c, draft: true }
pure def canRemoveDraft(c: Custody): bool = c.draft and not(c.preview)
pure def removeDraft(c: Custody): Custody = { ...c, draft: false }
pure def alwaysPlacedOnce(c: Custody): bool = c.pending implies (c.sent and not(c.draft or c.preparing))
```

### A save that settles after the owner, conversation or generation changed keeps its slot and shows nothing here

```quint
pure def canPrepareSend(c: Custody): bool = c.draft and not(c.pending or c.preparing)
pure def prepareSend(c: Custody): Custody =
  { ...c, preparing: true, heldOwner: c.owner, heldConversation: c.conversation, heldGeneration: c.generation }
pure def canSettleStorage(c: Custody, accepted: bool): bool = c.preparing
pure def settleStorage(c: Custody, accepted: bool): Custody = {
  val stored = if (accepted) c.saved.union(Set(slotKey(c.heldOwner, c.heldConversation))) else c.saved
  val settled = { ...c, preparing: false, saved: stored }
  if (accepted and held(c) and c.draft) { ...settled, draft: false, pending: true, sent: true, visible: true } else settled
}
pure def canConfirmRecorded(c: Custody): bool = c.pending and c.sent and held(c)
pure def confirmRecorded(c: Custody): Custody = { ...c, recorded: c.recorded.union(Set(slotKey(c.owner, c.conversation))) }
pure def canFinish(c: Custody): bool = c.pending
pure def finish(c: Custody): Custody = { ...c, pending: false }
pure def canRefusedBeforeDispatch(c: Custody): bool = c.pending and held(c)
pure def refusedBeforeDispatch(c: Custody): Custody = { ...c, pending: false, sent: false, visible: false, draft: true }
pure def restorable(c: Custody): bool =
  c.saved.contains(slotKey(c.owner, c.conversation)) and c.recorded.contains(slotKey(c.owner, c.conversation))
pure def alwaysOnlyTheCurrentOrARecordedAttachmentIsShown(c: Custody): bool = c.visible implies ((c.sent and held(c)) or restorable(c))
pure def sometimesARefusedWriteKeepsTheDraft(c: Custody): bool = c.draft and not(c.visible) and c.saved.size() == 0 and c.generation == 0 and c.heldOwner == 1
```

### A reload shows the attachment of a recorded message again, and a switch shows another owner's or conversation's nothing

```quint
pure def reload(c: Custody): Custody =
  { ...c, generation: c.generation + 1, draft: false, pending: false, sent: false, preview: false, visible: restorable(c) }
pure def switchOwner(c: Custody): Custody =
  { ...c, generation: c.generation + 1, owner: if (c.owner == 1) 2 else 1, draft: false, pending: false, sent: false, visible: false, preview: false }
pure def switchConversation(c: Custody): Custody =
  { ...c, generation: c.generation + 1, conversation: if (c.conversation == 1) 2 else 1, draft: false, pending: false, sent: false, visible: false, preview: false }
pure def canOpenImage(c: Custody): bool = c.visible
pure def openImage(c: Custody): Custody = { ...c, preview: true }
pure def closeImage(c: Custody): Custody = { ...c, preview: false }
pure def alwaysAPreviewOpensInPlace(c: Custody): bool = c.preview implies (c.visible or c.draft)
pure def sometimesReloadKeepsTheAttachment(c: Custody): bool = c.visible and c.generation >= 1 and not(c.sent)
```

## Story: Attach only what fits

> As the owner, I want to know at once when a photo or file is too large or
> one too many, and have large photos made to fit, so that a message never
> fails at the agent because of its attachments.

### At most four attachments, each within its cap, and a batch within 19 MiB of base64

An image may be picked up to 20 MiB; one over its 5 MiB base64 cap, or of a
type the agent does not take as is (HEIC, TIFF, SVG), is re-encoded to JPEG
at a longest edge of 2048, 1600, 1280 or 1024 px and quality 0.85, 0.72 or
0.6, the first that fits. Other files must fit 15 MiB of base64. Names are 1
to 255 characters. Audio and video are not attached to a chat message.

```quint
type Kind = ImageFile | DocumentFile | MediaFile
pure val maxAttachments = 4
pure val imageIntakeBytes = 20971520
pure val imageBase64Cap = 5242880
pure val mediaBase64Cap = 15728640
pure val batchBase64Cap = 19922944
pure val nameLimit = 255
pure val reencodeEdges = List(2048, 1600, 1280, 1024)
pure val reencodeQualities = List(85, 72, 60)
pure def rawCap(base64Cap: int): int = base64Cap / 4 * 3
pure def base64Of(bytes: int): int = (bytes + 2) / 3 * 4
pure def accepted(kind: Kind, bytes: int, nameLength: int): bool =
  kind != MediaFile and nameLength >= 1 and nameLength <= nameLimit and bytes >= 1
  and (if (kind == ImageFile) bytes <= imageIntakeBytes else bytes <= rawCap(mediaBase64Cap))
pure def needsReencode(kind: Kind, bytes: int, native: bool): bool = kind == ImageFile and (not(native) or base64Of(bytes) > imageBase64Cap)
pure def batchFits(count: int, base64Total: int): bool = count >= 0 and count <= maxAttachments and base64Total <= batchBase64Cap
pure def lawARawCapFitsItsBase64(base64Cap: int): bool = base64Cap >= 0 implies base64Of(rawCap(base64Cap)) <= base64Cap
pure def lawAFifthAttachmentNeverFits(base64Total: int): bool = not(batchFits(maxAttachments + 1, base64Total))
pure def lawAudioAndVideoAreNeverAttached(bytes: int, nameLength: int): bool = not(accepted(MediaFile, bytes, nameLength))
pure val base64CapValues = Set(0, 4, 5242880, 15728640)
pure val bytesValues = Set(1, 3, 3932160, 20971521)
pure val nameLengthValues = Set(0, 1, 255, 256)
pure val base64TotalValues = Set(0, 19922944, 19922945)
pure val countValues = Set(0, 4, 5)
```

## Story: Ask Alpha about a file from Files

> As the owner, I want Ask Alpha on a file to put the file or its text in
> front of my question, reviewed before anything joins my draft, so that a
> long or sensitive document never leaves the phone by surprise.

### A shared text file is asked about as a reviewed excerpt, a file that cannot be attached goes as its name, and anything else is attached

A plain-text, Markdown, CSV or JSON file opens the question review with its
text as the excerpt ("Use excerpt"), truncated to the review's limit and
refused while it holds a secret. A file that does not fit a chat message
is named as the source of the question instead, and nothing of it is sent.
Any other file is attached to the composer. Nothing is sent from Files.

```quint
type Shared = TextShared | AttachableShared | TooLargeShared
pure def asExcerpt(s: Shared): bool = s == TextShared
pure def asSourceName(s: Shared): bool = s == TooLargeShared
pure def attached(s: Shared): bool = s == AttachableShared
pure def lawOneWayPerFile(s: Shared): bool =
  (if (asExcerpt(s)) 1 else 0) + (if (asSourceName(s)) 1 else 0) + (if (attached(s)) 1 else 0) == 1
pure def lawATooLargeFileIsNeverAttached(s: Shared): bool = s == TooLargeShared implies not(attached(s))
pure val sValues = Set(TextShared, AttachableShared, TooLargeShared)
```

### A file's question is reviewed before it joins the draft: "Use excerpt" for its text, its name alone for a file too large, and its source line only while linked

The review of a text file is titled "Use excerpt" and starts with the
file's text; the review of a file too large to attach is titled "Ask
Alpha", starts with no excerpt and says that only the file's name goes with
the question. Either names the file as the question's source while
"Link source" is on (on by default); turning it off leaves the source line
out. Add to chat composes only a question that is not blank, with an
excerpt unless only the name goes, and never while the excerpt holds a
secret ("Remove secrets first"); nothing is sent from the review.

```quint
type FileAsk = ExcerptAsk | SourceAsk
pure def askLabel(a: FileAsk): str = if (a == ExcerptAsk) "Use excerpt" else "Ask Alpha"
pure def composes(a: FileAsk, question: bool, excerpt: bool, secret: bool): bool = question and not(secret) and (excerpt or a == SourceAsk)
pure def namesSource(linked: bool): bool = linked
pure def lawASecretNeverComposes(a: FileAsk, excerpt: bool): bool = not(composes(a, true, excerpt, true))
pure def lawAnExcerptNeedsText(question: bool): bool = not(composes(ExcerptAsk, question, false, false))
pure def lawABlankQuestionNeverComposes(a: FileAsk, excerpt: bool): bool = not(composes(a, false, excerpt, false))
pure val aValues = Set(ExcerptAsk, SourceAsk)
```
