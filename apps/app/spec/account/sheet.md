# Account sheet

The one Account presentation, from Settings and from startup alike: the signed-in account, its
membership and credits read from Cloud (P-59), the plan, the Google connection, the delegation and
the AI provider. Sign-out is reviewed for the account it names. A plan that needs attention is a
Home notice; the key's expiry is shown only in Account.

## Story: Look after my account in one place

> As the owner, I open Account to see my membership, plan, credits and connections, switch between
> Cloud and my own keys, and sign out of exactly the account I reviewed.

### The sheet shows one section at a time, and Android Home closes it

```quint
type Section = AccountSection | ProviderSection | FundsSection | PlansSection | GoogleSection | DelegationSection
type Mode = CloudMode | DirectMode
type SheetEffect = SignOut({ signingOut: int })
type Sheet = {
  owner: int, open: bool, section: Section, reviewOwner: int, mode: Mode, confirmed: int,
  covered: bool, planRequired: bool, planDismissed: bool, keyExpiring: bool, expiryShown: bool, codeEntry: bool
}
type SheetStep = { state: Sheet, out: List[SheetEffect] }
pure val initial: Sheet = {
  owner: 0, open: false, section: AccountSection, reviewOwner: 0, mode: CloudMode, confirmed: 0,
  covered: false, planRequired: false, planDismissed: false, keyExpiring: false, expiryShown: false, codeEntry: false
}
pure def canShowSheet(s: Sheet): bool = not(s.open)
pure def showSheet(s: Sheet): Sheet = { ...s, open: true, section: AccountSection, reviewOwner: 0, covered: true, expiryShown: s.keyExpiring }
pure def canOpenSection(s: Sheet, section: Section, fundsOffered: bool): bool =
  s.open and s.reviewOwner == 0 and section != AccountSection and (section != FundsSection or fundsOffered) and (section == ProviderSection or s.owner != 0)
pure def openSection(s: Sheet, section: Section, fundsOffered: bool): Sheet = { ...s, section: section }
pure def canBack(s: Sheet): bool = s.open and (s.section != AccountSection or s.reviewOwner != 0)
pure def back(s: Sheet): Sheet = { ...s, section: AccountSection, reviewOwner: 0 }
pure def canCloseSheet(s: Sheet): bool = s.open
pure def closeSheet(s: Sheet): Sheet = { ...s, open: false, section: AccountSection, reviewOwner: 0, covered: false, expiryShown: false, codeEntry: false }
pure def canReturnHome(s: Sheet): bool = s.open or s.covered
pure def returnHome(s: Sheet): Sheet = { ...s, open: false, section: AccountSection, reviewOwner: 0, covered: false, expiryShown: false, codeEntry: false }
pure def canSwitchMode(s: Sheet, mode: Mode): bool = mode != s.mode
pure def switchMode(s: Sheet, mode: Mode): Sheet = { ...s, mode: mode }
pure def alwaysOneSectionWhileOpen(s: Sheet): bool = not(s.open) implies (s.section == AccountSection and s.reviewOwner == 0)
pure def sometimesDirectProviderReachable(s: Sheet): bool = s.mode == DirectMode and s.section == ProviderSection
```

### Sign-out is confirmed only for the account that was reviewed, and closing keeps everything

Asking to sign out shows what stays on the phone. Another account replacing the reviewed one
ends the review; dismissing the sheet removes nothing. Switching between Cloud and own keys keeps
every saved key.

