# Sign-in

Signing in to Alpha Cloud on Alpha's own screens: a code sent by email or
text, or Google in a browser tab, then a second check when the account
asks for one. The phone's secure store keeps the sign-in itself; this
page only knows which account is signed in.

## Story: Choose how to sign in

> As the owner, I want to see the ways I can sign in on this phone, and
> to start with email even before Alpha knows the others work.

### Sign-in is closed, choosing, in the browser, at the code or at a second check

It holds the account signed in (none is 0), the request in flight, which
ways this phone offers, the browser tab last opened, the address a code
went to, the attempt that code belongs to with its wrong tries and its
times, the review of a sign-out, and what to tell the owner.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"

type Method = Email | Phone | Google
type Factor = Totp | Sms | Passkey
type Step = Closed | Choose | Browser | Code | Second
type Work = Resting | Sending | Resending | Verifying | Cancelling | Leaving
type Verdict = Passed | NeedsSecond | Wrong | Lapsed | Unreachable | Refused
type Trouble = Fine | WrongCode | CodeSpent | NotSent | NotResent | NoAnswer | NotSignedIn | NotSignedOut
type Notice = Quiet | SignedOut | CheckDevices | Restarted
type SignIn = {
  account: int, step: Step, work: Work, ticket: int,
  readiness: R::Read, google: bool, sms: bool, tab: int, orphan: bool,
  method: Method, address: str, prefill: bool,
  attempt: int, factor: Factor, wrong: int, spent: bool, expiresAt: int, resendAt: int,
  leave: V::Review, trouble: Trouble, notice: Notice,
}

pure val initial: SignIn = {
  account: 0, step: Closed, work: Resting, ticket: 0,
  readiness: R::unread, google: false, sms: false, tab: 0, orphan: false,
  method: Email, address: "", prefill: false,
  attempt: 0, factor: Totp, wrong: 0, spent: false, expiresAt: 0, resendAt: 0,
  leave: V::unreviewed, trouble: Fine, notice: Quiet,
}

pure val ticketValues = Set(1, 2, 3, 4)
pure val tabValues = Set(1, 2)
pure val accountValues = Set(-1, 0, 1, 2)
pure val nowValues = Set(0, 30, 100, 1000)
pure val addressValues = Set("", "owner@example.com", "+15550100")
pure val codeValues = Set("123456")
```

### A typed code is secret, and what the page asks of the phone never carries the sign-in back

The code goes to the phone to be checked and is kept nowhere on the page.

```quint
type SecretCode = str
type Effect = CheckMethods({ check: int }) | OpenBrowser({ tab: int }) | SendCode({ ticket: int, method: Method, address: str, keeps: int }) | Verify({ ticket: int, attempt: int, code: SecretCode }) | AskPasskey({ ticket: int, attempt: int }) | Withdraw({ ticket: int, tab: int }) | Abandon({ attempt: int }) | RemoveSignIn({ ticket: int })
type Moved = { state: SignIn, out: List[Effect] }
```

### Opening sign-in shows the choice and asks the phone which ways work

```quint
pure def canBegin(s: SignIn): bool = s.step == Closed and s.work == Resting

pure def begin(s: SignIn): Moved =
  { state: { ...s, step: Choose, trouble: Fine, prefill: false, google: false, sms: false,
      readiness: R::ask(s.readiness), leave: V::dismiss(s.leave) },
    out: List(CheckMethods({ check: s.readiness.ticket + 1 })) }

pure def canAskMethods(s: SignIn): bool = s.step == Choose and s.work == Resting and s.readiness.status != R::Loading

pure def askMethods(s: SignIn): Moved =
  { state: { ...s, readiness: R::ask(s.readiness) }, out: List(CheckMethods({ check: s.readiness.ticket + 1 })) }
```

### Email is always offered, and Google and text only once the phone says they work

Only the newest asking is answered.

```quint
pure def canMethods(s: SignIn, ticket: int): bool = R::canAnswer(s.readiness, ticket)

pure def methods(s: SignIn, ticket: int, ok: bool, google: bool, sms: bool): SignIn =
  { ...s, readiness: R::answer(s.readiness, ok), google: ok and google, sms: ok and sms }

