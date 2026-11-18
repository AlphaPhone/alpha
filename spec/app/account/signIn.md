# Sign-in

The steps of signing in to Alpha Cloud on Alpha's own screens: a code
sent by email or text, or Google in a browser tab, then a second check
when the account asks for one. The phone checks each code and keeps what
it verified until [Session](./session.md) has the agent held and asks it
to store the sign-in; this page hands over only the account and the way
it was made, and never sees the sign-in itself. Renewing a sign-in near
its end starts here too.

## Story: Choose how to sign in

> As the owner, I want to see the ways I can sign in on this phone, and
> to start with email even before Alpha knows the others work.

### Sign-in is closed, choosing, in the browser, at the code or at a second check

It holds the request in flight with its number, which ways this phone
offers, the browser visit and when it opened, the address a code is
sent to, the attempt that code belongs to with its wrong tries and its
end, the last address a code went to with when another may go there,
what to tell the owner, and whether it last handed a sign-in over.

```quint
import read as R from "../../kit/read"
import outside as O from "./outside"
import session as S from "./session"

type Factor = Totp | Sms | Passkey
type Step = Closed | Choose | Browser | Code | Second
type Work = Resting | Sending | Resending | Verifying | Cancelling
type Verdict = Passed | NeedsSecond | Wrong | Lapsed | Unreachable | Refused
type Trouble = Fine | WrongCode | CodeSpent | NotSent | NotResent | NoAnswer | NotSignedIn | TooLate | TabExpired | Restarted
type SignIn = {
  step: Step, work: Work, ticket: int,
  readiness: R::Read, google: bool, sms: bool, tab: O::Visit, tabAt: int,
  method: S::Method, address: str, prefill: bool,
  attempt: int, factor: Factor, wrong: int, spent: bool, expiresAt: int,
  sentTo: str, resendAt: int, trouble: Trouble, handed: bool,
}

pure val initial: SignIn = {
  step: Closed, work: Resting, ticket: 0,
  readiness: R::unread, google: false, sms: false, tab: O::novisit, tabAt: 0,
  method: S::Email, address: "", prefill: false,
  attempt: 0, factor: Totp, wrong: 0, spent: false, expiresAt: 0,
  sentTo: "", resendAt: 0, trouble: Fine, handed: false,
}

pure val ticketValues = Set(1, 2, 3, 4)
pure val tabValues = Set(1, 2)
pure val accountValues = Set(-1, 1, 2)
pure val nowValues = Set(0, 30, 100, 1000)
pure val addressValues = Set("", "owner@example.com", "+15550100")
pure val codeValues = Set("123456")
pure val weight_sent = 10
pure val weight_verified = 10
```

### A typed code is secret, and what the page asks of the phone never carries the sign-in back

The code goes to the phone to be checked and is kept nowhere on the page.
A verified sign-in is handed to [Session](./session.md) as the account
and the way it was made.

```quint
type SecretCode = str
type Effect =
  CheckMethods({ check: int }) | OpenBrowser({ tab: int }) | SendCode({ ticket: int, method: S::Method, address: str, keeps: int })
  | Verify({ ticket: int, attempt: int, code: SecretCode }) | AskPasskey({ ticket: int, attempt: int })
  | Withdraw({ ticket: int, tab: int }) | Abandon({ attempt: int }) | Admit({ account: int, method: S::Method })
type Moved = { state: SignIn, out: List[Effect] }
```

### Opening sign-in shows the choice and asks the phone which ways work

```quint
pure def canBegin(s: SignIn): bool = s.step == Closed and s.work == Resting

pure def begin(s: SignIn): Moved =
  { state: { ...s, step: Choose, trouble: Fine, prefill: false, google: false, sms: false, handed: false,
      readiness: R::ask(s.readiness) },
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

pure def offered(s: SignIn, method: S::Method): bool =
  method == S::Email or (s.readiness.status == R::Loaded and (if (method == S::Google) s.google else s.sms))

pure def lawEmailIsOfferedBeforeThePhoneAnswers(ticket: int): bool =
  val asking = { ...initial, readiness: R::ask({ status: R::Idle, ticket: ticket }) }
  offered(asking, S::Email) and not(offered(asking, S::Google)) and not(offered(asking, S::Phone))
```

### Offline, sign-in offers nothing that needs Cloud, and says so

The phone says whether it is online. Back and the choice itself still
work.

