/// A Maps result in a reply that just arrived opens Maps once. A restored or replaced
/// history never opens anything, and only that automatic open may start guidance directly.
module ChatMapsAutoOpen {
  type Request = { id: int, automatic: bool, allowDirectStart: bool }
  type Chat = {
    // The conversation as rendered: message identifiers in order, and which are agent
    // replies carrying a Maps result.
    msgs: List[int], results: Set[int], minted: int,
    // Seen, kept per shell: absent until the first render.
    tracked: bool, seenIds: Set[int], last: int, fresh: Set[int],
    live: bool, assistantSurface: bool,
    // What reached Maps, and where each message came from.
    autoOpens: int -> int, requests: Set[Request], appended: Set[int], restored: Set[int]
  }
  var s: Chat
  pure val MaxMessages = 6
  pure val Ids = 1.to(MaxMessages)
  pure def newest(msgs: List[int]): int = if (msgs.length() == 0) 0 else msgs[msgs.length() - 1]
  pure def members(msgs: List[int]): Set[int] = msgs.indices().map(index => msgs[index])
  /// fresh(): messages appended since the previous render, kept until a later one follows.
  pure def followed(c: Chat): Chat = {
    val ids = members(c.msgs)
    val latest = newest(c.msgs)
    if (not(c.tracked)) { ...c, tracked: true, seenIds: ids, last: latest, fresh: Set() }
    else {
      val continued = c.last != 0 and ids.contains(c.last)
      val added = if (continued) c.fresh.union(ids.exclude(c.seenIds)) else c.fresh
      { ...c, seenIds: c.seenIds.union(ids), last: latest, fresh: added.filter(id => id == latest) }
    }
  }

