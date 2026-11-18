# Gmail access

What a Google grant lets Alpha do with one Gmail account. The grant is the
account area's: Google's consent for reading, for sending and for changing
the mailbox, given in steps and never widened here. Inbox takes each
connected account's grant as the account area reports it, and states only
which of those consents each of its deeds needs. The
[list](./index.md), the [message](./message.md), the
[drafts](./drafts.md), the [operations](./sending.md), [what Alpha may
do](./agent.md) and the [notices](./notices.md) all ask this before they
act, each for the account it acts on.

## Story: Do only what the grant allows

> As the owner, I want Alpha to do with my mail only what I gave Google's
> consent for, and to stop the moment I withdraw it.

### A grant is the consent to read, to send and to change the mailbox that Google gave for one account

Changing the mailbox covers saving and deleting Gmail drafts, archiving,
moving to Trash and marking read or unread. Account 0 is no account.

```quint
type Grant = { read: bool, send: bool, modify: bool }
type Access = { account: int, grant: Grant }
type Deed = Reading | Sending | Changing

pure val noAccess: Grant = { read: false, send: false, modify: false }

pure val grantValues = Set(
  { read: false, send: false, modify: false },
  { read: true, send: false, modify: false },
  { read: true, send: true, modify: false },
  { read: true, send: false, modify: true },
  { read: true, send: true, modify: true },
)

pure val accessValues = Set(
  { account: 1, grant: { read: true, send: true, modify: true } },
  { account: 1, grant: { read: true, send: false, modify: false } },
  { account: 1, grant: { read: false, send: false, modify: false } },
  { account: 2, grant: { read: true, send: true, modify: true } },
  { account: 2, grant: { read: true, send: false, modify: true } },
)
```

### Every deed needs reading, and sending or changing needs its own consent besides

A consent to send or to change without one to read allows nothing.

```quint
pure def allows(grant: Grant, deed: Deed): bool =
  grant.read and (if (deed == Sending) grant.send else if (deed == Changing) grant.modify else true)

pure def lawEveryDeedNeedsReading(grant: Grant, deed: Deed): bool =
  allows(grant, deed) implies allows(grant, Reading)

pure def lawSendingAndChangingAreSeparate(grant: Grant): bool =
  (allows(grant, Sending) implies grant.send) and (allows(grant, Changing) implies grant.modify)
```

### No access allows nothing

```quint
pure def lawNoAccessAllowsNothing(deed: Deed): bool = not(allows(noAccess, deed))
```

### A grant counts only for the account it was given for

```quint
pure def allowsFor(access: Access, account: int, deed: Deed): bool =
  account != 0 and access.account == account and allows(access.grant, deed)

pure def lawAGrantIsNotLentToAnotherAccount(access: Access, account: int, deed: Deed): bool =
  account != access.account implies not(allowsFor(access, account, deed))
```

## Story: Tell who acts

> As the owner, I want to know which steps are mine, which are Alpha's,
> and which are answers from the phone or the cloud.

### A step is taken by the owner, by Alpha, or by the world answering

The shell checks who sent each event before it reaches a rule.

```quint
type Actor = Owner | Agent | World
```
