# Telegram authentication

Signing in to the owner's own Telegram user account on Alpha: phone number,
verification code and optional two-factor cloud password, or QR login. Bot
tokens are never admitted anywhere. Every secret (verification codes, two-factor
passwords, QR login tokens and session tokens) is typed as a Quint secret so it
can never reach public state, logs or Ask Alpha context. Every non-authenticated
screen is marked sensitive so Ask Alpha withholds ambient observation while
signing in.

## Story: Sign in to my Telegram user account

> As the owner, I want to sign in to my own Telegram user account with my phone
> number or a QR code, handle two-factor passwords and rate limits cleanly, and
> wipe all local data if I sign out or my session is revoked remotely.

### Authentication holds the step, in-flight request ticket, flood-wait deadline, account kind, credential revision, trouble and clock

Account 0 is none; credential revision 0 is unauthenticated. Verification codes,
two-factor passwords, QR tokens and session tokens are secrets and never stored
in public state.

```quint
type SecretCode = str
type SecretPassword = str
type SecretQrToken = str
type SecretSession = str

type AuthKind = UserAccount | BotToken
type Step =
  | SignedOut
  | PhoneEntry
  | CodePending
  | QrPending
  | QrScanned
  | TwoFactorRequired
  | Authenticated
  | SessionExpired
type Work = Idle | SendingCode | VerifyingCode | CheckingPassword | PollingQr | LoggingOut
type Trouble =
  | Fine
  | InvalidPhone
  | WrongCode
  | ExpiredCode
  | WrongPassword
  | FloodWait
  | Offline
  | Unreachable
  | BotTokenRejected
  | SessionRevoked
type SendOutcome = CodeDelivered | SendFailed({ trouble: Trouble, wait: int })
type AuthOutcome =
  | AuthUser({ account: int })
  | AuthNeeds2fa
  | AuthBot
  | AuthFailed({ trouble: Trouble, wait: int })
type Auth = {
  step: Step, work: Work, ticket: int, account: int, kind: AuthKind,
  credentialRev: int, floodUntil: int, qrExpiresAt: int, clock: int,
  trouble: Trouble,
}

type Effect =
  | SendPhoneCode({ ticket: int, phone: str })
  | VerifyPhoneCode({ ticket: int, code: SecretCode })
  | CheckCloudPassword({ ticket: int, password: SecretPassword })
  | StartQrLogin({ ticket: int })
  | SubmitQrToken({ ticket: int, token: SecretQrToken })
  | StoreSession({ credentialRev: int, session: SecretSession })
  | LogOutRemote({ ticket: int, account: int })
  | WipeLocal({ credentialRev: int })
  | StopSync
type Moved = { state: Auth, out: List[Effect] }

pure val initial: Auth = {
  step: SignedOut, work: Idle, ticket: 0, account: 0, kind: UserAccount,
  credentialRev: 0, floodUntil: 0, qrExpiresAt: 0, clock: 0, trouble: Fine,
}

pure val phoneValues = Set("", "+15550100")
pure val codeValues = Set("12345")
pure val passwordValues = Set("cloud-pass")
pure val tokenValues = Set("qr-token-1")
pure val sessionValues = Set("session-1")
pure val ticketValues = 1.to(20)
pure val nowValues = Set(0, 30, 60)
pure val sendOutcomeValues = Set(
  CodeDelivered,
  SendFailed({ trouble: FloodWait, wait: 30 }),
  SendFailed({ trouble: Unreachable, wait: 0 }),
)
pure val authOutcomeValues = Set(
  AuthUser({ account: 1 }),
  AuthNeeds2fa,
  AuthBot,
  AuthFailed({ trouble: WrongCode, wait: 0 }),
  AuthFailed({ trouble: ExpiredCode, wait: 0 }),
  AuthFailed({ trouble: FloodWait, wait: 30 }),
)
pure val weight_codeSent = 2
pure val weight_codeVerified = 2
pure val weight_passwordChecked = 2
pure val weight_qrAnswered = 2
pure val weight_loggedOut = 2
```

### Every non-authenticated auth state is sensitive, so Ask Alpha sees nothing of sign-in screens

```quint
pure def sensitive(s: Auth): bool = s.step != Authenticated

pure def alwaysAuthScreensAreSensitive(s: Auth): bool =
  (s.step != Authenticated implies sensitive(s)) and (s.step == Authenticated implies not(sensitive(s)))
```