  action initWith(assistantSurface: bool): bool = s' = {
    msgs: List(), results: Set(), minted: 0,
    tracked: false, seenIds: Set(), last: 0, fresh: Set(),
    live: true, assistantSurface: assistantSurface,
    autoOpens: Ids.mapBy(id => 0), requests: Set(), appended: Set(), restored: Set()
  }
  action init = { nondet surface = Set(false, true).oneOf() initWith(surface) }
  /// A message is added to the open conversation: the user's, or an agent reply with a result.
  action arrive(result: bool): bool = {
    val id = s.minted + 1
    all {
      s.minted < MaxMessages,
      s' = { ...s, msgs: s.msgs.append(id), minted: id, appended: s.appended.union(Set(id)),
        results: if (result) s.results.union(Set(id)) else s.results }
    }
  }
  /// Another conversation, or this one read back from storage: every message carries a result.
  action replaceHistory(count: int): bool = {
    val ids = (s.minted + 1).to(s.minted + count)
    all {
      count.in(1.to(2)), s.minted + count <= MaxMessages,
      s' = { ...s, msgs: if (count == 1) List(s.minted + 1) else List(s.minted + 1, s.minted + 2),
        minted: s.minted + count, results: s.results.union(ids), restored: s.restored.union(ids) }
    }
  }
  action removeNewest = all {
    s.msgs.length() > 0, s' = { ...s, msgs: s.msgs.slice(0, s.msgs.length() - 1) }
  }
  /// The shell is replaced: the new one has seen nothing.
  action remount = s' = { ...s, tracked: false, seenIds: Set(), last: 0, fresh: Set(), live: true }
  action suspend = all { s.live, s' = { ...s, live: false } }
  action resume = all { not(s.live), s' = { ...s, live: true } }
  /// One render. The newest result of a reply that just arrived opens once, outside render.
  action render = {
    val seen = followed(s)
    val latest = newest(s.msgs)
    s' = if (s.results.contains(latest) and seen.fresh.contains(latest) and s.live and not(s.assistantSurface))
        { ...seen, fresh: seen.fresh.exclude(Set(latest)),
          autoOpens: s.autoOpens.setBy(latest, count => count + 1),
          requests: s.requests.union(Set({ id: latest, automatic: true, allowDirectStart: true })) }
      else seen
  }
  /// A card's Show in Maps: any result still on screen, never a direct start.
  action showInMaps(id: int): bool = all {
    members(s.msgs).contains(id), s.results.contains(id), s.live, not(s.assistantSurface),
    s' = { ...s, requests: s.requests.union(Set({ id: id, automatic: false, allowDirectStart: false })) }
  }
  action step = {
    nondet flag = Set(false, true).oneOf()
    nondet count = 1.to(2).oneOf()
    nondet id = Ids.oneOf()
    any {
      arrive(flag), replaceHistory(count), removeNewest, remount, suspend, resume, render,
      showInMaps(id), s' = s
    }
  }

  val opened = Ids.filter(id => s.autoOpens.get(id) > 0)
  val TypeOK = s.minted.in(0.to(MaxMessages)) and s.msgs.length() <= MaxMessages and
    s.last.in(0.to(MaxMessages)) and s.fresh.subseteq(Ids)
  val OpensAtMostOnce = Ids.forall(id => s.autoOpens.get(id) <= 1)
  val RestoredHistoryNeverOpens = opened.intersect(s.restored) == Set()
  val OnlyArrivedRepliesOpen = opened.subseteq(s.appended.intersect(s.results))
  val AssistantSurfaceNeverOpens = s.assistantSurface implies s.requests == Set()
  /// Only the automatic open of a reply that just arrived may start guidance by itself.
  val DirectStartOnlyForArrivedReply = s.requests.forall(request =>
    request.allowDirectStart implies request.automatic and s.appended.contains(request.id))
  val FreshIsNewestSeen = s.fresh.forall(id => id == s.last and s.seenIds.contains(id))
  val UntrackedShellHoldsNothing = not(s.tracked) implies s.fresh == Set() and s.seenIds == Set()
  val safety = TypeOK and OpensAtMostOnce and RestoredHistoryNeverOpens and OnlyArrivedRepliesOpen and
    AssistantSurfaceNeverOpens and DirectStartOnlyForArrivedReply and FreshIsNewestSeen and
    UntrackedShellHoldsNothing

  val ReplyOpenedWitness = opened.size() > 0
  val ReplacedHistoryFollowedWitness = s.tracked and s.restored.contains(s.last)
  val FreshHeldWhileSuspendedWitness = s.fresh.size() > 0 and not(s.live)
  val ShowInMapsOnRestoredWitness = s.requests.exists(request =>
    not(request.automatic) and s.restored.contains(request.id))

  run arrivedReplyOpensOnceTest = initWith(false).then(arrive(false)).then(render)
    .then(arrive(true)).then(render)
    .expect(s.autoOpens.get(2) == 1 and s.fresh == Set())
    .then(render).then(remount).then(render).then(render)
    .expect(s.autoOpens.get(2) == 1 and s.requests.size() == 1 and safety)
  run restoredHistoryNeverOpensTest = initWith(false).then(replaceHistory(2)).then(render).then(render)
    .expect(opened == Set() and s.last == 2)
    .then(arrive(false)).then(render).then(replaceHistory(2)).then(render)
    .expect(opened == Set() and s.fresh == Set() and s.last == 5)
    .then(arrive(true)).then(render).expect(opened == Set(6) and safety)
  run onlyNewestArrivedResultOpensTest = initWith(false).then(arrive(false)).then(render)
    .then(arrive(true)).then(arrive(true)).then(render)
    .expect(opened == Set(3) and s.fresh == Set() and safety)
  run showInMapsNeverStartsGuidanceTest = initWith(false).then(replaceHistory(1)).then(render)
    .then(showInMaps(1))
    .expect(s.requests == Set({ id: 1, automatic: false, allowDirectStart: false }) and opened == Set() and safety)
  run replyHeldWhileSuspendedOpensOnReturnTest = initWith(false).then(arrive(false)).then(render)
    .then(suspend).then(arrive(true)).then(render).expect(opened == Set() and s.fresh == Set(2))
    .then(resume).then(render).expect(opened == Set(2) and safety)
  run replyAfterReplacementBeforeRenderDoesNotOpenTest = initWith(false).then(arrive(false)).then(render)
    .then(replaceHistory(1)).then(arrive(true)).then(render)
    .expect(opened == Set() and s.last == 3 and safety)
  run assistantSurfaceNeverOpensTest = initWith(true).then(arrive(false)).then(render)
    .then(arrive(true)).then(render).expect(opened == Set() and s.requests == Set() and safety)
}