```quint
pure val ownerValues = Set(0, 1, 2)
pure def canAskSignOut(s: Sheet): bool = s.open and s.section == AccountSection and s.owner != 0 and s.reviewOwner == 0
pure def askSignOut(s: Sheet): Sheet = { ...s, reviewOwner: s.owner }
pure def canCancelSignOut(s: Sheet): bool = s.reviewOwner != 0
pure def cancelSignOut(s: Sheet): Sheet = { ...s, reviewOwner: 0 }
pure def canConfirmSignOut(s: Sheet): bool = s.open and s.reviewOwner != 0 and s.reviewOwner == s.owner
pure def confirmSignOut(s: Sheet): SheetStep =
  { state: { ...s, reviewOwner: 0, confirmed: s.confirmed + 1 }, out: List(SignOut({ signingOut: s.reviewOwner })) }
pure def canOwnerChanged(s: Sheet, owner: int): bool = owner != s.owner and owner >= 0
pure def ownerChanged(s: Sheet, owner: int): Sheet =
  { ...s, owner: owner, reviewOwner: 0, section: if (s.section == ProviderSection) s.section else AccountSection,
    planDismissed: false, planRequired: false, keyExpiring: false, expiryShown: false, codeEntry: false }
pure def signsOutReviewed(e: SheetEffect, before: Sheet): bool = match e { | SignOut(x) => x.signingOut == before.reviewOwner and x.signingOut == before.owner and x.signingOut != 0 }
pure def stepSignOutOnlyForTheReviewedAccount(before: Sheet, via: str, after: Sheet, out: List[SheetEffect]): bool =
  out.every(e => signsOutReviewed(e, before))
pure def stepNothingLeavesWithoutConfirmation(before: Sheet, via: str, after: Sheet, out: List[SheetEffect]): bool =
  out.length() > 0 implies via == "confirmSignOut"
pure def alwaysAReviewBelongsToTheShownAccount(s: Sheet): bool = s.reviewOwner != 0 implies (s.open and s.reviewOwner == s.owner)
pure def sometimesSignedOutAfterReview(s: Sheet): bool = s.confirmed >= 1 and s.mode == DirectMode
```

### A membership code entry opens on request and closes with the sheet

```quint
pure def canToggleCode(s: Sheet): bool = s.open and s.section == AccountSection and s.owner != 0
pure def toggleCode(s: Sheet): Sheet = { ...s, codeEntry: not(s.codeEntry) }
pure def alwaysTheCodeEntryNeedsTheSheet(s: Sheet): bool = s.codeEntry implies (s.open and s.owner != 0)
```

## Story: Notice what needs my attention

> As the owner, I see on Home when my plan needs attention, dismiss it once, and see my key's
> expiry only where I can renew it.

### The plan notice shows on Home only, until dismissed, and never under a covering screen

```quint
pure def planNoticeShown(s: Sheet): bool = s.planRequired and not(s.planDismissed) and not(s.open) and not(s.covered)
pure def canPlanNeeded(s: Sheet, needed: bool): bool = s.owner != 0 and needed != s.planRequired
pure def planNeeded(s: Sheet, needed: bool): Sheet = { ...s, planRequired: needed, planDismissed: if (needed) s.planDismissed else false }
pure def canDismissPlan(s: Sheet): bool = planNoticeShown(s)
pure def dismissPlan(s: Sheet): Sheet = { ...s, planDismissed: true }
pure def canCoverScreen(s: Sheet): bool = not(s.covered)
pure def coverScreen(s: Sheet): Sheet = { ...s, covered: true }
pure def canUncover(s: Sheet): bool = s.covered and not(s.open)
pure def uncover(s: Sheet): Sheet = { ...s, covered: false }
pure def alwaysADismissalIsExact(s: Sheet): bool = s.planDismissed implies s.planRequired
pure def alwaysACoveredHomeShowsNoNotice(s: Sheet): bool = (s.covered or s.open) implies not(planNoticeShown(s))
pure def sometimesPlanNoticeShown(s: Sheet): bool = planNoticeShown(s)
pure def sometimesPlanNoticeDismissed(s: Sheet): bool = s.planDismissed and not(s.open)
```

### The key's expiry is shown exactly while Account is open

```quint
pure def canKeyExpiry(s: Sheet, expiring: bool): bool = s.owner != 0 and expiring != s.keyExpiring
pure def keyExpiry(s: Sheet, expiring: bool): Sheet = { ...s, keyExpiring: expiring, expiryShown: s.open and expiring }
pure def alwaysAccountOwnsTheExpiry(s: Sheet): bool = s.expiryShown == (s.open and s.keyExpiring)
pure def sometimesExpiryShown(s: Sheet): bool = s.expiryShown
```