```quint
pure def lawOfflineOffersNothingThatNeedsCloud(method: S::Method, address: str, now: int): bool =
  val choosing = { ...initial, step: Choose, readiness: { status: R::Loaded, ticket: 1 }, google: true, sms: true }
  val atCode = { ...initial, step: Code, attempt: 1, address: "owner@example.com", expiresAt: now + 1 }
  not(canSendCode(choosing, method, address, now, false)) and not(canChooseGoogle(choosing, false))
    and not(canResend(atCode, now, false)) and not(canVerify(atCode, now, false)) and canCancel(atCode)
```

### Every request takes the next number, the number moves only with a request, and what is asked of the phone names it

```quint
pure def ticketed(out: List[Effect]): bool =
  out.some(e => match e {
    | SendCode(x) => true | Verify(x) => true | AskPasskey(x) => true | Withdraw(x) => true | _ => false
  })

pure def stepEveryRequestTakesTheNextNumber(before: SignIn, after: SignIn, out: List[Effect]): bool =
  out.every(e => match e {
    | SendCode(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | Verify(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | AskPasskey(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | Withdraw(x) => x.ticket == after.ticket and after.ticket == before.ticket + 1
    | _ => true
  }) and (ticketed(out) or after.ticket == before.ticket)
```

### What is in flight fits the step it was started from, and the browser visit is open exactly on the browser step

```quint
pure def alwaysTheRequestFitsTheStep(s: SignIn): bool = and {
  s.work == Sending implies s.step == Choose,
  s.work == Resending implies s.step == Code,
  s.work == Verifying implies (s.step == Code or s.step == Second),
  s.work == Cancelling implies s.step != Closed,
  s.step == Closed implies s.work == Resting,
  O::valid(s.tab), s.tab.open iff s.step == Browser,
}
```

### Google can be offered

```quint
pure def sometimesGoogleIsOffered(s: SignIn): bool = s.step == Choose and offered(s, S::Google)
```

## Story: Sign in with a code

> As the owner, I want a code sent to my email or my number, to type it
> in, and to get another when the first no longer works, without losing
> the one I have.

### A code is sent to an address by a way this phone offers, and a code to the same address waits its minute even from the choice

```quint
pure def canSendCode(s: SignIn, method: S::Method, address: str, now: int, online: bool): bool =
  s.step == Choose and s.work == Resting and online and method != S::Google and offered(s, method) and address != ""
    and (address != s.sentTo or now >= s.resendAt)

pure def sendCode(s: SignIn, method: S::Method, address: str, now: int, online: bool): Moved =
  { state: { ...s, work: Sending, ticket: s.ticket + 1, method: method, address: address, trouble: Fine, prefill: false },
    out: List(SendCode({ ticket: s.ticket + 1, method: method, address: address, keeps: 0 })) }

pure def lawTheChoiceKeepsTheMinute(now: int): bool =
  val back = { ...initial, step: Choose, sentTo: "owner@example.com", resendAt: now + 1 }
  not(canSendCode(back, S::Email, "owner@example.com", now, true)) and canSendCode(back, S::Email, "+15550100", now, true)
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
      expiresAt: now + codeLife, sentTo: s.address, resendAt: now + cooldown, trouble: Fine, prefill: false }
  else if (s.work == Sending) { ...s, work: Resting, trouble: NotSent, prefill: true }
  else { ...s, work: Resting, trouble: NotResent }
```

### Another code is asked for on the code step once a minute has passed since the last went out

The code the owner has stays good until the new one goes out.

```quint
pure def canResend(s: SignIn, now: int, online: bool): bool = s.step == Code and s.work == Resting and online and now >= s.resendAt

pure def resend(s: SignIn, now: int, online: bool): Moved =
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
    and ((after.resendAt != before.resendAt or after.sentTo != before.sentTo) implies (via == "sent" and after.attempt == before.attempt + 1))
```

### A typed code is checked only while the attempt is unspent and its time is running

```quint
pure def canVerify(s: SignIn, now: int, online: bool): bool =
  (s.step == Code or (s.step == Second and s.factor != Passkey)) and s.work == Resting and online and not(s.spent) and now < s.expiresAt

pure def verify(s: SignIn, code: SecretCode, now: int, online: bool): Moved =
  { state: { ...s, work: Verifying, ticket: s.ticket + 1, trouble: Fine },
    out: List(Verify({ ticket: s.ticket + 1, attempt: s.attempt, code: code })) }
```