### Opening sign-in moves to phone entry or QR login; phone submission respects FloodWait and takes the next ticket

```quint
pure def canOpenSignIn(s: Auth): bool =
  (s.step == SignedOut or s.step == SessionExpired) and s.work == Idle

pure def openSignIn(s: Auth): Auth = { ...s, step: PhoneEntry, trouble: Fine }

pure def canSendCode(s: Auth, phone: str, now: int, online: bool): bool =
  s.step == PhoneEntry and s.work == Idle and online and phone != "" and now >= s.clock and now >= s.floodUntil

pure def sendCode(s: Auth, phone: str, now: int, online: bool): Moved =
  val ticket = s.ticket + 1
  {
    state: { ...s, work: SendingCode, ticket: ticket, clock: now, trouble: Fine },
    out: List(SendPhoneCode({ ticket: ticket, phone: phone })),
  }

pure def canCodeSent(s: Auth, ticket: int): bool =
  s.work == SendingCode and ticket == s.ticket

pure def codeSent(s: Auth, ticket: int, sendOutcome: SendOutcome, now: int): Auth =
  val t = if (now >= s.clock) now else s.clock
  match sendOutcome {
    | CodeDelivered => { ...s, step: CodePending, work: Idle, clock: t, trouble: Fine }
    | SendFailed(f) =>
      if (f.trouble == FloodWait and f.wait > 0)
        { ...s, work: Idle, clock: t, floodUntil: t + f.wait, trouble: FloodWait }
      else { ...s, work: Idle, clock: t, trouble: if (f.trouble == Fine) Unreachable else f.trouble }
  }
```

### A verification code is checked with a secret code, and may authenticate a user account, request two-factor password, expire or trigger FloodWait

Bot tokens are refused even if returned by a misbehaving peer.

```quint
pure def canVerifyCode(s: Auth, now: int, online: bool): bool =
  s.step == CodePending and s.work == Idle and online and now >= s.clock and now >= s.floodUntil

pure def verifyCode(s: Auth, code: SecretCode, now: int, online: bool): Moved =
  val ticket = s.ticket + 1
  {
    state: { ...s, work: VerifyingCode, ticket: ticket, clock: now, trouble: Fine },
    out: List(VerifyPhoneCode({ ticket: ticket, code: code })),
  }

pure def canCodeVerified(s: Auth, ticket: int): bool =
  s.work == VerifyingCode and ticket == s.ticket

pure def codeVerified(s: Auth, ticket: int, authOutcome: AuthOutcome, session: SecretSession, now: int): Moved =
  val rev = s.credentialRev + 1
  val t = if (now >= s.clock) now else s.clock
  match authOutcome {
    | AuthNeeds2fa =>
      { state: { ...s, step: TwoFactorRequired, work: Idle, clock: t, trouble: Fine }, out: List() }
    | AuthBot =>
      { state: { ...s, step: PhoneEntry, work: Idle, clock: t, trouble: BotTokenRejected }, out: List() }
    | AuthUser(u) =>
      if (u.account > 0)
        {
          state: { ...s, step: Authenticated, work: Idle, account: u.account, kind: UserAccount, credentialRev: rev, clock: t, trouble: Fine },
          out: List(StoreSession({ credentialRev: rev, session: session })),
        }
      else { state: { ...s, work: Idle, clock: t, trouble: WrongCode }, out: List() }
    | AuthFailed(f) =>
      if (f.trouble == ExpiredCode)
        { state: { ...s, step: PhoneEntry, work: Idle, clock: t, trouble: ExpiredCode }, out: List() }
      else if (f.trouble == FloodWait and f.wait > 0)
        { state: { ...s, work: Idle, clock: t, floodUntil: t + f.wait, trouble: FloodWait }, out: List() }
      else { state: { ...s, work: Idle, clock: t, trouble: if (f.trouble == Fine) WrongCode else f.trouble }, out: List() }
  }
```

### Two-factor cloud password is checked as a secret and authenticates only a user account

