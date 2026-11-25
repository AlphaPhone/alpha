lemma TypeReqView(c: Composer, chat: int, text: string, by_: Actor)
  ensures typeAlphaRequest(c, chat, text, by_).alphaRequests == (ProofLib.Filter((r: AlphaRequest) => (r.chat != chat), c.alphaRequests) + (if (text == "") then [] else [AlphaRequest(chat, text)]))
{
}

lemma SendReqView(c: Composer, chat: int, by_: Actor)
  ensures sendAlphaRequest(c, chat, by_).alphaRequests == ProofLib.Filter((r: AlphaRequest) => (r.chat != chat), c.alphaRequests)
{
}

lemma typeAlphaRequest_ensures(c: Composer, chat: int, text: string, by_: Actor)
  ensures (inv(c) ==> canTypeAlphaRequest(c, chat, text, by_) ==> alwaysBarTargetMatchesSheet(typeAlphaRequest(c, chat, text, by_)))
  ensures (inv(c) ==> canTypeAlphaRequest(c, chat, text, by_) ==> alwaysComposerConsistent(typeAlphaRequest(c, chat, text, by_)))
  ensures (inv(c) ==> canTypeAlphaRequest(c, chat, text, by_) ==> alwaysSeparateAlphaRequests(typeAlphaRequest(c, chat, text, by_)))
  ensures (inv(c) ==> canTypeAlphaRequest(c, chat, text, by_) ==> stepAlphaNeverOverwritesOwnerDraft(c, "typeAlphaRequest", typeAlphaRequest(c, chat, text, by_)))
  ensures (inv(c) ==> canTypeAlphaRequest(c, chat, text, by_) ==> stepOnlyOwnersTapSends(c, "typeAlphaRequest", typeAlphaRequest(c, chat, text, by_), []))
  ensures (inv(c) ==> canTypeAlphaRequest(c, chat, text, by_) ==> stepUnknownSendIsReadBackOnly(c, "typeAlphaRequest", typeAlphaRequest(c, chat, text, by_), []))
  ensures (inv(c) ==> canTypeAlphaRequest(c, chat, text, by_) ==> stepSeparateDraftsNeverMerge(c, "typeAlphaRequest", typeAlphaRequest(c, chat, text, by_)))
{
  if inv(c) && canTypeAlphaRequest(c, chat, text, by_) {
    TypeReqView(c, chat, text, by_);
    var filtered := ProofLib.Filter((r: AlphaRequest) => (r.chat != chat), c.alphaRequests);
    forall r | r in filtered ensures r.chat > 0 && r.text != "" {
      ProofLib.FilterMember((r: AlphaRequest) => (r.chat != chat), c.alphaRequests, r);
    }
  }
}

lemma sendAlphaRequest_ensures(c: Composer, chat: int, by_: Actor)
  ensures (inv(c) ==> canSendAlphaRequest(c, chat, by_) ==> alwaysBarTargetMatchesSheet(sendAlphaRequest(c, chat, by_)))
  ensures (inv(c) ==> canSendAlphaRequest(c, chat, by_) ==> alwaysComposerConsistent(sendAlphaRequest(c, chat, by_)))
  ensures (inv(c) ==> canSendAlphaRequest(c, chat, by_) ==> alwaysSeparateAlphaRequests(sendAlphaRequest(c, chat, by_)))
  ensures (inv(c) ==> canSendAlphaRequest(c, chat, by_) ==> stepAlphaNeverOverwritesOwnerDraft(c, "sendAlphaRequest", sendAlphaRequest(c, chat, by_)))
  ensures (inv(c) ==> canSendAlphaRequest(c, chat, by_) ==> stepOnlyOwnersTapSends(c, "sendAlphaRequest", sendAlphaRequest(c, chat, by_), []))
  ensures (inv(c) ==> canSendAlphaRequest(c, chat, by_) ==> stepUnknownSendIsReadBackOnly(c, "sendAlphaRequest", sendAlphaRequest(c, chat, by_), []))
  ensures (inv(c) ==> canSendAlphaRequest(c, chat, by_) ==> stepSeparateDraftsNeverMerge(c, "sendAlphaRequest", sendAlphaRequest(c, chat, by_)))
{
  if inv(c) && canSendAlphaRequest(c, chat, by_) {
    SendReqView(c, chat, by_);
    var filtered := ProofLib.Filter((r: AlphaRequest) => (r.chat != chat), c.alphaRequests);
    forall r | r in filtered ensures r.chat > 0 && r.text != "" {
      ProofLib.FilterMember((r: AlphaRequest) => (r.chat != chat), c.alphaRequests, r);
    }
  }
}
