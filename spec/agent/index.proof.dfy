lemma NotSpeech(r: Route)
  requires |r.path| >= 11
  requires !(r.path[5] == "a"[0] && r.path[6] == "l"[0] && r.path[10] == "-"[0])
  requires !(r.path[5] == "a"[0] && r.path[6] == "s"[0])
  ensures r !in nativeSpeechRoutes
{
  assert nativeSpeechRoutes[0].path[5] == "a"[0] && nativeSpeechRoutes[0].path[6] == "l"[0] && nativeSpeechRoutes[0].path[10] == "-"[0];
  assert nativeSpeechRoutes[1].path[5] == "a"[0] && nativeSpeechRoutes[1].path[6] == "s"[0];
}

lemma CoreNotSpeech(route: Route)
  requires route in pageRoutesCore
  ensures route !in nativeSpeechRoutes
{
  assert |pageRoutesCore| == 31;
  var i :| 0 <= i < 31 && pageRoutesCore[i] == route;
  if i == 0 { NotSpeech(pageRoutesCore[0]); } else if i == 1 { NotSpeech(pageRoutesCore[1]); } else if i == 2 { NotSpeech(pageRoutesCore[2]); } else if i == 3 { NotSpeech(pageRoutesCore[3]); } else if i == 4 { NotSpeech(pageRoutesCore[4]); }
  else if i == 5 { NotSpeech(pageRoutesCore[5]); } else if i == 6 { NotSpeech(pageRoutesCore[6]); } else if i == 7 { NotSpeech(pageRoutesCore[7]); } else if i == 8 { NotSpeech(pageRoutesCore[8]); } else if i == 9 { NotSpeech(pageRoutesCore[9]); }
  else if i == 10 { NotSpeech(pageRoutesCore[10]); } else if i == 11 { NotSpeech(pageRoutesCore[11]); } else if i == 12 { NotSpeech(pageRoutesCore[12]); } else if i == 13 { NotSpeech(pageRoutesCore[13]); } else if i == 14 { NotSpeech(pageRoutesCore[14]); }
  else if i == 15 { NotSpeech(pageRoutesCore[15]); } else if i == 16 { NotSpeech(pageRoutesCore[16]); } else if i == 17 { NotSpeech(pageRoutesCore[17]); } else if i == 18 { NotSpeech(pageRoutesCore[18]); } else if i == 19 { NotSpeech(pageRoutesCore[19]); }
  else if i == 20 { NotSpeech(pageRoutesCore[20]); } else if i == 21 { NotSpeech(pageRoutesCore[21]); } else if i == 22 { NotSpeech(pageRoutesCore[22]); } else if i == 23 { NotSpeech(pageRoutesCore[23]); } else if i == 24 { NotSpeech(pageRoutesCore[24]); }
  else if i == 25 { NotSpeech(pageRoutesCore[25]); } else if i == 26 { NotSpeech(pageRoutesCore[26]); } else if i == 27 { NotSpeech(pageRoutesCore[27]); } else if i == 28 { NotSpeech(pageRoutesCore[28]); } else if i == 29 { NotSpeech(pageRoutesCore[29]); }
  else { NotSpeech(pageRoutesCore[30]); }
}