```quint
pure def canCheckPassword(s: Auth, now: int, online: bool): bool =
  s.step == TwoFactorRequired and s.work == Idle and online and now >= s.clock and now >= s.floodUntil

pure def checkPassword(s: Auth, password: SecretPassword, now: int, online: bool): Moved =
  val ticket = s.ticket + 1
  {
    state: { ...s, work: CheckingPassword, ticket: ticket, clock: now, trouble: Fine },
    out: List(CheckCloudPassword({ ticket: ticket, password: password })),
  }

pure def canPasswordChecked(s: Auth, ticket: int): bool =
  s.work == CheckingPassword and ticket == s.ticket

pure def passwordChecked(s: Auth, ticket: int, authOutcome: AuthOutcome, session: SecretSession, now: int): Moved =
  val rev = s.credentialRev + 1
  val t = if (now >= s.clock) now else s.clock
  match authOutcome {
    | AuthBot =>
      { state: { ...s, step: PhoneEntry, work: Idle, clock: t, trouble: BotTokenRejected }, out: List() }
    | AuthUser(u) =>
      if (u.account > 0)
        {
          state: { ...s, step: Authenticated, work: Idle, account: u.account, kind: UserAccount, credentialRev: rev, clock: t, trouble: Fine },
          out: List(StoreSession({ credentialRev: rev, session: session })),
        }
      else { state: { ...s, work: Idle, clock: t, trouble: WrongPassword }, out: List() }
    | AuthNeeds2fa =>
      { state: { ...s, work: Idle, clock: t, trouble: WrongPassword }, out: List() }
    | AuthFailed(f) =>
      if (f.trouble == FloodWait and f.wait > 0)
        { state: { ...s, work: Idle, clock: t, floodUntil: t + f.wait, trouble: FloodWait }, out: List() }
      else { state: { ...s, work: Idle, clock: t, trouble: if (f.trouble == Fine) WrongPassword else f.trouble }, out: List() }
  }
```

### QR login offers an alternate user-account path with expiry, optional two-factor check and secret token

```quint
pure val qrLifetime = 30

pure def canStartQr(s: Auth, now: int, online: bool): bool =
  (s.step == PhoneEntry or s.step == QrPending) and s.work == Idle and online and now >= s.clock and now >= s.floodUntil

pure def startQr(s: Auth, now: int, online: bool): Moved =
  val ticket = s.ticket + 1
  {
    state: { ...s, step: QrPending, work: PollingQr, ticket: ticket, qrExpiresAt: now + qrLifetime, clock: now, trouble: Fine },
    out: List(StartQrLogin({ ticket: ticket })),
  }

pure def canScanQr(s: Auth, now: int): bool =
  s.step == QrPending and s.work == PollingQr and now >= s.clock and now < s.qrExpiresAt

pure def scanQr(s: Auth, token: SecretQrToken, now: int): Moved =
  val ticket = s.ticket + 1
  {
    state: { ...s, step: QrScanned, work: PollingQr, ticket: ticket, clock: now, trouble: Fine },
    out: List(SubmitQrToken({ ticket: ticket, token: token })),
  }

pure def canQrAnswered(s: Auth, ticket: int): bool =
  s.work == PollingQr and ticket == s.ticket

pure def qrAnswered(s: Auth, ticket: int, authOutcome: AuthOutcome, session: SecretSession, now: int): Moved =
  val rev = s.credentialRev + 1
  val t = if (now >= s.clock) now else s.clock
  match authOutcome {
    | AuthNeeds2fa =>
      { state: { ...s, step: TwoFactorRequired, work: Idle, clock: t, trouble: Fine }, out: List() }
    | AuthBot =>
      { state: { ...s, step: PhoneEntry, work: Idle, clock: t, trouble: BotTokenRejected }, out: List() }
    | AuthUser(u) =>
      if (u.account > 0)
        {
          state: { ...s, step: Authenticated, work: Idle, account: u.account, kind: UserAccount, credentialRev: rev, clock: t, trouble: Fine },
          out: List(StoreSession({ credentialRev: rev, session: session })),
        }
      else { state: { ...s, step: QrPending, work: Idle, clock: t, trouble: Unreachable }, out: List() }
    | AuthFailed(f) =>
      { state: { ...s, step: QrPending, work: Idle, clock: t, trouble: Unreachable }, out: List() }
  }

pure def canBackToPhone(s: Auth): bool =
  (s.step == CodePending or s.step == QrPending or s.step == QrScanned or s.step == TwoFactorRequired) and s.work == Idle

pure def backToPhone(s: Auth): Auth = { ...s, step: PhoneEntry, trouble: Fine }
```

