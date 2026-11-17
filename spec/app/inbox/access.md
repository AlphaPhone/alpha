# Gmail access

What a Google grant lets Alpha do with one Gmail account. The owner gives
access in steps: reading first, then sending, then changing the mailbox.
The [list](./index.md), the [message](./message.md), the
[drafts](./drafts.md), the [operations](./sending.md) and the
[notices](./notices.md) all ask this before they act.

## Story: Do only what the grant allows

> As the owner, I want Alpha to do with my mail only what I gave Google's
> consent for, and to stop the moment I withdraw it.

### A grant gives no access, reading, reading and sending, or reading and changing

Changing covers sending, saving and deleting Gmail drafts, archiving,
moving to Trash and marking read or unread.

```quint
type Grant = NoAccess | ReadOnly | ReadAndSend | ReadAndChange
type Deed = Reading | Sending | Drafting | Changing

pure def allows(grant: Grant, deed: Deed): bool =
  if (deed == Reading) grant != NoAccess
  else if (deed == Sending) grant == ReadAndSend or grant == ReadAndChange
  else grant == ReadAndChange
```

### Whatever a grant allows, it allows reading

```quint
pure def lawEveryDeedNeedsReading(grant: Grant, deed: Deed): bool =
  allows(grant, deed) implies allows(grant, Reading)
```

### No access allows nothing

```quint
pure def lawNoAccessAllowsNothing(deed: Deed): bool = not(allows(NoAccess, deed))
```