pure def offered(s: SignIn, method: Method): bool =
  method == Email or (s.readiness.status == R::Loaded and (if (method == Google) s.google else s.sms))

pure def lawEmailIsOfferedBeforeThePhoneAnswers(ticket: int): bool =
  val asking = { ...initial, readiness: R::ask({ status: R::Idle, ticket: ticket }) }
  offered(asking, Email) and not(offered(asking, Google)) and not(offered(asking, Phone))
```

### Every request takes the next number, and what is asked of the phone names it

```quint
pure def stepEveryRequestTakesTheNextNumber(before: SignIn, after: SignIn, out: List[Effect]): bool =
  after.ticket >= before.ticket and out.every(e => match e {
    | SendCode(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | Verify(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | AskPasskey(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | Withdraw(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | RemoveSignIn(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | _ => true
  })
```

### What is in flight fits the step it was started from

```quint
pure def alwaysTheRequestFitsTheStep(s: SignIn): bool = and {
  s.work == Sending implies s.step == Choose,
  s.work == Resending implies s.step == Code,
  s.work == Verifying implies (s.step == Code or s.step == Second),
  s.work == Cancelling implies (s.step == Browser or s.step == Code or s.step == Second),
  s.work == Leaving implies (s.step == Closed and s.account > 0),
}
```

### Google can be offered

```quint
pure def sometimesGoogleIsOffered(s: SignIn): bool = s.step == Choose and offered(s, Google)
```

## Story: Sign in with a code

> As the owner, I want a code sent to my email or my number, to type it
> in, and to get another when the first no longer works, without losing
> the one I have.

### A code is sent to an address by a way this phone offers

```quint
pure def canSendCode(s: SignIn, method: Method, address: str): bool =
  s.step == Choose and s.work == Resting and method != Google and offered(s, method) and address != ""

pure def sendCode(s: SignIn, method: Method, address: str): Moved =
  { state: { ...s, work: Sending, ticket: s.ticket + 1, method: method, address: address, trouble: Fine, prefill: false },
    out: List(SendCode({ ticket: s.ticket + 1, method: method, address: address, keeps: 0 })) }
```

### A code that went out starts a new attempt, good for ten minutes, with another offered after a minute

A code that did not go out returns to the choice with the address filled
in. A resend that did not go out leaves the code step as it was.

```quint
pure val codeLife = 600
pure val cooldown = 60

pure def canSent(s: SignIn, ticket: int): bool = (s.work == Sending or s.work == Resending) and ticket == s.ticket

pure def sent(s: SignIn, ticket: int, accepted: bool, now: int): SignIn =
  if (accepted)
    { ...s, step: Code, work: Resting, attempt: s.attempt + 1, wrong: 0, spent: false,
      expiresAt: now + codeLife, resendAt: now + cooldown, trouble: Fine, prefill: false }
  else if (s.work == Sending) { ...s, work: Resting, trouble: NotSent, prefill: true }
  else { ...s, work: Resting, trouble: NotResent }
```

### Another code is asked for only on the code step, once a minute has passed since the last went out

The code the owner has stays good until the new one goes out.

```quint
pure def canResend(s: SignIn, now: int): bool = s.step == Code and s.work == Resting and now >= s.resendAt

pure def resend(s: SignIn, now: int): Moved =
  { state: { ...s, work: Resending, ticket: s.ticket + 1, trouble: Fine },
    out: List(SendCode({ ticket: s.ticket + 1, method: s.method, address: s.address, keeps: s.attempt })) }
```

### A resend that fails destroys nothing: the attempt, its tries and its times stay as they were

```quint
pure def stepAFailedResendKeepsTheAttempt(before: SignIn, via: str, after: SignIn): bool =
  (before.work == Resending and via == "sent" and after.attempt == before.attempt) implies and {
    after.step == Code, after.address == before.address, after.wrong == before.wrong,
    after.spent == before.spent, after.expiresAt == before.expiresAt, after.resendAt == before.resendAt,
  }

pure def stepAskingForAnotherCodeKeepsTheOneInHand(before: SignIn, via: str, after: SignIn): bool =
  via == "resend" implies and {
    after.step == Code, after.attempt == before.attempt, after.address == before.address,
    after.wrong == before.wrong, after.spent == before.spent, after.expiresAt == before.expiresAt,
  }
```

### An attempt begins only when a code went out or the browser asked for a second check, and the minute's wait only when a code went out

```quint
pure def stepAnAttemptBeginsOnlyWhenACodeWentOut(before: SignIn, via: str, after: SignIn): bool =
  (after.attempt != before.attempt implies ((via == "sent" or via == "returned") and after.attempt == before.attempt + 1))
    and (after.resendAt != before.resendAt implies (via == "sent" and after.attempt == before.attempt + 1))
```

### A typed code is checked only while the attempt is unspent and its ten minutes are running

```quint
pure def canVerify(s: SignIn, now: int): bool =
  (s.step == Code or (s.step == Second and s.factor != Passkey)) and s.work == Resting and not(s.spent) and now < s.expiresAt

pure def verify(s: SignIn, code: SecretCode, now: int): Moved =
  { state: { ...s, work: Verifying, ticket: s.ticket + 1, trouble: Fine },
    out: List(Verify({ ticket: s.ticket + 1, attempt: s.attempt, code: code })) }
```

### The phone's answer signs in, asks for a second check, counts a wrong code, or ends the attempt

A fifth wrong code spends it, and so does the phone saying it lapsed. A
check that never reached Cloud keeps the step and the attempt, to try
again. Any other refusal returns to the choice.

```quint
pure val maxWrong = 5

pure def admitted(account: int, revoked: bool, s: SignIn): SignIn =
  { ...s, account: account, step: Closed, work: Resting, wrong: 0, spent: false, address: "", prefill: false,
    trouble: Fine, notice: if (s.account != 0 and not(revoked)) CheckDevices else Quiet, leave: V::revise(s.leave) }

pure def chooser(trouble: Trouble, s: SignIn): SignIn =
  { ...s, step: Choose, work: Resting, wrong: 0, spent: false, trouble: trouble,
    prefill: (s.step == Code or s.step == Second) and s.address != "" }

pure def spentOr(trouble: Trouble, s: SignIn): SignIn =
  if (s.step == Code) { ...s, work: Resting, spent: true, trouble: CodeSpent } else chooser(trouble, s)

pure def canVerified(s: SignIn, ticket: int, verdict: Verdict, account: int): bool =
  s.work == Verifying and ticket == s.ticket and (verdict == Passed implies account > 0)
    and (verdict == NeedsSecond implies s.step == Code)

pure def verified(s: SignIn, ticket: int, verdict: Verdict, account: int, factor: Factor, revoked: bool): SignIn =
  if (verdict == Passed) admitted(account, revoked, s)
  else if (verdict == NeedsSecond) { ...s, step: Second, work: Resting, factor: factor, wrong: 0, trouble: Fine }
  else if (verdict == Wrong and s.wrong + 1 < maxWrong) { ...s, work: Resting, wrong: s.wrong + 1, trouble: WrongCode }
  else if (verdict == Wrong) spentOr(NotSignedIn, { ...s, wrong: s.wrong + 1 })
  else if (verdict == Lapsed) spentOr(NotSignedIn, s)
  else if (verdict == Unreachable) { ...s, work: Resting, trouble: NoAnswer }
  else chooser(NotSignedIn, s)
```

### A code whose ten minutes are over is spent

A spent emailed or texted code keeps its address on screen with only
another code to ask for. A second check that ran out returns to the
choice.

```quint
pure def canExpire(s: SignIn, now: int): bool =
  (s.step == Code or s.step == Second) and s.work == Resting and not(s.spent) and now >= s.expiresAt

pure def expire(s: SignIn, now: int): SignIn = spentOr(NotSignedIn, s)
```

### Wrong codes are counted up to five, and the fifth spends the code

```quint
pure def alwaysWrongCodesAreBounded(s: SignIn): bool =
  s.wrong >= 0 and s.wrong <= maxWrong and (s.wrong == maxWrong implies s.spent)

pure def stepOnlyAWrongCodeIsCounted(before: SignIn, via: str, after: SignIn): bool =
  after.wrong > before.wrong implies (via == "verified" and after.wrong == before.wrong + 1)
```

### A spent code is never checked again

```quint
pure def alwaysASpentCodeIsNeverChecked(s: SignIn): bool =
  s.spent implies (s.step == Code and s.work != Verifying)
```

### The code steps name an attempt, and the address is filled in only on the choice

```quint
pure def alwaysTheCodeStepsNameAnAttempt(s: SignIn): bool =
  s.attempt >= 0 and ((s.step == Code or s.step == Second) implies s.attempt > 0)
    and (s.prefill implies (s.step == Choose and s.address != ""))
```

### A code is only ever sent, or waited for, at an address

Discovered by the proof: without it, a send that failed could fill the
choice with an empty address.

```quint
pure def alwaysACodeHasAnAddress(s: SignIn): bool =
  (s.work == Sending or s.work == Resending or s.step == Code) implies s.address != ""
```

### An owner can sign in with a code

```quint
pure def sometimesSignedInWithACode(s: SignIn): bool = s.account > 0 and s.method == Email and s.attempt > 0 and s.step == Closed
```

### A code can be spent, with another still to ask for

```quint
pure def sometimesACodeIsSpent(s: SignIn): bool = s.spent and s.work == Resting
```

### A resend can fail and leave the code step as it was

```quint
pure def sometimesAFailedResendKeepsTheCode(s: SignIn): bool = s.trouble == NotResent and s.step == Code and not(s.spent)
```

### A wrong code can be counted

```quint
pure def sometimesAWrongCodeIsCounted(s: SignIn): bool = s.trouble == WrongCode and s.wrong > 0
```

## Story: Sign in with Google

> As the owner, I want to sign in with Google in a browser tab and come
> back to Alpha signed in, with no way for an old or copied return to
> sign anyone in.

### Google opens a new browser tab, and each tab has its own number

```quint
pure def canChooseGoogle(s: SignIn): bool = s.step == Choose and s.work == Resting and offered(s, Google)

pure def chooseGoogle(s: SignIn): Moved =
  { state: { ...s, step: Browser, method: Google, tab: s.tab + 1, orphan: false, address: "", prefill: false, trouble: Fine },
    out: List(OpenBrowser({ tab: s.tab + 1 })) }
```

### Only the return of the tab that is open is used, and using it closes the tab

It signs in, asks for a second check under a new attempt, or returns to
the choice.

```quint
pure def canReturned(s: SignIn, tab: int, verdict: Verdict, account: int): bool =
  s.step == Browser and s.work == Resting and tab == s.tab and (verdict == Passed implies account > 0)

pure def returned(s: SignIn, tab: int, verdict: Verdict, account: int, factor: Factor, revoked: bool, now: int): SignIn =
  if (verdict == Passed) admitted(account, revoked, s)
  else if (verdict == NeedsSecond)
    { ...s, step: Second, attempt: s.attempt + 1, factor: factor, wrong: 0, spent: false, expiresAt: now + codeLife, trouble: Fine }
  else chooser(NotSignedIn, s)
```

### A browser return is used exactly once

A tab that is open has a number no earlier tab had, and its return ends
the browser step, so the same return finds nothing to answer.

```quint
pure def stepABrowserReturnIsUsedOnce(before: SignIn, via: str, after: SignIn): bool =
  after.tab >= before.tab
    and (via == "returned" implies (before.step == Browser and after.step != Browser))
    and ((after.step == Browser and before.step != Browser) implies after.tab == before.tab + 1)
```

### An owner can sign in with Google

```quint
pure def sometimesSignedInWithGoogle(s: SignIn): bool = s.account > 0 and s.method == Google and s.step == Closed
```

## Story: Pass a second check

> As the owner of an account with a second check, I want to give my
> authenticator code, a texted code or my passkey, and never to be left
> on a step I cannot leave.

### A passkey is asked of the phone, with no code to type

```quint
pure def canUsePasskey(s: SignIn, now: int): bool =
  s.step == Second and s.factor == Passkey and s.work == Resting and now < s.expiresAt

pure def usePasskey(s: SignIn, now: int): Moved =
  { state: { ...s, work: Verifying, ticket: s.ticket + 1, trouble: Fine },
    out: List(AskPasskey({ ticket: s.ticket + 1, attempt: s.attempt })) }
```

### A second check can ask for an authenticator code, a texted code or a passkey

```quint
pure def sometimesAnAuthenticatorCodeIsAsked(s: SignIn): bool = s.step == Second and s.factor == Totp and s.address != ""

pure def sometimesATextedCodeIsAsked(s: SignIn): bool = s.step == Second and s.factor == Sms

pure def sometimesAPasskeyIsAsked(s: SignIn): bool = s.step == Second and s.factor == Passkey and s.method == Google
```

## Story: Change my mind

> As the owner, I want Back to leave any step, and a sign-in the phone
> had already stored to be kept rather than hidden behind the choice.

### Back leaves the choice, drops a code step, or asks the phone to withdraw what is in flight

A code step that is dropped tells the phone to abandon its attempt. A
check or a browser tab in flight is withdrawn, and the page waits for the
phone to say whether the sign-in had already been stored.

```quint
pure def canCancel(s: SignIn): bool = s.step != Closed and s.work != Cancelling

pure def cancel(s: SignIn): Moved =
  if (s.work == Verifying or s.step == Browser)
    { state: { ...s, work: Cancelling, ticket: s.ticket + 1 },
      out: List(Withdraw({ ticket: s.ticket + 1, tab: if (s.step == Browser) s.tab else 0 })) }
  else if (s.step == Choose and s.work == Resting) { state: { ...s, step: Closed, trouble: Fine, prefill: false }, out: List() }
  else { state: chooser(Fine, s), out: if (s.step == Code or s.step == Second) List(Abandon({ attempt: s.attempt })) else List() }
```

### A withdrawn sign-in that the phone had stored is signed in, and one it had not returns to the choice

```quint
pure def canCancelled(s: SignIn, ticket: int, account: int): bool = s.work == Cancelling and ticket == s.ticket and account >= 0

pure def cancelled(s: SignIn, ticket: int, account: int, revoked: bool): SignIn =
  if (account > 0) admitted(account, revoked, s) else chooser(Fine, s)
```

### An attempt is abandoned only by Back, and only the one on screen

```quint
pure def stepOnlyBackAbandonsAnAttempt(before: SignIn, via: str, after: SignIn, out: List[Effect]): bool =
  out.every(e => match e { | Abandon(a) => via == "cancel" and a.attempt == before.attempt and after.step == Choose | _ => true })
```

### A sign-in can be withdrawn while its check is in flight

```quint
pure def sometimesWithdrawnWhileChecking(s: SignIn): bool = s.work == Cancelling and s.step == Code
```

## Story: Sign out

> As the owner, I want to sign out only after confirming it for the
> account I was shown, and to be told when it is done.

### Sign-out is reviewed for the account signed in, with sign-in closed

```quint
pure def canAskSignOut(s: SignIn): bool = s.account > 0 and s.step == Closed and s.work == Resting and not(s.leave.showing)

pure def askSignOut(s: SignIn): SignIn = { ...s, leave: V::present(s.leave) }

pure def canKeepSignedIn(s: SignIn): bool = s.leave.showing

pure def keepSignedIn(s: SignIn): SignIn = { ...s, leave: V::dismiss(s.leave) }

pure def alwaysSignOutIsReviewedOnlyWhileSignedIn(s: SignIn): bool =
  s.account >= 0 and (s.leave.showing implies (s.account > 0 and s.step == Closed and s.work == Resting))
```

### Confirming asks the phone to remove the sign-in, and only the phone's answer signs out

A sign-in the phone could not remove stays, and the owner is told.

```quint
pure def canConfirmSignOut(s: SignIn): bool = V::canConfirm(s.leave) and s.account > 0 and s.step == Closed and s.work == Resting

pure def confirmSignOut(s: SignIn): Moved =
  { state: { ...s, leave: V::confirm(s.leave), work: Leaving, ticket: s.ticket + 1, trouble: Fine },
    out: List(RemoveSignIn({ ticket: s.ticket + 1 })) }

pure def canSignedOut(s: SignIn, ticket: int): bool = s.work == Leaving and ticket == s.ticket

pure def signedOut(s: SignIn, ticket: int, removed: bool): SignIn =
  if (removed) { ...s, account: 0, work: Resting, notice: SignedOut, leave: V::revise(s.leave) }
  else { ...s, work: Resting, trouble: NotSignedOut }

pure def stepTheSignInIsRemovedOnlyWhenConfirmed(before: SignIn, via: str, after: SignIn, out: List[Effect]): bool =
  out.every(e => match e { | RemoveSignIn(r) => via == "confirmSignOut" and before.leave.showing | _ => true })
```

### The owner is told of a sign-out, and of an earlier sign-in that could not be confirmed as ended

Signing in again while signed in ends the earlier sign-in. When the phone
cannot confirm that, the owner is told to check their devices.

```quint
pure def canDismissNotice(s: SignIn): bool = s.notice != Quiet

pure def dismissNotice(s: SignIn): SignIn = { ...s, notice: Quiet }
```

### An owner can be signed out and told so

```quint
pure def sometimesSignedOutAndTold(s: SignIn): bool = s.account == 0 and s.notice == SignedOut
```

### A sign-out can fail and leave the owner signed in

```quint
pure def sometimesASignOutFails(s: SignIn): bool = s.trouble == NotSignedOut and s.account > 0
```

### An owner can be told to check their devices

```quint
pure def sometimesToldToCheckDevices(s: SignIn): bool = s.notice == CheckDevices
```

## Story: Keep my sign-in on the phone

> As the owner, I want my sign-in to survive a restart, a sign-in that
> was under way to end cleanly, and nothing but the phone to say who is
> signed in.

### A restart keeps the account the phone holds and ends whatever was under way

The numbers of requests, tabs and attempts are kept, so an answer from
before the restart is never taken for a new one. A browser tab that was
open is orphaned.

```quint
pure def unasked(s: SignIn): R::Read = if (s.readiness.status == R::Loading) R::answer(s.readiness, false) else s.readiness

pure def canRestart(s: SignIn, account: int): bool = account >= 0

pure def restart(s: SignIn, account: int): SignIn =
  { ...s, account: account, step: Closed, work: Resting, orphan: s.orphan or s.step == Browser,
    readiness: unasked(s), google: false, sms: false, wrong: 0, spent: false, address: "", prefill: false,
    leave: V::dismiss(V::revise(s.leave)), trouble: Fine, notice: Quiet }
```

### The return of a tab orphaned by a restart signs no one in, and the owner is told once

```quint
pure def canReturnedCold(s: SignIn, tab: int): bool = s.orphan and tab == s.tab

pure def returnedCold(s: SignIn, tab: int): SignIn = { ...s, orphan: false, notice: Restarted }

pure def alwaysAnOrphanedTabIsNotOpen(s: SignIn): bool = s.orphan implies s.step != Browser
```

### The browser step, and a tab orphaned by a restart, name a tab that was opened

Discovered by the proof: without it, a restart could orphan a tab that
was never opened, whose number no return carries.

```quint
pure def alwaysTheBrowserNamesAnOpenedTab(s: SignIn): bool =
  s.tab >= 0 and ((s.step == Browser or s.orphan) implies s.tab > 0)
```

### The account changes only on the phone's word

```quint
pure def stepTheAccountChangesOnlyOnThePhonesWord(before: SignIn, via: str, after: SignIn): bool =
  after.account != before.account
    implies (via == "verified" or via == "returned" or via == "cancelled" or via == "signedOut" or via == "restart")
```

### A sign-in the phone stored before a restart is found after it

```quint
pure def sometimesSignedInAfterARestart(s: SignIn): bool = s.account > 0 and s.attempt == 0 and s.tab == 0
```

### An owner can be told that a restart ended a Google sign-in

```quint
pure def sometimesToldARestartEndedSignIn(s: SignIn): bool = s.notice == Restarted
```