### The phone's answer hands the sign-in over, asks for a second check, counts a wrong code, or ends the attempt

A fifth wrong code spends it, and so does the phone saying it lapsed. A
check that never reached Cloud keeps the step and the attempt, to try
again. Any other refusal returns to the choice.

```quint
pure val maxWrong = 5

pure def handOver(account: int, s: SignIn): Moved =
  { state: { ...s, step: Closed, work: Resting, wrong: 0, spent: false, address: "", prefill: false, trouble: Fine,
      handed: true, tab: O::back(s.tab) },
    out: List(Admit({ account: account, method: s.method })) }

pure def chooser(trouble: Trouble, s: SignIn): SignIn =
  { ...s, step: Choose, work: Resting, wrong: 0, spent: false, trouble: trouble, tab: O::back(s.tab),
    prefill: (s.step == Code or s.step == Second) and s.address != "" }

pure def spentOr(trouble: Trouble, s: SignIn): SignIn =
  if (s.step == Code) { ...s, work: Resting, spent: true, trouble: CodeSpent } else chooser(trouble, s)

pure def canVerified(s: SignIn, ticket: int, verdict: Verdict, account: int): bool =
  s.work == Verifying and ticket == s.ticket and (verdict == Passed implies account > 0)
    and (verdict == NeedsSecond implies s.step == Code)

pure def verified(s: SignIn, ticket: int, verdict: Verdict, account: int, factor: Factor, now: int): Moved =
  if (verdict == Passed) handOver(account, s)
  else if (verdict == NeedsSecond)
    { state: { ...s, step: Second, work: Resting, factor: factor, wrong: 0, expiresAt: now + secondLife, trouble: Fine }, out: List() }
  else if (verdict == Wrong and s.wrong + 1 < maxWrong) { state: { ...s, work: Resting, wrong: s.wrong + 1, trouble: WrongCode }, out: List() }
  else if (verdict == Wrong) { state: spentOr(NotSignedIn, { ...s, wrong: s.wrong + 1 }), out: List() }
  else if (verdict == Lapsed) { state: spentOr(NotSignedIn, s), out: List() }
  else if (verdict == Unreachable) { state: { ...s, work: Resting, trouble: NoAnswer }, out: List() }
  else { state: chooser(NotSignedIn, s), out: List() }
```

### Only a verified answer hands a sign-in over, naming its account

```quint
pure def stepOnlyAVerifiedAnswerHandsOver(before: SignIn, via: str, after: SignIn, out: List[Effect]): bool =
  out.every(e => match e {
    | Admit(a) => a.account > 0 and (via == "verified" or via == "returned") and after.handed and after.step == Closed
    | _ => true
  })
```

### A code whose ten minutes are over is spent

A spent emailed or texted code keeps its address on screen with only
another code to ask for.

```quint
pure def canExpire(s: SignIn, now: int): bool =
  (s.step == Code or s.step == Second) and s.work == Resting and not(s.spent) and now >= s.expiresAt

pure def expire(s: SignIn, now: int): SignIn = spentOr(TooLate, s)
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

### A code can be handed over as a sign-in

```quint
pure def sometimesHandedOverWithACode(s: SignIn): bool = s.handed and s.method == S::Email and s.attempt > 0
```

### A code can be spent, with another still to ask for

```quint
pure def sometimesACodeIsSpent(s: SignIn): bool = s.spent and s.work == Resting
```

### A send can fail and return to the choice with the address filled in

```quint
pure def sometimesASendFailsWithTheAddressKept(s: SignIn): bool = s.trouble == NotSent and s.prefill
```

### A resend can fail and leave the code step as it was

```quint
pure def sometimesAFailedResendKeepsTheCode(s: SignIn): bool = s.trouble == NotResent and s.step == Code and not(s.spent)
```

### A wrong code can be counted

```quint
pure def sometimesAWrongCodeIsCounted(s: SignIn): bool = s.trouble == WrongCode and s.wrong > 0
```

### A check that did not reach Cloud keeps the code to try again

```quint
pure def sometimesNoAnswerKeepsTheCode(s: SignIn): bool = s.trouble == NoAnswer and s.step == Code and not(s.spent)
```

### The choice can make the owner wait for another code to the same address

```quint
pure def sometimesTheChoiceWaitsItsMinute(s: SignIn): bool = s.step == Choose and s.sentTo != "" and s.attempt > 0 and s.work == Resting
```

## Story: Sign in with Google

> As the owner, I want to sign in with Google in a browser tab and come
> back to Alpha signed in, with no way for an old or copied return to
> sign anyone in, and never to wait for a tab that does not come back.

### Google opens a new browser visit, each with its own number, and opening it again retires the one open

```quint
pure def canChooseGoogle(s: SignIn, online: bool): bool = s.step == Choose and s.work == Resting and online and offered(s, S::Google)

