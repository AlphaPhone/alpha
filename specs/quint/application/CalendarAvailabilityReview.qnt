/// One reviewed foreground free/busy check (calendar_availability): the owner chooses calendars, only
/// those are read, the owner confirms the exact result, and the same read is repeated before sharing.
/// Any failure, cancellation or retired context shares nothing, and an unknown read is never free.
module CalendarAvailabilityReview {
  /// SOURCE_LIST_ATTEMPTS in plugin-calendar/src/client/availability-review.ts.
  pure val MaxListAttempts = 4
  /// Read results: "free" and "busy" are answers; every other result is a refusal.
  pure val Answers = Set("free", "busy")
  pure val ReadResults = Set("free", "busy", "stale", "changed", "zone", "tooMany", "error")
  type State = {phase:str, attempts:int, chosen:bool, reads:int, reviewed:str, latest:str,
    confirmed:bool, outcome:str, shared:str, retired:bool}
  var s: State
  action init = s' = {phase:"start", attempts:0, chosen:false, reads:0, reviewed:"none", latest:"none",
    confirmed:false, outcome:"none", shared:"none", retired:false}
  val live = s.phase != "done" and not(s.retired)
  action refuse = s' = {...s, phase:"done", outcome:"failed"}
  /// Context, device and request time zones agree before anything is read.
  action zoneCheck(same:bool):bool = all {live, s.phase == "start",
    if (same) s' = {...s, phase:"permission"} else refuse}
  action permission(granted:bool):bool = all {live, s.phase == "permission",
    if (granted) s' = {...s, phase:"listing"} else refuse}
  /// An unavailable source list is asked for again a bounded number of times; nothing is read.
  action list(status:str):bool = all {live, s.phase == "listing",
    status.in(Set("ready", "unavailable", "denied", "zone", "empty")),
    if (status == "ready") s' = {...s, phase:"choosing", attempts:s.attempts + 1}
    else if (status == "unavailable" and s.attempts + 1 < MaxListAttempts) s' = {...s, attempts:s.attempts + 1}
    else s' = {...s, phase:"done", outcome:"failed", attempts:s.attempts + 1}}
  action choose(picked:bool):bool = all {live, s.phase == "choosing",
    if (picked) s' = {...s, phase:"reading", chosen:true} else refuse}
  action read(result:str):bool = all {live, s.phase == "reading", result.in(ReadResults),
    if (result.in(Answers)) s' = {...s, phase:"confirming", reads:s.reads + 1, reviewed:result}
    else s' = {...s, phase:"done", outcome:"failed", reads:s.reads + 1}}
  action confirm(yes:bool):bool = all {live, s.phase == "confirming",
    if (yes) s' = {...s, phase:"rereading", confirmed:true} else refuse}
  /// The shared answer is the one the owner saw: a different second read is reviewed again.
  action reread(result:str):bool = all {live, s.phase == "rereading", result.in(ReadResults),
    if (result == s.reviewed) s' = {...s, phase:"done", outcome:"succeeded", reads:s.reads + 1, latest:result, shared:result}
    else s' = {...s, phase:"done", outcome:"failed", reads:s.reads + 1, latest:result}}
  /// The session, screen or device context changed, or the signal aborted.
  action retire = all {s.phase != "done", not(s.retired), s' = {...s, retired:true}}
  action interrupted = all {s.phase != "done", s.retired, refuse}
  action readAny = {
    nondet result = ReadResults.oneOf()
    read(result)
  }
  action rereadAny = {
    nondet result = ReadResults.oneOf()
    reread(result)
  }
  action step = any {
    zoneCheck(true), zoneCheck(false), permission(true), permission(false),
    list("ready"), list("unavailable"), list("denied"), list("zone"), list("empty"),
    choose(true), choose(false), readAny, confirm(true), confirm(false), rereadAny, retire, interrupted, s' = s}

  val SharedIsReviewedAnswer = s.shared != "none" implies
    (s.shared.in(Answers) and s.confirmed and s.shared == s.reviewed and s.latest == s.reviewed and s.reads == 2)
  val FailureSharesNothing = s.outcome != "succeeded" implies s.shared == "none"
  val ReadsOnlyChosenCalendars = s.reads > 0 implies s.chosen
  val BoundedSourceList = s.attempts <= MaxListAttempts
  val RetiredNeverShares = s.retired implies s.shared == "none"
  val safety = SharedIsReviewedAnswer and FailureSharesNothing and ReadsOnlyChosenCalendars and
    BoundedSourceList and RetiredNeverShares

  run freeShareTest = init.then(zoneCheck(true)).then(permission(true)).then(list("ready")).then(choose(true)).then(read("free")).then(confirm(true)).then(reread("free"))
    .expect(safety and s.outcome == "succeeded" and s.shared == "free" and s.reads == 2)
  run busyShareTest = init.then(zoneCheck(true)).then(permission(true)).then(list("ready")).then(choose(true)).then(read("busy")).then(confirm(true)).then(reread("busy"))
    .expect(safety and s.shared == "busy")
  run zoneChangedTest = init.then(zoneCheck(false)).expect(safety and s.outcome == "failed" and s.reads == 0)
  run deniedTest = init.then(zoneCheck(true)).then(permission(false)).expect(safety and s.outcome == "failed" and s.reads == 0)
  run listRetryTest = init.then(zoneCheck(true)).then(permission(true)).then(list("unavailable")).then(list("unavailable"))
    .then(list("ready")).expect(safety and s.phase == "choosing" and s.attempts == 3)
  run listExhaustedTest = init.then(zoneCheck(true)).then(permission(true)).then(list("unavailable")).then(list("unavailable"))
    .then(list("unavailable")).then(list("unavailable")).expect(safety and s.outcome == "failed" and s.attempts == MaxListAttempts and s.reads == 0)
  run noCalendarsTest = init.then(zoneCheck(true)).then(permission(true)).then(list("empty")).expect(safety and s.outcome == "failed")
  run cancelChoiceTest = init.then(zoneCheck(true)).then(permission(true)).then(list("ready")).then(choose(false)).expect(safety and s.outcome == "failed" and s.reads == 0)
  run unknownIsNotFreeTest = init.then(zoneCheck(true)).then(permission(true)).then(list("ready")).then(choose(true)).then(read("stale")).expect(safety and s.outcome == "failed" and s.shared == "none")
  run declineResultTest = init.then(zoneCheck(true)).then(permission(true)).then(list("ready")).then(choose(true)).then(read("free")).then(confirm(false)).expect(safety and s.shared == "none" and s.reads == 1)
  run changedDuringReviewTest = init.then(zoneCheck(true)).then(permission(true)).then(list("ready")).then(choose(true)).then(read("free")).then(confirm(true)).then(reread("busy"))
    .expect(safety and s.outcome == "failed" and s.shared == "none")
  run changedCalendarRefusedTest = init.then(zoneCheck(true)).then(permission(true)).then(list("ready")).then(choose(true)).then(read("free")).then(confirm(true)).then(reread("changed"))
    .expect(safety and s.outcome == "failed" and s.shared == "none")
  run retiredDuringReviewTest = init.then(zoneCheck(true)).then(permission(true)).then(list("ready")).then(choose(true)).then(read("free")).then(retire).then(interrupted)
    .expect(safety and s.outcome == "failed" and s.shared == "none")
}
