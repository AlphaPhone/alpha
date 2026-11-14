// camera-adapter cropEdit/cropPointer/saveEdit: bounded selection and async preview ownership.
module PhotoCropSelection {
  type Rect = {x:int,y:int,width:int,height:int}
  type State = {phase:str, rect:Rect, draft:Rect, pending:Rect, epoch:int, replyEpoch:int, saved:bool, originalChanged:bool}
  pure val full:Rect = {x:0,y:0,width:4,height:4}
  pure def valid(r:Rect):bool = r.x>=0 and r.y>=0 and r.width>0 and r.height>0 and r.x+r.width<=4 and r.y+r.height<=4
  var s:State
  action init = s'={phase:"ready",rect:full,draft:full,pending:full,epoch:1,replyEpoch:0,saved:false,originalChanged:false}
  action open = s'=if(s.phase=="ready") {...s,phase:"adjusting",draft:s.rect} else s
  action adjust(r:Rect):bool = s'=if(s.phase=="adjusting" and valid(r)) {...s,draft:r} else s
  action apply = s'=if(s.phase=="adjusting") {...s,phase:"preview",pending:s.draft,replyEpoch:s.epoch} else s
  action reply(success:bool):bool = s'=if(s.phase=="preview" and s.replyEpoch==s.epoch)
    if(success) {...s,phase:"ready",rect:s.pending} else {...s,phase:"adjusting"}
    else s
  action cancelCrop = s'=if(s.phase=="adjusting") {...s,phase:"ready",draft:s.rect} else s
  action save = s'=if(s.phase=="ready") {...s,saved:true} else s
  action leave = s'=if(s.phase!="closed") {...s,phase:"closed",epoch:s.epoch+1} else s
  action step = any {open,apply,save,cancelCrop,leave,reply(true),reply(false),
    all {nondet x=0.to(4).oneOf();nondet y=0.to(4).oneOf();nondet w=1.to(4).oneOf();nondet h=1.to(4).oneOf();adjust({x:x,y:y,width:w,height:h})}}
  val RectInsideSource = valid(s.rect) and valid(s.draft) and valid(s.pending)
  val OriginalPreserved = not(s.originalChanged)
  val safety = RectInsideSource and OriginalPreserved
  run selectionNeedsApplyTest = init.then(open).then(adjust({x:2,y:0,width:2,height:4})).then(save)
    .expect(not(s.saved) and s.rect==full).then(apply).then(reply(true)).then(save)
    .expect(s.saved and s.rect=={x:2,y:0,width:2,height:4} and safety)
  run cancelledPreviewCannotReturnTest = init.then(open).then(apply).then(leave).then(reply(true))
    .expect(s.phase=="closed" and not(s.saved) and safety)
  run failureKeepsSelectionTest = init.then(open).then(adjust({x:1,y:1,width:2,height:2})).then(apply).then(reply(false))
    .expect(s.phase=="adjusting" and s.draft=={x:1,y:1,width:2,height:2} and safety)
}