pure def chooseGoogle(s: SignIn, now: int, online: bool): Moved =
  { state: { ...s, step: Browser, method: S::Google, tab: O::go(s.tab), tabAt: now, address: "", prefill: false, trouble: Fine },
    out: List(OpenBrowser({ tab: s.tab.number + 1 })) }

pure def canReopenGoogle(s: SignIn, online: bool): bool = s.step == Browser and s.work == Resting and online

pure def reopenGoogle(s: SignIn, now: int, online: bool): Moved =
  { state: { ...s, tab: O::go(s.tab), tabAt: now, trouble: Fine }, out: List(OpenBrowser({ tab: s.tab.number + 1 })) }
```

### Only the return of the visit that is open is used, and using it closes the visit

It hands the sign-in over, asks for a second check under a new attempt
with its own ten minutes, or returns to the choice.

```quint
pure def canReturned(s: SignIn, tab: int, verdict: Verdict, account: int): bool =
  s.step == Browser and s.work == Resting and O::canReturn(s.tab, tab) and (verdict == Passed implies account > 0)

pure def returned(s: SignIn, tab: int, verdict: Verdict, account: int, factor: Factor, now: int): Moved =
  if (verdict == Passed) handOver(account, s)
  else if (verdict == NeedsSecond)
    { state: { ...s, step: Second, tab: O::back(s.tab), attempt: s.attempt + 1, factor: factor, wrong: 0, spent: false,
        expiresAt: now + secondLife, trouble: Fine }, out: List() }
  else { state: chooser(NotSignedIn, s), out: List() }
```

### A browser return is used exactly once, and every visit opened takes the next number

```quint
pure def stepABrowserReturnIsUsedOnce(before: SignIn, via: str, after: SignIn, out: List[Effect]): bool =
  after.tab.number >= before.tab.number
    and (via == "returned" implies (before.tab.open and not(after.tab.open)))
    and out.every(e => match e { | OpenBrowser(o) => o.tab == after.tab.number and after.tab.number == before.tab.number + 1 and after.tab.open | _ => true })
```

### A browser visit that does not come back within ten minutes ends, and its return is then refused

```quint
pure val browserGrace = 600

pure def canBrowserTimedOut(s: SignIn, now: int): bool = s.step == Browser and s.work == Resting and now >= s.tabAt + browserGrace

pure def browserTimedOut(s: SignIn, now: int): SignIn = chooser(TabExpired, s)
```

### A Google sign-in can be handed over

```quint
pure def sometimesHandedOverWithGoogle(s: SignIn): bool = s.handed and s.method == S::Google
```

### A browser visit can time out

```quint
pure def sometimesTheBrowserTimedOut(s: SignIn): bool = s.trouble == TabExpired and s.step == Choose
```

## Story: Pass a second check

> As the owner of an account with a second check, I want to give my
> authenticator code, a texted code or my passkey, and never to be left
> on a step I cannot leave.

### A second check has its own ten minutes, however much the code before it had left

```quint
pure val secondLife = 600

pure def lawASecondCheckHasItsOwnTenMinutes(now: int): bool =
  val checking = { ...initial, step: Code, work: Verifying, ticket: 1, attempt: 1, address: "owner@example.com", expiresAt: now + 1 }
  verified(checking, 1, NeedsSecond, 0, Totp, now).state.expiresAt == now + secondLife
```

### A passkey is asked of the phone, with no code to type

```quint
pure def canUsePasskey(s: SignIn, now: int, online: bool): bool =
  s.step == Second and s.factor == Passkey and s.work == Resting and online and now < s.expiresAt

pure def usePasskey(s: SignIn, now: int, online: bool): Moved =
  { state: { ...s, work: Verifying, ticket: s.ticket + 1, trouble: Fine },
    out: List(AskPasskey({ ticket: s.ticket + 1, attempt: s.attempt })) }
