lemma ScreenViewsIs(image: bool, contacts: bool)
  ensures screenViews(image, contacts) == ProofLib.Filter((v: app__shell_View) => app__shell_available(app__shell_initial.(image := image, contacts := contacts), v), everyView)
{
}

lemma EveryViewHasAll(view: app__shell_View)
  ensures view in everyView
{
  match view {
    case Phone => assert everyView[0] == view;
    case Messages => assert everyView[1] == view;
    case Inbox => assert everyView[2] == view;
    case Telegram => assert everyView[3] == view;
    case Slack => assert everyView[4] == view;
    case Calendar => assert everyView[5] == view;
    case Clock => assert everyView[6] == view;
    case Reminders => assert everyView[7] == view;
    case Browser => assert everyView[8] == view;
    case Camera => assert everyView[9] == view;
    case Photos => assert everyView[10] == view;
    case Maps => assert everyView[11] == view;
    case Notes => assert everyView[12] == view;
    case Contacts => assert everyView[13] == view;
    case Files => assert everyView[14] == view;
    case Workflows => assert everyView[15] == view;
    case Wallet => assert everyView[16] == view;
    case Settings => assert everyView[17] == view;
  }
}

lemma lawAViewIsNamedExactlyWhenTheShellHasIt_ensures(image: bool, contacts: bool, view: app__shell_View)
  ensures (lawAViewIsNamedExactlyWhenTheShellHasIt(image, contacts, view) == true)
{
  ScreenViewsIs(image, contacts);
  EveryViewHasAll(view);
  ProofLib.FilterMember((v: app__shell_View) => app__shell_available(app__shell_initial.(image := image, contacts := contacts), v), everyView, view);
}

lemma lawABrowserPreviewNamesNoMessages_ensures(contacts: bool)
  ensures (lawABrowserPreviewNamesNoMessages(contacts) == true)
{
  lawAViewIsNamedExactlyWhenTheShellHasIt_ensures(false, contacts, app__shell_View.Messages);
  lawAViewIsNamedExactlyWhenTheShellHasIt_ensures(false, contacts, app__shell_View.Phone);
}
lemma lawAnImageNamesMessages_ensures(contacts: bool)
  ensures (lawAnImageNamesMessages(contacts) == true)
{
  lawAViewIsNamedExactlyWhenTheShellHasIt_ensures(true, contacts, app__shell_View.Messages);
}