lemma AppsNotSpeech(route: Route)
  requires route in pageRoutesApps
  ensures route !in nativeSpeechRoutes
{
  assert |pageRoutesApps| == 31;
  var i :| 0 <= i < 31 && pageRoutesApps[i] == route;
  if i == 0 { NotSpeech(pageRoutesApps[0]); } else if i == 1 { NotSpeech(pageRoutesApps[1]); } else if i == 2 { NotSpeech(pageRoutesApps[2]); } else if i == 3 { NotSpeech(pageRoutesApps[3]); } else if i == 4 { NotSpeech(pageRoutesApps[4]); }
  else if i == 5 { NotSpeech(pageRoutesApps[5]); } else if i == 6 { NotSpeech(pageRoutesApps[6]); } else if i == 7 { NotSpeech(pageRoutesApps[7]); } else if i == 8 { NotSpeech(pageRoutesApps[8]); } else if i == 9 { NotSpeech(pageRoutesApps[9]); }
  else if i == 10 { NotSpeech(pageRoutesApps[10]); } else if i == 11 { NotSpeech(pageRoutesApps[11]); } else if i == 12 { NotSpeech(pageRoutesApps[12]); } else if i == 13 { NotSpeech(pageRoutesApps[13]); } else if i == 14 { NotSpeech(pageRoutesApps[14]); }
  else if i == 15 { NotSpeech(pageRoutesApps[15]); } else if i == 16 { NotSpeech(pageRoutesApps[16]); } else if i == 17 { NotSpeech(pageRoutesApps[17]); } else if i == 18 { NotSpeech(pageRoutesApps[18]); } else if i == 19 { NotSpeech(pageRoutesApps[19]); }
  else if i == 20 { NotSpeech(pageRoutesApps[20]); } else if i == 21 { NotSpeech(pageRoutesApps[21]); } else if i == 22 { NotSpeech(pageRoutesApps[22]); } else if i == 23 { NotSpeech(pageRoutesApps[23]); } else if i == 24 { NotSpeech(pageRoutesApps[24]); }
  else if i == 25 { NotSpeech(pageRoutesApps[25]); } else if i == 26 { NotSpeech(pageRoutesApps[26]); } else if i == 27 { NotSpeech(pageRoutesApps[27]); } else if i == 28 { NotSpeech(pageRoutesApps[28]); } else if i == 29 { NotSpeech(pageRoutesApps[29]); }
  else { NotSpeech(pageRoutesApps[30]); }
}

lemma WorkflowsNotSpeechA(i: int)
  requires 0 <= i < 15
  ensures pageRoutesWorkflows[i] !in nativeSpeechRoutes
{
  if i == 0 { NotSpeech(pageRoutesWorkflows[0]); } else if i == 1 { NotSpeech(pageRoutesWorkflows[1]); } else if i == 2 { NotSpeech(pageRoutesWorkflows[2]); } else if i == 3 { NotSpeech(pageRoutesWorkflows[3]); } else if i == 4 { NotSpeech(pageRoutesWorkflows[4]); }
  else if i == 5 { NotSpeech(pageRoutesWorkflows[5]); } else if i == 6 { NotSpeech(pageRoutesWorkflows[6]); } else if i == 7 { NotSpeech(pageRoutesWorkflows[7]); } else if i == 8 { NotSpeech(pageRoutesWorkflows[8]); } else if i == 9 { NotSpeech(pageRoutesWorkflows[9]); }
  else if i == 10 { NotSpeech(pageRoutesWorkflows[10]); } else if i == 11 { NotSpeech(pageRoutesWorkflows[11]); } else if i == 12 { NotSpeech(pageRoutesWorkflows[12]); } else if i == 13 { NotSpeech(pageRoutesWorkflows[13]); } else { NotSpeech(pageRoutesWorkflows[14]); }
}

lemma WorkflowsNotSpeechB(i: int)
  requires 15 <= i < 30
  ensures pageRoutesWorkflows[i] !in nativeSpeechRoutes
{
  if i == 15 { NotSpeech(pageRoutesWorkflows[15]); } else if i == 16 { NotSpeech(pageRoutesWorkflows[16]); } else if i == 17 { NotSpeech(pageRoutesWorkflows[17]); } else if i == 18 { NotSpeech(pageRoutesWorkflows[18]); } else if i == 19 { NotSpeech(pageRoutesWorkflows[19]); }
  else if i == 20 { NotSpeech(pageRoutesWorkflows[20]); } else if i == 21 { NotSpeech(pageRoutesWorkflows[21]); } else if i == 22 { NotSpeech(pageRoutesWorkflows[22]); } else if i == 23 { NotSpeech(pageRoutesWorkflows[23]); } else if i == 24 { NotSpeech(pageRoutesWorkflows[24]); }
  else if i == 25 { NotSpeech(pageRoutesWorkflows[25]); } else if i == 26 { NotSpeech(pageRoutesWorkflows[26]); } else if i == 27 { NotSpeech(pageRoutesWorkflows[27]); } else if i == 28 { NotSpeech(pageRoutesWorkflows[28]); } else { NotSpeech(pageRoutesWorkflows[29]); }
}

