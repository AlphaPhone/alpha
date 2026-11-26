# Collection

Settings controls for Android's local notification mirror: which apps Alpha
may collect from, which may show previews, and whether to keep a short
text-free history. Every sensitive change takes an exact review on the
current policy revision using the kit's [review](../../kit/review.md).

## Story: Manage collection in Settings

> As the owner, I want to choose which apps Alpha may collect from and
> which may show previews, and decide whether to keep a short history
> without notification text.

### A Settings visit holds the native policy revision, app choices and text-free history

These are what Android reported for the current owner, not permission
Alpha can grant itself. Android alone grants listener access, verifies
the current signer for each chosen app and stores the policy. History in
Settings has only the app, event, and time, with at most 100 events from
the last 24 hours. It is not shared with Ask Alpha.

```quint
import review as V from "../../kit/review"

type Actor = Owner | Agent | Phone
type Act = ReadPolicy | ApplyPolicy | ReadPolicyApps | ReadPolicyHistory
type Effect = { act: Act, ticket: int }
type PolicyApp = { packageName: str, label: str, available: bool, preview: bool }
type PolicyChoice = { packageName: str, label: str }
type PolicyHistoryRow = { id: str, appLabel: str, at: int, word: str }
type PolicyReport = { revision: str, enabled: bool, paused: bool, access: bool, connected: bool,
  history: bool, historyUnavailable: bool, apps: List[PolicyApp] }
type PolicyCommand = NoPolicyChange | EnableCollection | DisableCollection | ResumeCollection | AddApp | RemoveApp | EnablePreview | DisablePreview | EnableHistory | DisableHistory | ClearPolicyHistory
type PolicySelection = { command: PolicyCommand, packageName: str }
type PolicyPhase = PolicyAway | PolicyReading | PolicyReady | PolicyApplying | PolicyChoosing | PolicyHistoryReading | PolicyUnavailable
type PolicyPanel = {
  here: bool, serial: int, phase: PolicyPhase, report: PolicyReport,
  review: V::Review, selection: PolicySelection, choices: List[PolicyChoice],
  history: List[PolicyHistoryRow], choosing: bool, viewing: bool, failed: bool,
}
type Collection = { panel: PolicyPanel }
type Listed = { state: Collection, out: List[Effect] }

pure val noPolicy: PolicyReport = { revision: "", enabled: false, paused: false, access: false, connected: false,
  history: false, historyUnavailable: false, apps: List() }
pure val noSelection: PolicySelection = { command: NoPolicyChange, packageName: "" }
pure val initialPanel: PolicyPanel = { here: false, serial: 0, phase: PolicyAway, report: noPolicy, review: V::unreviewed,
  selection: noSelection, choices: List(), history: List(), choosing: false, viewing: false, failed: false }
pure val initial: Collection = { panel: initialPanel }

pure val ticketValues = Set(1, 2, 3, 4)

pure def policyRequest(phase: PolicyPhase, act: Act, c: Collection): Listed =
  val serial = c.panel.serial + 1
  { state: { ...c, panel: { ...c.panel, serial: serial, phase: phase, failed: false } },
    out: List({ act: act, ticket: serial }) }

pure def policyReady(c: Collection): bool =
  c.panel.here and c.panel.phase == PolicyReady and c.panel.report.revision != ""
```

### Opening Settings reads the current policy and leaving retires every review and read

Alpha retires a visit when it is covered, leaves the foreground or changes
owner. A return reads a fresh policy. Neither an old read nor an unknown
outcome is displayed as a policy change.

```quint
pure def canPolicyVisit(c: Collection, here: bool, by: Actor): bool = by == Phone and here != c.panel.here

pure def policyVisit(c: Collection, here: bool, by: Actor): Listed =
  val panel = { ...initialPanel, here: here, serial: c.panel.serial }
  if (here) policyRequest(PolicyReading, ReadPolicy, { ...c, panel: panel })
  else { state: { ...c, panel: panel }, out: List() }

pure def canPolicyReported(c: Collection, ticket: int, report: PolicyReport, failed: bool, by: Actor): bool =
  by == Phone and c.panel.here and ticket == c.panel.serial and (c.panel.phase == PolicyReading or c.panel.phase == PolicyApplying)

pure def policyReported(c: Collection, ticket: int, report: PolicyReport, failed: bool, by: Actor): Collection =
  { ...c, panel: { ...c.panel, phase: if (report.revision == "") PolicyUnavailable else PolicyReady,
    report: report, review: V::dismiss(V::revise(c.panel.review)), selection: noSelection, failed: failed,
    choices: List(), history: List(), choosing: false, viewing: false } }

pure def canPolicyRefresh(c: Collection, by: Actor): bool =
  by == Owner and (policyReady(c) or (c.panel.here and c.panel.phase == PolicyUnavailable))

pure def policyRefresh(c: Collection, by: Actor): Listed = policyRequest(PolicyReading, ReadPolicy,
  { ...c, panel: { ...c.panel, review: V::dismiss(V::revise(c.panel.review)), selection: noSelection } })

pure val samplePolicy: PolicyReport = { ...noPolicy, revision: "first" }
pure val reportValues = Set(noPolicy, samplePolicy, { ...samplePolicy, enabled: true, paused: true, access: true },
  { ...samplePolicy, enabled: true, history: true, apps: List({ packageName: "test.app", label: "Test app", available: true, preview: false }) })
pure val packageNameValues = Set("", "test.app")
```

