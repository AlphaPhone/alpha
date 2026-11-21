// Proof of the session machine's obligations Dafny cannot find alone.

lemma admit_ensures(s: Session, account: int, method_: Method, created: bool, busy: bool, now: int)
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> alwaysASignInIsNumbered(admit(s, account, method_, created, busy, now).state))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> alwaysNoSignOutWhileTheStoreIsRead(admit(s, account, method_, created, busy, now).state))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> alwaysAChangeNamesItsAccount(admit(s, account, method_, created, busy, now).state))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> alwaysSignOutIsReviewedOnlyWhileSignedIn(admit(s, account, method_, created, busy, now).state))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepEveryRequestTakesTheNextNumber(s, admit(s, account, method_, created, busy, now).state, admit(s, account, method_, created, busy, now).out))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepSignInNumbersNeverGoBack(s, admit(s, account, method_, created, busy, now).state))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepASignInIsStoredOrRemovedOnlyOnceTheAgentIsHeld(s, "admit", admit(s, account, method_, created, busy, now).state, admit(s, account, method_, created, busy, now).out))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepEveryChangeHoldsTheAgentFirst(s, admit(s, account, method_, created, busy, now).state, admit(s, account, method_, created, busy, now).out))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepTheAgentIsLetGoWhenAChangeEnds(s, "admit", admit(s, account, method_, created, busy, now).state, admit(s, account, method_, created, busy, now).out))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepTheAccountChangesOnlyOnThePhonesWord(s, "admit", admit(s, account, method_, created, busy, now).state))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepEveryNewSignInIsTold(s, "admit", admit(s, account, method_, created, busy, now).state, admit(s, account, method_, created, busy, now).out))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepASignInIsRemovedOnlyWhenConfirmedOrEnded(s, "admit", admit(s, account, method_, created, busy, now).state))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepCheckDevicesStaysUntilDismissed(s, "admit", admit(s, account, method_, created, busy, now).state))
  ensures (inv(s) ==> canAdmit(s, account, method_, created) ==> stepErasingLeavesNoSignIn(s, "admit", admit(s, account, method_, created, busy, now).state))
{
  var after := admit(s, account, method_, created, busy, now);
  if !busy { assert after.out[0] == Effect.HoldAgent; assert after.out[0] in after.out; }
}

lemma confirmSignOut_ensures(s: Session, busy: bool, now: int)
  ensures (inv(s) ==> canConfirmSignOut(s) ==> alwaysASignInIsNumbered(confirmSignOut(s, busy, now).state))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> alwaysNoSignOutWhileTheStoreIsRead(confirmSignOut(s, busy, now).state))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> alwaysAChangeNamesItsAccount(confirmSignOut(s, busy, now).state))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> alwaysSignOutIsReviewedOnlyWhileSignedIn(confirmSignOut(s, busy, now).state))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepEveryRequestTakesTheNextNumber(s, confirmSignOut(s, busy, now).state, confirmSignOut(s, busy, now).out))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepSignInNumbersNeverGoBack(s, confirmSignOut(s, busy, now).state))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepASignInIsStoredOrRemovedOnlyOnceTheAgentIsHeld(s, "confirmSignOut", confirmSignOut(s, busy, now).state, confirmSignOut(s, busy, now).out))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepEveryChangeHoldsTheAgentFirst(s, confirmSignOut(s, busy, now).state, confirmSignOut(s, busy, now).out))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepTheAgentIsLetGoWhenAChangeEnds(s, "confirmSignOut", confirmSignOut(s, busy, now).state, confirmSignOut(s, busy, now).out))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepTheAccountChangesOnlyOnThePhonesWord(s, "confirmSignOut", confirmSignOut(s, busy, now).state))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepEveryNewSignInIsTold(s, "confirmSignOut", confirmSignOut(s, busy, now).state, confirmSignOut(s, busy, now).out))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepASignInIsRemovedOnlyWhenConfirmedOrEnded(s, "confirmSignOut", confirmSignOut(s, busy, now).state))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepCheckDevicesStaysUntilDismissed(s, "confirmSignOut", confirmSignOut(s, busy, now).state))
  ensures (inv(s) ==> canConfirmSignOut(s) ==> stepErasingLeavesNoSignIn(s, "confirmSignOut", confirmSignOut(s, busy, now).state))
{
  var after := confirmSignOut(s, busy, now);
  if !busy { assert after.out[0] == Effect.HoldAgent; assert after.out[0] in after.out; }
}

