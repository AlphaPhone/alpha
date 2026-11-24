module SystemPickerVisibility {
  type State = {
    pickers: int, started: int, ended: int, hidden: bool, hiddenUnderPicker: bool,
    review: bool, document: bool, searchable: bool, correction: bool, capture: bool,
    generation: int, live: int, pending: Set[int], retired: Set[int], delivered: Set[int]
  }
  var s: State
  action init = s' = {
    pickers: 0, started: 0, ended: 0, hidden: false, hiddenUnderPicker: false,
    review: false, document: false, searchable: false, correction: false, capture: false,
    generation: 0, live: 0, pending: Set(), retired: Set(), delivered: Set()
  }
  action openReview = all { not(s.hidden), not(s.review), s' = { ...s, review: true } }
  action openDocument = all { not(s.hidden), not(s.document), s' = { ...s, document: true } }
  action openSearchable = all { not(s.hidden), s.document, not(s.searchable or s.correction or s.capture),
    s' = { ...s, searchable: true } }
  action openCorrection = all { not(s.hidden), s.document, not(s.searchable or s.correction or s.capture),
    s' = { ...s, correction: true } }
  action openCapture = all { not(s.hidden), s.document, not(s.searchable or s.correction or s.capture),
    s' = { ...s, capture: true } }
  action pickerStart = all { not(s.hidden), s.review or s.document or s.searchable, s.started < 3,
    s' = { ...s, pickers: s.pickers + 1, started: s.started + 1 } }
  action pickerEnd = all { s.started > s.ended, s' = { ...s, pickers: s.pickers - 1, ended: s.ended + 1 } }
  action hideEvent = all { not(s.hidden),
    val keep = s.pickers > 0
    s' = { ...s, hidden: true, hiddenUnderPicker: keep, review: s.review and keep,
      document: s.document and keep, searchable: s.searchable and keep and s.document,
      correction: false, capture: false } }
  action showEvent = all { s.hidden, s' = { ...s, hidden: false, hiddenUnderPicker: false } }
  action pageHide = s' = { ...s, review: false, document: false, searchable: false, correction: false,
    capture: false, live: 0, retired: if (s.live != 0) s.retired.union(Set(s.live)) else s.retired }
  action closeDialog(name: str): bool = all { Set("review", "document", "searchable").contains(name),
    val document = s.document and name == "searchable"
    s' = { ...s, review: s.review and name != "review", document: document,
      searchable: false, correction: s.correction and document, capture: s.capture and document } }
  action filePickerStart = all { not(s.hidden), s.generation < 3,
    s' = { ...s, generation: s.generation + 1, live: s.generation + 1,
      pending: s.pending.union(Set(s.generation + 1)),
      retired: if (s.live != 0) s.retired.union(Set(s.live)) else s.retired } }
  action filePickerCancel = all { s.live != 0,
    s' = { ...s, live: 0, retired: s.retired.union(Set(s.live)) } }
  action filePickerResult(id: int): bool = all { s.pending.contains(id),
    s' = { ...s, pending: s.pending.exclude(Set(id)),
      delivered: if (id == s.live) s.delivered.union(Set(id)) else s.delivered,
      live: if (id == s.live) 0 else s.live } }
  action step = {
    nondet name = Set("review", "document", "searchable").oneOf()
    nondet id = 1.to(3).oneOf()
    any { openReview, openDocument, openSearchable, openCorrection, openCapture, pickerStart, pickerEnd,
      hideEvent, showEvent, pageHide, closeDialog(name), filePickerStart, filePickerCancel,
      filePickerResult(id), s' = s }
  }
  val CounterBalanced = s.pickers == s.started - s.ended and s.pickers >= 0
  val UnexemptDialogsCloseWhenHidden = s.hidden implies not(s.correction) and not(s.capture)
  val HiddenDialogStartedUnderPicker = (s.hidden and (s.review or s.document or s.searchable)) implies s.hiddenUnderPicker
  val NestedDialogsNeedDocument = (s.searchable or s.correction or s.capture) implies s.document
  val RetiredPickerNeverDelivers = s.delivered.intersect(s.retired) == Set()
  val OneFilePickerConsumer = s.live == 0 or (s.live == s.generation and not(s.retired.contains(s.live)))
  val safety = CounterBalanced and UnexemptDialogsCloseWhenHidden and HiddenDialogStartedUnderPicker
    and NestedDialogsNeedDocument and RetiredPickerNeverDelivers and OneFilePickerConsumer
  val DialogKeptUnderPickerWitness = s.hidden and s.document and s.pickers > 0
  val DialogHiddenAfterPickerEndedWitness = s.hidden and s.document and s.pickers == 0
  val LateResultDroppedWitness = s.retired.exists(id => not(s.pending.contains(id))) and s.delivered == Set()
  val TwoPickersWitness = s.pickers == 2
  run exportPickerKeepsDialogsTest = init.then(openReview).then(openDocument).then(pickerStart).then(hideEvent)
    .expect(s.review and s.document and s.hidden and safety).then(showEvent).then(pickerEnd)
    .expect(s.pickers == 0 and s.document and safety).then(hideEvent)
    .expect(not(s.review) and not(s.document) and safety)
  run correctionAlwaysClosesTest = init.then(openDocument).then(pickerStart).then(openCorrection).then(hideEvent)
    .expect(s.document and not(s.correction) and safety)
  run captureAlwaysClosesTest = init.then(openDocument).then(pickerStart).then(openCapture).then(hideEvent)
    .expect(s.document and not(s.capture) and safety)
  run searchablePickerSettlementAndHideTest = init.then(openReview).then(openDocument).then(openSearchable)
    .then(pickerStart).then(hideEvent).then(pickerEnd)
    .expect(s.hidden and s.review and s.document and s.searchable and s.pickers == 0 and safety)
    .then(showEvent).then(hideEvent).expect(not(s.review or s.document or s.searchable) and safety)
  run pageHideClosesExemptDialogsUnderPickerTest = init.then(openReview).then(openDocument).then(openSearchable)
    .then(pickerStart).then(hideEvent).then(pageHide)
    .expect(s.pickers == 1 and not(s.review or s.document or s.searchable) and safety)
  run realBackgroundUnderPickerTest = init.then(openDocument).then(pickerStart).then(hideEvent).then(pickerEnd)
    .expect(s.document and s.hidden and s.pickers == 0 and safety).then(pageHide)
    .expect(not(s.document) and safety)
  run lateFilePickerResultTest = init.then(filePickerStart).then(filePickerStart).then(filePickerResult(1))
    .expect(s.delivered == Set() and s.live == 2 and safety).then(filePickerResult(2))
    .expect(s.delivered == Set(2) and s.live == 0 and safety)
  run closedReviewClosesNestedDialogsTest = init.then(openReview).then(openDocument).then(openCorrection)
    .then(closeDialog("review")).expect(not(s.review) and not(s.document) and not(s.correction) and safety)
  run cancelledFilePickerTest = init.then(filePickerStart).then(filePickerCancel).then(filePickerResult(1))
    .expect(s.delivered == Set() and safety)
}