### Enabling collection, resuming, enabling previews, keeping history and clearing it take an exact review

Selecting an app starts with previews off. Turning a setting off, or removing an
app, applies only to the same policy revision. A signature change prevents
previewing that app. Clearing history uses the same owner and revision as
the review.

```quint
pure def needsPolicyReview(command: PolicyCommand): bool =
  command == EnableCollection or command == ResumeCollection or command == EnablePreview
  or command == EnableHistory or command == ClearPolicyHistory

pure def policyAllows(command: PolicyCommand, packageName: str, c: Collection): bool =
  val p = c.panel.report
  val selected = p.apps.some(a => a.packageName == packageName)
  match command {
    | NoPolicyChange => false
    | EnableCollection => not(p.enabled)
    | DisableCollection => p.enabled
    | ResumeCollection => p.enabled and p.paused
    | AddApp => not(selected) and c.panel.choosing and c.panel.choices.some(a => a.packageName == packageName)
    | RemoveApp => selected
    | EnablePreview => p.enabled and p.apps.some(a => a.packageName == packageName and a.available and not(a.preview))
    | DisablePreview => p.apps.some(a => a.packageName == packageName and a.preview)
    | EnableHistory => p.enabled and not(p.history)
    | DisableHistory => p.history
    | ClearPolicyHistory => p.history or p.historyUnavailable
  }

pure def canPolicyChoose(c: Collection, command: PolicyCommand, packageName: str, by: Actor): bool =
  by == Owner and policyReady(c) and policyAllows(command, packageName, c) and not(c.panel.review.showing)

pure def policyChoose(c: Collection, command: PolicyCommand, packageName: str, by: Actor): Listed =
  val panel = { ...c.panel, selection: { command: command, packageName: packageName } }
  if (needsPolicyReview(command)) { state: { ...c, panel: { ...panel, review: V::present(panel.review) } }, out: List() }
  else policyRequest(PolicyApplying, ApplyPolicy, { ...c, panel: panel })

pure def canPolicyCancel(c: Collection, by: Actor): bool = by == Owner and c.panel.review.showing

pure def policyCancel(c: Collection, by: Actor): Collection =
  { ...c, panel: { ...c.panel, review: V::dismiss(c.panel.review), selection: noSelection } }

pure def canPolicyConfirm(c: Collection, by: Actor): bool =
  by == Owner and policyReady(c) and V::canConfirm(c.panel.review)
    and policyAllows(c.panel.selection.command, c.panel.selection.packageName, c)

pure def policyConfirm(c: Collection, by: Actor): Listed = policyRequest(PolicyApplying, ApplyPolicy,
  { ...c, panel: { ...c.panel, review: V::confirm(c.panel.review) } })
```

### Policy choices and history come from Android, only during this visit

```quint
pure def canPolicyFindApps(c: Collection, by: Actor): bool = by == Owner and policyReady(c) and not(c.panel.review.showing)

pure def policyFindApps(c: Collection, by: Actor): Listed =
  if (c.panel.choosing) { state: { ...c, panel: { ...c.panel, choosing: false, choices: List() } }, out: List() }
  else policyRequest(PolicyChoosing, ReadPolicyApps, c)

pure def canPolicyApps(c: Collection, ticket: int, choices: List[PolicyChoice], failed: bool, by: Actor): bool =
  by == Phone and c.panel.here and c.panel.phase == PolicyChoosing and ticket == c.panel.serial

pure def policyApps(c: Collection, ticket: int, choices: List[PolicyChoice], failed: bool, by: Actor): Collection =
  { ...c, panel: { ...c.panel, phase: PolicyReady, choices: choices, choosing: not(failed), failed: failed } }

pure def canPolicyReadHistory(c: Collection, by: Actor): bool =
  by == Owner and policyReady(c) and c.panel.report.history and not(c.panel.review.showing)

pure def policyReadHistory(c: Collection, by: Actor): Listed = policyRequest(PolicyHistoryReading, ReadPolicyHistory, c)

pure def canPolicyHistory(c: Collection, ticket: int, history: List[PolicyHistoryRow], failed: bool, by: Actor): bool =
  by == Phone and c.panel.here and c.panel.phase == PolicyHistoryReading and ticket == c.panel.serial

pure def policyHistory(c: Collection, ticket: int, history: List[PolicyHistoryRow], failed: bool, by: Actor): Collection =
  { ...c, panel: { ...c.panel, phase: PolicyReady, viewing: not(failed), history: history, failed: failed } }

pure val choicesValues = Set(List(), List({ packageName: "test.app", label: "Test app" }))
pure val historyValues = Set(List(), List({ id: "entry", appLabel: "Test app", at: 50, word: "arrived" }))
```

### A retired collection visit keeps neither a policy, a review nor any rows

```quint
pure def alwaysRetiredPolicyIsEmpty(c: Collection): bool =
  c.panel.here or (c.panel.report.revision == "" and not(c.panel.review.showing)
    and c.panel.choices.length() == 0 and c.panel.history.length() == 0)

pure def stepPolicyNeedsTheShownReview(before: Collection, via: str, after: Collection, out: List[Effect]): bool =
  out.every(requested => requested.act != ApplyPolicy or
    (via == "policyConfirm" and V::canConfirm(before.panel.review) or
      via == "policyChoose" and not(needsPolicyReview(after.panel.selection.command))))

pure def sometimesPolicyReady(c: Collection): bool = policyReady(c)
```
