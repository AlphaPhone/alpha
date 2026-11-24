// Proof of the sign-in machine: Dafny is shown the request each step sends.

lemma sendCode_ensures(s: SignIn, method_: app__account__session_Method, address: string, now: int, online: bool)
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> alwaysTheRequestFitsTheStep(sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> alwaysOnlyARequiredPageWaits(sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> alwaysWrongCodesAreBounded(sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> alwaysASpentCodeIsNeverChecked(sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> alwaysTheCodeStepsNameAnAttempt(sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> alwaysACodeHasAnAddress(sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepEveryRequestTakesTheNextNumber(s, sendCode(s, method_, address, now, online).state, sendCode(s, method_, address, now, online).out))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepAFailedSendKeepsTheAttempt(s, "sendCode", sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepAskingForAnotherCodeKeepsTheOneInHand(s, "sendCode", sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepAnAttemptBeginsOnlyWhenACodeWentOut(s, "sendCode", sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepOnlyAVerifiedAnswerHandsOver(s, "sendCode", sendCode(s, method_, address, now, online).state, sendCode(s, method_, address, now, online).out))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepOnlyAWrongCodeIsCounted(s, "sendCode", sendCode(s, method_, address, now, online).state))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepABrowserReturnIsUsedOnce(s, "sendCode", sendCode(s, method_, address, now, online).state, sendCode(s, method_, address, now, online).out))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepBackWithdrawsWhatIsInFlight(s, "sendCode", sendCode(s, method_, address, now, online).state, sendCode(s, method_, address, now, online).out))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepOnlyBackAbandonsAnAttempt(s, "sendCode", sendCode(s, method_, address, now, online).state, sendCode(s, method_, address, now, online).out))
  ensures (inv(s) ==> canSendCode(s, method_, address, now, online) ==> stepErasingLeavesNoAddress(s, "sendCode", sendCode(s, method_, address, now, online).state))
{
  var after := sendCode(s, method_, address, now, online);
  assert after.out[0] in after.out;
}

lemma resend_ensures(s: SignIn, now: int, online: bool)
  ensures (inv(s) ==> canResend(s, now, online) ==> alwaysTheRequestFitsTheStep(resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> alwaysOnlyARequiredPageWaits(resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> alwaysWrongCodesAreBounded(resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> alwaysASpentCodeIsNeverChecked(resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> alwaysTheCodeStepsNameAnAttempt(resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> alwaysACodeHasAnAddress(resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepEveryRequestTakesTheNextNumber(s, resend(s, now, online).state, resend(s, now, online).out))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepAFailedSendKeepsTheAttempt(s, "resend", resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepAskingForAnotherCodeKeepsTheOneInHand(s, "resend", resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepAnAttemptBeginsOnlyWhenACodeWentOut(s, "resend", resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepOnlyAVerifiedAnswerHandsOver(s, "resend", resend(s, now, online).state, resend(s, now, online).out))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepOnlyAWrongCodeIsCounted(s, "resend", resend(s, now, online).state))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepABrowserReturnIsUsedOnce(s, "resend", resend(s, now, online).state, resend(s, now, online).out))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepBackWithdrawsWhatIsInFlight(s, "resend", resend(s, now, online).state, resend(s, now, online).out))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepOnlyBackAbandonsAnAttempt(s, "resend", resend(s, now, online).state, resend(s, now, online).out))
  ensures (inv(s) ==> canResend(s, now, online) ==> stepErasingLeavesNoAddress(s, "resend", resend(s, now, online).state))
{
  var after := resend(s, now, online);
  assert after.out[0] in after.out;
}

lemma checkCode_ensures(s: SignIn, code: string, now: int, online: bool)
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> alwaysTheRequestFitsTheStep(checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> alwaysOnlyARequiredPageWaits(checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> alwaysWrongCodesAreBounded(checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> alwaysASpentCodeIsNeverChecked(checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> alwaysTheCodeStepsNameAnAttempt(checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> alwaysACodeHasAnAddress(checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepEveryRequestTakesTheNextNumber(s, checkCode(s, code, now, online).state, checkCode(s, code, now, online).out))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepAFailedSendKeepsTheAttempt(s, "checkCode", checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepAskingForAnotherCodeKeepsTheOneInHand(s, "checkCode", checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepAnAttemptBeginsOnlyWhenACodeWentOut(s, "checkCode", checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepOnlyAVerifiedAnswerHandsOver(s, "checkCode", checkCode(s, code, now, online).state, checkCode(s, code, now, online).out))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepOnlyAWrongCodeIsCounted(s, "checkCode", checkCode(s, code, now, online).state))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepABrowserReturnIsUsedOnce(s, "checkCode", checkCode(s, code, now, online).state, checkCode(s, code, now, online).out))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepBackWithdrawsWhatIsInFlight(s, "checkCode", checkCode(s, code, now, online).state, checkCode(s, code, now, online).out))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepOnlyBackAbandonsAnAttempt(s, "checkCode", checkCode(s, code, now, online).state, checkCode(s, code, now, online).out))
  ensures (inv(s) ==> canCheckCode(s, now, online) ==> stepErasingLeavesNoAddress(s, "checkCode", checkCode(s, code, now, online).state))
{
  var after := checkCode(s, code, now, online);
  assert after.out[0] in after.out;
}

lemma usePasskey_ensures(s: SignIn, now: int, online: bool)
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> alwaysTheRequestFitsTheStep(usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> alwaysOnlyARequiredPageWaits(usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> alwaysWrongCodesAreBounded(usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> alwaysASpentCodeIsNeverChecked(usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> alwaysTheCodeStepsNameAnAttempt(usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> alwaysACodeHasAnAddress(usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepEveryRequestTakesTheNextNumber(s, usePasskey(s, now, online).state, usePasskey(s, now, online).out))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepAFailedSendKeepsTheAttempt(s, "usePasskey", usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepAskingForAnotherCodeKeepsTheOneInHand(s, "usePasskey", usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepAnAttemptBeginsOnlyWhenACodeWentOut(s, "usePasskey", usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepOnlyAVerifiedAnswerHandsOver(s, "usePasskey", usePasskey(s, now, online).state, usePasskey(s, now, online).out))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepOnlyAWrongCodeIsCounted(s, "usePasskey", usePasskey(s, now, online).state))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepABrowserReturnIsUsedOnce(s, "usePasskey", usePasskey(s, now, online).state, usePasskey(s, now, online).out))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepBackWithdrawsWhatIsInFlight(s, "usePasskey", usePasskey(s, now, online).state, usePasskey(s, now, online).out))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepOnlyBackAbandonsAnAttempt(s, "usePasskey", usePasskey(s, now, online).state, usePasskey(s, now, online).out))
  ensures (inv(s) ==> canUsePasskey(s, now, online) ==> stepErasingLeavesNoAddress(s, "usePasskey", usePasskey(s, now, online).state))
{
  var after := usePasskey(s, now, online);
  assert after.out[0] in after.out;
}

lemma cancel_ensures(s: SignIn)
  ensures (inv(s) ==> canCancel(s) ==> alwaysTheRequestFitsTheStep(cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> alwaysOnlyARequiredPageWaits(cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> alwaysWrongCodesAreBounded(cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> alwaysASpentCodeIsNeverChecked(cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> alwaysTheCodeStepsNameAnAttempt(cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> alwaysACodeHasAnAddress(cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> stepEveryRequestTakesTheNextNumber(s, cancel(s).state, cancel(s).out))
  ensures (inv(s) ==> canCancel(s) ==> stepAFailedSendKeepsTheAttempt(s, "cancel", cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> stepAskingForAnotherCodeKeepsTheOneInHand(s, "cancel", cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> stepAnAttemptBeginsOnlyWhenACodeWentOut(s, "cancel", cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> stepOnlyAVerifiedAnswerHandsOver(s, "cancel", cancel(s).state, cancel(s).out))
  ensures (inv(s) ==> canCancel(s) ==> stepOnlyAWrongCodeIsCounted(s, "cancel", cancel(s).state))
  ensures (inv(s) ==> canCancel(s) ==> stepABrowserReturnIsUsedOnce(s, "cancel", cancel(s).state, cancel(s).out))
  ensures (inv(s) ==> canCancel(s) ==> stepBackWithdrawsWhatIsInFlight(s, "cancel", cancel(s).state, cancel(s).out))
  ensures (inv(s) ==> canCancel(s) ==> stepOnlyBackAbandonsAnAttempt(s, "cancel", cancel(s).state, cancel(s).out))
  ensures (inv(s) ==> canCancel(s) ==> stepErasingLeavesNoAddress(s, "cancel", cancel(s).state))
{
  if inv(s) && canCancel(s) {
    var after := cancel(s);
    if !s.work.Resting? || s.step.Browser? {
      assert after.out[0].Withdraw?;
      assert after.out[0] in after.out;
      forall e | e in after.out ensures e.Withdraw? ==> e.ticket == after.state.ticket {
      }
    }
  }
}