```

### A second check can ask for an authenticator code, a texted code or a passkey

```quint
pure def sometimesAnAuthenticatorCodeIsAsked(s: SignIn): bool = s.step == Second and s.factor == Totp and s.address != ""

pure def sometimesATextedCodeIsAsked(s: SignIn): bool = s.step == Second and s.factor == Sms

pure def sometimesAPasskeyIsAsked(s: SignIn): bool = s.step == Second and s.factor == Passkey and s.method == S::Google
```

### A second check that ran out returns to the choice

```quint
pure def sometimesASecondCheckRanOut(s: SignIn): bool = s.trouble == TooLate and s.step == Choose
```

## Story: Change my mind

> As the owner, I want Back to leave any step, and nothing I backed out
> of to sign me in.

### Back leaves the choice, drops a code step, or asks the phone to withdraw what is in flight

A code step that is dropped tells the phone to abandon its attempt. A
send, a resend, a check or a browser visit in flight is withdrawn, so the
phone drops any attempt or sign-in it made for it, and the page waits for
the phone to say so.

```quint
pure def canCancel(s: SignIn): bool = s.step != Closed and s.work != Cancelling

pure def cancel(s: SignIn): Moved =
  val abandon = if (s.step == Code or s.step == Second) List(Abandon({ attempt: s.attempt })) else List()
  if (s.work != Resting or s.step == Browser)
    { state: { ...s, work: Cancelling, ticket: s.ticket + 1 },
      out: List(Withdraw({ ticket: s.ticket + 1, tab: if (s.step == Browser) s.tab.number else 0 })).concat(abandon) }
  else if (s.step == Choose) { state: { ...s, step: Closed, trouble: Fine, prefill: false }, out: List() }
  else { state: chooser(Fine, s), out: abandon }

pure def stepBackWithdrawsWhatIsInFlight(before: SignIn, via: str, after: SignIn, out: List[Effect]): bool =
  (via == "cancel" and (before.work != Resting or before.step == Browser))
    implies out.some(e => match e { | Withdraw(w) => true | _ => false })
```

### A withdrawal the phone answered returns to the choice, and nothing withdrawn signs anyone in

```quint
pure def canCancelled(s: SignIn, ticket: int): bool = s.work == Cancelling and ticket == s.ticket

pure def cancelled(s: SignIn, ticket: int): SignIn = chooser(Fine, s)
```

### An attempt is abandoned only by Back, and only the one on screen

```quint
pure def stepOnlyBackAbandonsAnAttempt(before: SignIn, via: str, after: SignIn, out: List[Effect]): bool =
  out.every(e => match e { | Abandon(a) => via == "cancel" and a.attempt == before.attempt | _ => true })
```

### A sign-in can be withdrawn while its check is in flight

```quint
pure def sometimesWithdrawnWhileChecking(s: SignIn): bool = s.work == Cancelling and s.step == Code
```

### A browser sign-in can be withdrawn

```quint
pure def sometimesWithdrawnFromTheBrowser(s: SignIn): bool = s.work == Cancelling and s.step == Browser
```

## Story: Restart in the middle of signing in

> As the owner, I want a sign-in under way when Alpha restarts to end
> cleanly, and a browser tab that comes back afterwards to sign no one
> in.

### A restart ends whatever was under way and orphans an open browser visit

The numbers of requests, visits and attempts are kept, so an answer from
before the restart is never taken for a new one.

```quint
pure def restart(s: SignIn): SignIn =
  { ...s, step: Closed, work: Resting, tab: O::orphaned(s.tab), readiness: O::retire(s.readiness),
    google: false, sms: false, wrong: 0, spent: false, address: "", prefill: false, trouble: Fine, handed: false }
```

### The return of a visit orphaned by a restart signs no one in, and the owner is told once

```quint
pure def canReturnedCold(s: SignIn, tab: int): bool = O::canReturnCold(s.tab, tab)

pure def returnedCold(s: SignIn, tab: int): SignIn = { ...s, tab: O::coldBack(s.tab), trouble: Restarted }
```

### An owner can be told that a restart ended a Google sign-in

```quint
pure def sometimesToldARestartEndedSignIn(s: SignIn): bool = s.trouble == Restarted
```

### Erasing Alpha ends whatever was under way and refuses every answer still in flight

```quint
pure def erase(s: SignIn): SignIn =
  { ...restart(s), tab: O::back(O::coldBack(s.tab)) }
```
