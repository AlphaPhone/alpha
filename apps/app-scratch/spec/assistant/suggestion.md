# Suggestion

The assistant can suggest wording for a text field the owner is writing in
(an email body, a message): the suggestion is shown in a review the owner
opens from a rendered control, and Insert places exactly the reviewed text
into the field it was reviewed for, once. Before inserting, the review is
checked against the phone as it is now: the same session and text, the
field still in front (not behind a chooser, the chat or the lock screen),
the same Cloud account, and the same target field with room for the text.
A changed session or text drops the review with a notice; a field that
moved, an account that changed or a target that changed refreshes the
review with its notice instead of inserting.

## Story: Use a suggested wording exactly as I reviewed it

> As the owner, I want Insert to put the very text I read into the field I
> read it for, and nothing when anything about it changed, so that a
> suggestion never lands somewhere else or twice.

### Insert places the reviewed text once, into the reviewed target, only when everything still matches

```quint
type Front = NormalFront | HiddenFront | ChooserFront | AwayFront | ChatFront | LockFront
type Wording = ShortText | EditedText | LongText | MissingText
type ReviewNotice = NoReviewNotice | FrontNotice | CloudNotice | TargetNotice
type Environment = { session: int, cloud: int, token: int, text: Wording, front: Front, ready: bool, room: bool, appendMode: bool }
type Review = { id: int, session: int, cloud: int, token: int, text: Wording, ready: bool, appendMode: bool, notice: ReviewNotice }
type Control = { slot: int, session: int, text: Wording, canOpen: bool, review: int }
type Insert = { token: int, text: Wording, appendMode: bool }
type Suggestions = { env: Environment, review: Review, serial: int, controls: List[Control], inserts: List[Insert], used: Set[int], toasts: int }
pure val noReview: Review = { id: 0, session: 0, cloud: 0, token: 0, text: MissingText, ready: false, appendMode: false, notice: NoReviewNotice }
pure val noControl: Control = { slot: 0, session: 0, text: MissingText, canOpen: false, review: 0 }
pure val initial: Suggestions = {
  env: { session: 1, cloud: 1, token: 1, text: ShortText, front: NormalFront, ready: true, room: true, appendMode: false },
  review: noReview, serial: 0, controls: List(), inserts: List(), used: Set(), toasts: 0,
}
pure def presenting(e: Environment): bool = e.front == NormalFront or e.front == HiddenFront or e.front == ChooserFront
pure def fits(e: Environment, text: Wording): bool = e.ready and e.room and text != LongText
pure def snapshot(e: Environment, id: int, session: int, cloud: int, text: Wording, notice: ReviewNotice): Review =
  { id: id, session: session, cloud: cloud, token: e.token, text: text, ready: fits(e, text), appendMode: e.appendMode, notice: notice }
pure def refreshed(cloud: int, notice: ReviewNotice, s: Suggestions): Suggestions =
  { ...s, serial: s.serial + 1, review: snapshot(s.env, s.serial + 1, s.review.session, cloud, s.review.text, notice) }
pure def controlOf(s: Suggestions, slot: int): Control = s.controls.foldl(noControl, (found, c) => if (c.slot == slot) c else found)
pure def setSession(s: Suggestions, session: int): Suggestions = { ...s, env: { ...s.env, session: session } }
pure def setCloud(s: Suggestions, cloud: int): Suggestions = { ...s, env: { ...s.env, cloud: cloud } }
pure def setText(s: Suggestions, text: Wording): Suggestions = { ...s, env: { ...s.env, text: text } }
pure def setFront(s: Suggestions, front: Front): Suggestions = { ...s, env: { ...s.env, front: front } }
pure def setTarget(s: Suggestions, token: int, ready: bool, room: bool, appendMode: bool): Suggestions =
  { ...s, env: { ...s.env, token: token, ready: ready, room: room, appendMode: appendMode } }
pure def render(s: Suggestions, slot: int): Suggestions = {
  val visible = presenting(s.env) and s.env.text != MissingText and s.review.text == s.env.text
  val review = if (visible) s.review else noReview
  val control = { slot: slot, session: s.env.session, text: s.env.text, review: review.id, canOpen: s.env.front != AwayFront and s.env.text != MissingText }
  { ...s, review: review, controls: s.controls.select(c => c.slot != slot).append(control) }
}
pure def canOpen(s: Suggestions, slot: int): bool = controlOf(s, slot).slot == slot and slot != 0
pure def open(s: Suggestions, slot: int): Suggestions = {
  val c = controlOf(s, slot)
  if (c.canOpen and c.session == s.env.session and c.text == s.env.text and presenting(s.env))
    refreshed(s.env.cloud, NoReviewNotice, { ...s, review: { ...noReview, session: c.session, text: c.text } })
  else s
}
pure def canClose(s: Suggestions, slot: int): bool = controlOf(s, slot).slot == slot and slot != 0
pure def close(s: Suggestions, slot: int): Suggestions = if (controlOf(s, slot).review == s.review.id) { ...s, review: noReview } else s
pure def canConfirm(s: Suggestions, slot: int): bool = controlOf(s, slot).slot == slot and slot != 0
pure def confirm(s: Suggestions, slot: int): Suggestions = {
  val e = s.env
  val r = s.review
  if (controlOf(s, slot).review != r.id or not(r.ready) or r.id == 0) s
  else if (e.session != r.session or e.text != r.text) { ...s, review: noReview, toasts: s.toasts + 1 }
  else if (not(presenting(e))) { ...s, review: noReview }
  else if (e.front != NormalFront) refreshed(r.cloud, FrontNotice, s)
  else if (e.cloud != r.cloud) refreshed(e.cloud, CloudNotice, s)
  else if (e.token != r.token or not(e.ready)) refreshed(r.cloud, TargetNotice, s)
  else { ...s, review: noReview, env: { ...e, front: ChatFront },
    inserts: s.inserts.append({ token: r.token, text: r.text, appendMode: r.appendMode }), used: s.used.union(Set(r.id)) }
}
pure def alwaysOneInsertPerReview(s: Suggestions): bool = s.inserts.length() == s.used.size()
pure def alwaysOnlyReviewedWordingIsInserted(s: Suggestions): bool = s.inserts.every(i => i.text == ShortText or i.text == EditedText)
pure def alwaysAUsedReviewIsNeverOpenAgain(s: Suggestions): bool = s.review.id != 0 implies not(s.used.contains(s.review.id))
pure def sometimesInserted(s: Suggestions): bool = s.inserts.length() >= 1
pure def sometimesRefreshedForAnotherAccount(s: Suggestions): bool = s.review.notice == CloudNotice
pure val slotValues = Set(1, 2)
pure val sessionValues = Set(1, 2)
pure val cloudValues = Set(1, 2)
pure val tokenValues = Set(1, 2)
```