lemma cloudRefused_ensures(s: Session, source: Source, busy: bool, now: int)
  ensures (inv(s) ==> canCloudRefused(s, source) ==> alwaysASignInIsNumbered(cloudRefused(s, source, busy, now).state))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> alwaysNoSignOutWhileTheStoreIsRead(cloudRefused(s, source, busy, now).state))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> alwaysAChangeNamesItsAccount(cloudRefused(s, source, busy, now).state))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> alwaysSignOutIsReviewedOnlyWhileSignedIn(cloudRefused(s, source, busy, now).state))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepEveryRequestTakesTheNextNumber(s, cloudRefused(s, source, busy, now).state, cloudRefused(s, source, busy, now).out))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepSignInNumbersNeverGoBack(s, cloudRefused(s, source, busy, now).state))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepASignInIsStoredOrRemovedOnlyOnceTheAgentIsHeld(s, "cloudRefused", cloudRefused(s, source, busy, now).state, cloudRefused(s, source, busy, now).out))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepEveryChangeHoldsTheAgentFirst(s, cloudRefused(s, source, busy, now).state, cloudRefused(s, source, busy, now).out))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepTheAgentIsLetGoWhenAChangeEnds(s, "cloudRefused", cloudRefused(s, source, busy, now).state, cloudRefused(s, source, busy, now).out))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepTheAccountChangesOnlyOnThePhonesWord(s, "cloudRefused", cloudRefused(s, source, busy, now).state))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepEveryNewSignInIsTold(s, "cloudRefused", cloudRefused(s, source, busy, now).state, cloudRefused(s, source, busy, now).out))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepASignInIsRemovedOnlyWhenConfirmedOrEnded(s, "cloudRefused", cloudRefused(s, source, busy, now).state))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepCheckDevicesStaysUntilDismissed(s, "cloudRefused", cloudRefused(s, source, busy, now).state))
  ensures (inv(s) ==> canCloudRefused(s, source) ==> stepErasingLeavesNoSignIn(s, "cloudRefused", cloudRefused(s, source, busy, now).state))
{
  var after := cloudRefused(s, source, busy, now);
  if !busy { assert after.out[0] == Effect.HoldAgent; assert after.out[0] in after.out; }
}

lemma lawAHoldWaitsForATurnInFlight_ensures(account: int, now: int)
  ensures (lawAHoldWaitsForATurnInFlight(account, now) == true)
{
  var held := admit(initial, account, Method.Email, false, true, now);
  var out := proceed(held.state, false, now).out;
  assert out[0] == Effect.HoldAgent;
  assert out[0] in out;
}

lemma signInStored_ensures(s: Session, ticket: int, ok: bool, revoked: bool, endsAt: int)
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> alwaysASignInIsNumbered(signInStored(s, ticket, ok, revoked, endsAt).state))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> alwaysNoSignOutWhileTheStoreIsRead(signInStored(s, ticket, ok, revoked, endsAt).state))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> alwaysAChangeNamesItsAccount(signInStored(s, ticket, ok, revoked, endsAt).state))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> alwaysSignOutIsReviewedOnlyWhileSignedIn(signInStored(s, ticket, ok, revoked, endsAt).state))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepEveryRequestTakesTheNextNumber(s, signInStored(s, ticket, ok, revoked, endsAt).state, signInStored(s, ticket, ok, revoked, endsAt).out))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepSignInNumbersNeverGoBack(s, signInStored(s, ticket, ok, revoked, endsAt).state))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepASignInIsStoredOrRemovedOnlyOnceTheAgentIsHeld(s, "signInStored", signInStored(s, ticket, ok, revoked, endsAt).state, signInStored(s, ticket, ok, revoked, endsAt).out))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepEveryChangeHoldsTheAgentFirst(s, signInStored(s, ticket, ok, revoked, endsAt).state, signInStored(s, ticket, ok, revoked, endsAt).out))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepTheAgentIsLetGoWhenAChangeEnds(s, "signInStored", signInStored(s, ticket, ok, revoked, endsAt).state, signInStored(s, ticket, ok, revoked, endsAt).out))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepTheAccountChangesOnlyOnThePhonesWord(s, "signInStored", signInStored(s, ticket, ok, revoked, endsAt).state))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepEveryNewSignInIsTold(s, "signInStored", signInStored(s, ticket, ok, revoked, endsAt).state, signInStored(s, ticket, ok, revoked, endsAt).out))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepASignInIsRemovedOnlyWhenConfirmedOrEnded(s, "signInStored", signInStored(s, ticket, ok, revoked, endsAt).state))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepCheckDevicesStaysUntilDismissed(s, "signInStored", signInStored(s, ticket, ok, revoked, endsAt).state))
  ensures (inv(s) ==> canSignInStored(s, ticket) ==> stepErasingLeavesNoSignIn(s, "signInStored", signInStored(s, ticket, ok, revoked, endsAt).state))
{
  var after := signInStored(s, ticket, ok, revoked, endsAt);
  assert after.out[0] == Effect.ReleaseAgent; assert after.out[0] in after.out;
}