lemma WorkflowsNotSpeech(route: Route)
  requires route in pageRoutesWorkflows
  ensures route !in nativeSpeechRoutes
{
  assert |pageRoutesWorkflows| == 30;
  var i :| 0 <= i < 30 && pageRoutesWorkflows[i] == route;
  if i < 15 { WorkflowsNotSpeechA(i); } else { WorkflowsNotSpeechB(i); }
}

lemma TasksWalletNotSpeechA(i: int)
  requires 0 <= i < 15
  ensures pageRoutesTasksWallet[i] !in nativeSpeechRoutes
{
  if i == 0 { NotSpeech(pageRoutesTasksWallet[0]); } else if i == 1 { NotSpeech(pageRoutesTasksWallet[1]); } else if i == 2 { NotSpeech(pageRoutesTasksWallet[2]); } else if i == 3 { NotSpeech(pageRoutesTasksWallet[3]); } else if i == 4 { NotSpeech(pageRoutesTasksWallet[4]); }
  else if i == 5 { NotSpeech(pageRoutesTasksWallet[5]); } else if i == 6 { NotSpeech(pageRoutesTasksWallet[6]); } else if i == 7 { NotSpeech(pageRoutesTasksWallet[7]); } else if i == 8 { NotSpeech(pageRoutesTasksWallet[8]); } else if i == 9 { NotSpeech(pageRoutesTasksWallet[9]); }
  else if i == 10 { NotSpeech(pageRoutesTasksWallet[10]); } else if i == 11 { NotSpeech(pageRoutesTasksWallet[11]); } else if i == 12 { NotSpeech(pageRoutesTasksWallet[12]); } else if i == 13 { NotSpeech(pageRoutesTasksWallet[13]); } else { NotSpeech(pageRoutesTasksWallet[14]); }
}

lemma TasksWalletNotSpeechB(i: int)
  requires 15 <= i < 30
  ensures pageRoutesTasksWallet[i] !in nativeSpeechRoutes
{
  if i == 15 { NotSpeech(pageRoutesTasksWallet[15]); } else if i == 16 { NotSpeech(pageRoutesTasksWallet[16]); } else if i == 17 { NotSpeech(pageRoutesTasksWallet[17]); } else if i == 18 { NotSpeech(pageRoutesTasksWallet[18]); } else if i == 19 { NotSpeech(pageRoutesTasksWallet[19]); }
  else if i == 20 { NotSpeech(pageRoutesTasksWallet[20]); } else if i == 21 { NotSpeech(pageRoutesTasksWallet[21]); } else if i == 22 { NotSpeech(pageRoutesTasksWallet[22]); } else if i == 23 { NotSpeech(pageRoutesTasksWallet[23]); } else if i == 24 { NotSpeech(pageRoutesTasksWallet[24]); }
  else if i == 25 { NotSpeech(pageRoutesTasksWallet[25]); } else if i == 26 { NotSpeech(pageRoutesTasksWallet[26]); } else if i == 27 { NotSpeech(pageRoutesTasksWallet[27]); } else if i == 28 { NotSpeech(pageRoutesTasksWallet[28]); } else { NotSpeech(pageRoutesTasksWallet[29]); }
}

lemma TasksWalletNotSpeech(route: Route)
  requires route in pageRoutesTasksWallet
  ensures route !in nativeSpeechRoutes
{
  assert |pageRoutesTasksWallet| == 30;
  var i :| 0 <= i < 30 && pageRoutesTasksWallet[i] == route;
  if i < 15 { TasksWalletNotSpeechA(i); } else { TasksWalletNotSpeechB(i); }
}

lemma lawSpeechRoutesAreAbsentFromThePage_ensures(route: Route)
  ensures (lawSpeechRoutesAreAbsentFromThePage(route) == true)
{
  if route in pageRoutes {
    if route in pageRoutesCore { CoreNotSpeech(route); }
    else if route in pageRoutesApps { AppsNotSpeech(route); }
    else if route in pageRoutesWorkflows { WorkflowsNotSpeech(route); }
    else { TasksWalletNotSpeech(route); }
  }
}
