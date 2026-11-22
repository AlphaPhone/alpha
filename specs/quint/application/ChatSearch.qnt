/// A search response can publish only in its live owner scope.
module ChatSearch {
  type State = {owner:int, held:int, open:bool, pending:bool, results:bool}
  var s:State
  action init = s'={owner:0,held:0,open:false,pending:false,results:false}
  action openSearch = s'={...s,open:true,pending:false,results:false}
  action query = all {s.open,not(s.pending),s'={...s,pending:true,held:s.owner}}
  action reply = s'={...s,pending:false,results:s.pending and s.open and s.held==s.owner}
  action closeSearch = s'={...s,open:false,pending:false,results:false}
  action retire = all {s.owner<3,s'={...s,owner:s.owner+1,open:false,pending:false,results:false}}
  action step = any {openSearch,query,reply,closeSearch,retire,s'=s}
  val safety = s.results implies (s.open and s.held==s.owner)
  run currentReplyTest = init.then(openSearch).then(query).then(reply).expect(s.results and safety)
  run retiredReplyTest = init.then(openSearch).then(query).then(retire).then(reply).expect(not(s.results) and safety)
  run cancelledReplyTest = init.then(openSearch).then(query).then(closeSearch).then(reply).expect(not(s.results) and safety)
}