### Remote revocation and explicit sign-out wipe local data, advance the credential revision and stop sync

```quint
pure def canRevoked(s: Auth): bool = s.step == Authenticated and s.work == Idle

pure def revoked(s: Auth): Moved =
  val rev = s.credentialRev + 1
  {
    state: { ...s, step: SessionExpired, work: Idle, account: 0, credentialRev: rev, trouble: SessionRevoked },
    out: List(WipeLocal({ credentialRev: rev }), StopSync),
  }

pure def canSignOut(s: Auth): bool = s.step == Authenticated and s.work == Idle

pure def signOut(s: Auth): Moved =
  val ticket = s.ticket + 1
  val rev = s.credentialRev + 1
  {
    state: { ...s, step: SignedOut, work: LoggingOut, ticket: ticket, account: 0, credentialRev: rev, trouble: Fine },
    out: List(LogOutRemote({ ticket: ticket, account: s.account }), WipeLocal({ credentialRev: rev }), StopSync),
  }

pure def canLoggedOut(s: Auth, ticket: int): bool = s.work == LoggingOut and ticket == s.ticket

pure def loggedOut(s: Auth, ticket: int): Auth = { ...s, work: Idle }
```

### A restart drops in-flight authentication work and restores only a previously authenticated user account

```quint
pure def restart(s: Auth): Auth =
  if (s.step == Authenticated) { ...s, work: Idle, trouble: Fine }
  else { ...s, step: SignedOut, work: Idle, account: 0, trouble: Fine }
```

### Bot tokens are never authenticated, an authenticated session always names a user account and positive credential revision, and FloodWait blocks submits

```quint
pure def alwaysUserAccountOnly(s: Auth): bool =
  s.kind == UserAccount and s.account >= 0 and s.credentialRev >= 0 and s.ticket >= 0
    and (s.step == Authenticated implies (s.account > 0 and s.credentialRev > 0 and s.work == Idle))
    and (s.step != Authenticated implies s.account == 0)

pure def alwaysWorkFitsStep(s: Auth): bool = and {
  s.work == SendingCode implies s.step == PhoneEntry,
  s.work == VerifyingCode implies s.step == CodePending,
  s.work == CheckingPassword implies s.step == TwoFactorRequired,
  s.work == PollingQr implies (s.step == QrPending or s.step == QrScanned),
  s.work == LoggingOut implies s.step == SignedOut,
}

pure def stepSignOutAndRevokeWipeLocalAndStopSync(before: Auth, via: str, after: Auth, out: List[Effect]): bool =
  (via == "signOut" or via == "revoked") implies (
    after.step != Authenticated and after.account == 0 and after.credentialRev == before.credentialRev + 1
      and out.includes(WipeLocal({ credentialRev: after.credentialRev })) and out.includes(StopSync)
  )

pure def stepTicketsAndRevisionsNeverGoBack(before: Auth, via: str, after: Auth): bool =
  after.ticket >= before.ticket and after.credentialRev >= before.credentialRev and after.clock >= before.clock

pure def lawFloodWaitBlocksSubmit(now: int, phone: str): bool =
  val waiting = { ...initial, step: PhoneEntry, floodUntil: now + 10, clock: now }
  not(canSendCode(waiting, phone, now, true)) and not(canStartQr(waiting, now, true))
```

### Every in-flight auth request ends

```quint
pure def leadsToAuthWorkEnds(s: Auth, later: Auth): bool =
  s.work != Idle implies later.work == Idle

pure val fair_codeSent = "weak"
pure val fair_codeVerified = "weak"
pure val fair_passwordChecked = "weak"
pure val fair_qrAnswered = "weak"
pure val fair_loggedOut = "weak"
```

### The owner can authenticate by phone, by two-factor password or by QR, hit FloodWait, be revoked, and sign out

```quint
pure def sometimesAuthenticated(s: Auth): bool = s.step == Authenticated
pure def sometimesTwoFactorAsked(s: Auth): bool = s.step == TwoFactorRequired
pure def sometimesQrScanned(s: Auth): bool = s.step == QrScanned
pure def sometimesFloodWaited(s: Auth): bool = s.trouble == FloodWait
pure def sometimesRevoked(s: Auth): bool = s.step == SessionExpired and s.trouble == SessionRevoked
pure def sometimesBotTokenRejected(s: Auth): bool = s.trouble == BotTokenRejected
```
