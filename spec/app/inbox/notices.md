# Mail notices

New mail noticed while Inbox is closed: the shell configures the phone's
mail history worker (`@elizaos/plugin-inbox-client`) with the grant of
the account selected in the [list](./index.md) and the current owner's
cloud identity. The native worker owns the durable checkpoint,
notification permission, background checks and exact taps. Inbox shows
the worker's reported status in Settings, opens Android notification
settings from the same row, and validates the opened message before
spending an Ask Alpha tap.

## Story: Open my message from a notice

> As the owner, I want tapping a notice to open that message in Inbox,
> under the account it came for, and an Ask Alpha tap to check that the
> opened email still matches the notice before spending the tap.

### Ask Alpha from a notice checks the same email again before spending the tap

The Ask Alpha action opens that message and offers to add its full plain
text to the resident conversation. Confirming reads the message again,
checks the account, message, latest reviewed content, resident
conversation and pending tap, then spends that tap once. Cancel releases
the pending Ask action, returns to the opened email, and leaves the
notification available. The owner sends the resulting question from the
usual Ask Alpha composer.

```quint
type NoticeReview = { tap: bool, account: bool, reader: bool, revision: bool }

pure def reviewStillNamesTheNotice(review: NoticeReview): bool =
  review.tap and review.account and review.reader and review.revision
```