lemma giveUp_ensures(s: Session, now: int)
  ensures (inv(s) ==> canGiveUp(s, now) ==> alwaysASignInIsNumbered(giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> alwaysNoSignOutWhileTheStoreIsRead(giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> alwaysAChangeNamesItsAccount(giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> alwaysSignOutIsReviewedOnlyWhileSignedIn(giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepEveryRequestTakesTheNextNumber(s, giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepSignInNumbersNeverGoBack(s, giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepASignInIsStoredOrRemovedOnlyOnceTheAgentIsHeld(s, "giveUp", giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepEveryChangeHoldsTheAgentFirst(s, giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepTheAgentIsLetGoWhenAChangeEnds(s, "giveUp", giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepTheAccountChangesOnlyOnThePhonesWord(s, "giveUp", giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepEveryNewSignInIsTold(s, "giveUp", giveUp(s, now).state, giveUp(s, now).out))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepASignInIsRemovedOnlyWhenConfirmedOrEnded(s, "giveUp", giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepCheckDevicesStaysUntilDismissed(s, "giveUp", giveUp(s, now).state))
  ensures (inv(s) ==> canGiveUp(s, now) ==> stepErasingLeavesNoSignIn(s, "giveUp", giveUp(s, now).state))
{
  var after := giveUp(s, now);
  assert after.out[0] == Effect.ReleaseAgent; assert after.out[0] in after.out;
}

lemma signedOut_ensures(s: Session, ticket: int, removed: bool)
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> alwaysASignInIsNumbered(signedOut(s, ticket, removed).state))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> alwaysNoSignOutWhileTheStoreIsRead(signedOut(s, ticket, removed).state))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> alwaysAChangeNamesItsAccount(signedOut(s, ticket, removed).state))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> alwaysSignOutIsReviewedOnlyWhileSignedIn(signedOut(s, ticket, removed).state))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepEveryRequestTakesTheNextNumber(s, signedOut(s, ticket, removed).state, signedOut(s, ticket, removed).out))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepSignInNumbersNeverGoBack(s, signedOut(s, ticket, removed).state))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepASignInIsStoredOrRemovedOnlyOnceTheAgentIsHeld(s, "signedOut", signedOut(s, ticket, removed).state, signedOut(s, ticket, removed).out))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepEveryChangeHoldsTheAgentFirst(s, signedOut(s, ticket, removed).state, signedOut(s, ticket, removed).out))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepTheAgentIsLetGoWhenAChangeEnds(s, "signedOut", signedOut(s, ticket, removed).state, signedOut(s, ticket, removed).out))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepTheAccountChangesOnlyOnThePhonesWord(s, "signedOut", signedOut(s, ticket, removed).state))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepEveryNewSignInIsTold(s, "signedOut", signedOut(s, ticket, removed).state, signedOut(s, ticket, removed).out))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepASignInIsRemovedOnlyWhenConfirmedOrEnded(s, "signedOut", signedOut(s, ticket, removed).state))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepCheckDevicesStaysUntilDismissed(s, "signedOut", signedOut(s, ticket, removed).state))
  ensures (inv(s) ==> canSignedOut(s, ticket) ==> stepErasingLeavesNoSignIn(s, "signedOut", signedOut(s, ticket, removed).state))
{
  var after := signedOut(s, ticket, removed);
  assert after.out[0] == Effect.ReleaseAgent; assert after.out[0] in after.out;
}
