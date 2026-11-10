/// What the address bar does with typed text: every input is an address to open, a search or
/// a refusal, and an approved destination is opened or refused but never searched.
module AddressInput {
  // The properties of the text that the classifier looks at.
  type Input = {
    text: bool, empty: bool, tooLong: bool, control: bool, whitespace: bool,
    // Begins with http:// or https://, and whether it then parses as a web address with a host
    // and no credentials.
    webPrefix: bool, webValid: bool,
    // Looks like a host, is only digits and dots without being a four-part address, and whether
    // it parses as a web address without credentials once https:// is put in front.
    hostLike: bool, numericWords: bool, hostValid: bool
  }
  type State = { input: Input, approved: bool, kind: str, outcome: str }
  var s: State
  pure val blank: Input = { text: true, empty: true, tooLong: false, control: false, whitespace: false,
    webPrefix: false, webValid: false, hostLike: false, numericWords: false, hostValid: false }
  pure val word: Input = { ...blank, empty: false }
  pure def classify(i: Input): str =
    if (not(i.text) or i.empty or i.tooLong or i.control) "reject"
    else if (i.whitespace) "search"
    else if (i.webPrefix) (if (i.webValid) "url" else "reject")
    else if (i.hostLike and not(i.numericWords) and i.hostValid) "url"
    else "search"
  // A typed refusal shows a message; a refused approved destination fails its request.
  pure def result(kind: str, approved: bool): str =
    if (kind == "reject" or (approved and kind != "url")) (if (approved) "throw" else "toast")
    else if (kind == "url") "open" else "search"
  action init = s' = { input: blank, approved: false, kind: "none", outcome: "none" }
  action submit(i: Input, approved: bool): bool =
    s' = { input: i, approved: approved, kind: classify(i), outcome: result(classify(i), approved) }
  action step = {
    nondet text = Set(false, true).oneOf()
    nondet empty = Set(false, true).oneOf()
    nondet tooLong = Set(false, true).oneOf()
    nondet control = Set(false, true).oneOf()
    nondet whitespace = Set(false, true).oneOf()
    nondet webPrefix = Set(false, true).oneOf()
    nondet webValid = Set(false, true).oneOf()
    nondet hostLike = Set(false, true).oneOf()
    nondet numericWords = Set(false, true).oneOf()
    nondet hostValid = Set(false, true).oneOf()
    nondet approved = Set(false, true).oneOf()
    any {
      submit({ text: text, empty: empty, tooLong: tooLong, control: control, whitespace: whitespace,
        webPrefix: webPrefix, webValid: webValid, hostLike: hostLike, numericWords: numericWords,
        hostValid: hostValid }, approved),
      s' = s
    }
  }
  val wellFormed = s.input.text and not(s.input.empty or s.input.tooLong or s.input.control)
  val ExactlyOneOutcome = s.kind.in(Set("none", "url", "search", "reject")) and
    s.outcome.in(Set("none", "open", "search", "toast", "throw")) and
    (s.outcome == "open" iff (s.kind == "url")) and (s.outcome == "search" implies s.kind == "search")
  val MalformedRefused = (s.kind != "none" and not(wellFormed)) implies s.kind == "reject"
  val WhitespaceNeverOpens = s.input.whitespace implies s.kind != "url"
  val OpenedIsWebAddress = s.kind == "url" implies (wellFormed and
    ((s.input.webPrefix and s.input.webValid) or
      (not(s.input.webPrefix) and s.input.hostLike and s.input.hostValid and not(s.input.numericWords))))
  val ExplicitAddressNeverSearched =
    (wellFormed and s.input.webPrefix and not(s.input.whitespace)) implies s.kind != "search"
  val WordsWithColonSearch = (s.kind != "none" and wellFormed and not(s.input.webPrefix) and
    not(s.input.hostLike)) implies s.kind == "search"
  val ApprovedNeverSearches = s.approved implies s.outcome.in(Set("open", "throw"))
  val safety = ExactlyOneOutcome and MalformedRefused and WhitespaceNeverOpens and OpenedIsWebAddress and
    ExplicitAddressNeverSearched and WordsWithColonSearch and ApprovedNeverSearches
  val SchemeLikeWordSearchedWitness = s.outcome == "search" and not(s.input.whitespace) and not(s.input.hostLike)
  val HostWithCredentialsSearchedWitness = s.outcome == "search" and s.input.hostLike and
    not(s.input.hostValid) and not(s.input.numericWords) and not(s.input.whitespace)
  val ExplicitAddressRefusedWitness = s.outcome == "toast" and wellFormed and s.input.webPrefix
  val ApprovedRefusedWitness = s.outcome == "throw" and s.kind == "search"
  // "site:example.com cats", "define:x", "user@example.com" and "3.14" are searches.
  run colonQueriesSearchTest = init.then(submit({ ...word, whitespace: true }, false))
    .expect(s.outcome == "search")
    .then(submit(word, false)).expect(s.outcome == "search")
    .then(submit({ ...word, hostLike: true, hostValid: false }, false)).expect(s.outcome == "search")
    .then(submit({ ...word, hostLike: true, hostValid: true, numericWords: true }, false))
    .expect(s.outcome == "search" and safety)
  run hostOpensTest = init.then(submit({ ...word, hostLike: true, hostValid: true }, false))
    .expect(s.kind == "url" and s.outcome == "open" and safety)
  run explicitAddressTest = init.then(submit({ ...word, webPrefix: true, webValid: true }, false))
    .expect(s.outcome == "open")
    .then(submit({ ...word, webPrefix: true, webValid: false }, false))
    .expect(s.kind == "reject" and s.outcome == "toast" and safety)
  run approvedDestinationTest = init.then(submit({ ...word, webPrefix: true, webValid: true }, true))
    .expect(s.outcome == "open").then(submit(word, true))
    .expect(s.kind == "search" and s.outcome == "throw" and safety)
  run malformedRefusedTest = init.then(submit(blank, false)).expect(s.outcome == "toast")
    .then(submit({ ...word, control: true, webPrefix: true, webValid: true }, false))
    .expect(s.kind == "reject" and safety)
}
