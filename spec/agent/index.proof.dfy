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

lemma NotNonPostCleanup(r: Route)
  requires r.method_.Post? || |r.path| != 32 || r.path[5] != "a"[0] || r.path[6] != "l"[0] || r.path[11] != "n"[0] || r.path[17] != "b"[0]
  ensures r.path == browserNotesCleanup ==> r.method_.Post?
{
  assert |browserNotesCleanup| == 32;
  assert browserNotesCleanup[5] == "a"[0] && browserNotesCleanup[6] == "l"[0] && browserNotesCleanup[11] == "n"[0] && browserNotesCleanup[17] == "b"[0];
}

lemma CoreNotCleanupA(i: int)
  requires 0 <= i < 15
  ensures pageRoutesCore[i].path == browserNotesCleanup ==> pageRoutesCore[i].method_.Post?
{
  if i == 0 { NotNonPostCleanup(pageRoutesCore[0]); } else if i == 1 { NotNonPostCleanup(pageRoutesCore[1]); } else if i == 2 { NotNonPostCleanup(pageRoutesCore[2]); } else if i == 3 { NotNonPostCleanup(pageRoutesCore[3]); } else if i == 4 { NotNonPostCleanup(pageRoutesCore[4]); }
  else if i == 5 { NotNonPostCleanup(pageRoutesCore[5]); } else if i == 6 { NotNonPostCleanup(pageRoutesCore[6]); } else if i == 7 { NotNonPostCleanup(pageRoutesCore[7]); } else if i == 8 { NotNonPostCleanup(pageRoutesCore[8]); } else if i == 9 { NotNonPostCleanup(pageRoutesCore[9]); }
  else if i == 10 { NotNonPostCleanup(pageRoutesCore[10]); } else if i == 11 { NotNonPostCleanup(pageRoutesCore[11]); } else if i == 12 { NotNonPostCleanup(pageRoutesCore[12]); } else if i == 13 { NotNonPostCleanup(pageRoutesCore[13]); } else { NotNonPostCleanup(pageRoutesCore[14]); }
}

lemma CoreNotCleanupB(i: int)
  requires 15 <= i < 31
  ensures pageRoutesCore[i].path == browserNotesCleanup ==> pageRoutesCore[i].method_.Post?
{
  if i == 15 { NotNonPostCleanup(pageRoutesCore[15]); } else if i == 16 { NotNonPostCleanup(pageRoutesCore[16]); } else if i == 17 { NotNonPostCleanup(pageRoutesCore[17]); } else if i == 18 { NotNonPostCleanup(pageRoutesCore[18]); } else if i == 19 { NotNonPostCleanup(pageRoutesCore[19]); }
  else if i == 20 { NotNonPostCleanup(pageRoutesCore[20]); } else if i == 21 { NotNonPostCleanup(pageRoutesCore[21]); } else if i == 22 { NotNonPostCleanup(pageRoutesCore[22]); } else if i == 23 { NotNonPostCleanup(pageRoutesCore[23]); } else if i == 24 { NotNonPostCleanup(pageRoutesCore[24]); }
  else if i == 25 { NotNonPostCleanup(pageRoutesCore[25]); } else if i == 26 { NotNonPostCleanup(pageRoutesCore[26]); } else if i == 27 { NotNonPostCleanup(pageRoutesCore[27]); } else if i == 28 { NotNonPostCleanup(pageRoutesCore[28]); } else if i == 29 { NotNonPostCleanup(pageRoutesCore[29]); }
  else { NotNonPostCleanup(pageRoutesCore[30]); }
}

lemma CoreNotCleanup(route: Route)
  requires route in pageRoutesCore
  ensures route.path == browserNotesCleanup ==> route.method_.Post?
{
  assert |pageRoutesCore| == 31;
  var i :| 0 <= i < 31 && pageRoutesCore[i] == route;
  if i < 15 { CoreNotCleanupA(i); } else { CoreNotCleanupB(i); }
}

lemma AppsNotCleanupA(i: int)
  requires 0 <= i < 15
  ensures pageRoutesApps[i].path == browserNotesCleanup ==> pageRoutesApps[i].method_.Post?
{
  if i == 0 { NotNonPostCleanup(pageRoutesApps[0]); } else if i == 1 { NotNonPostCleanup(pageRoutesApps[1]); } else if i == 2 { NotNonPostCleanup(pageRoutesApps[2]); } else if i == 3 { NotNonPostCleanup(pageRoutesApps[3]); } else if i == 4 { NotNonPostCleanup(pageRoutesApps[4]); }
  else if i == 5 { NotNonPostCleanup(pageRoutesApps[5]); } else if i == 6 { NotNonPostCleanup(pageRoutesApps[6]); } else if i == 7 { NotNonPostCleanup(pageRoutesApps[7]); } else if i == 8 { NotNonPostCleanup(pageRoutesApps[8]); } else if i == 9 { NotNonPostCleanup(pageRoutesApps[9]); }
  else if i == 10 { NotNonPostCleanup(pageRoutesApps[10]); } else if i == 11 { NotNonPostCleanup(pageRoutesApps[11]); } else if i == 12 { NotNonPostCleanup(pageRoutesApps[12]); } else if i == 13 { NotNonPostCleanup(pageRoutesApps[13]); } else { NotNonPostCleanup(pageRoutesApps[14]); }
}

lemma AppsNotCleanupB(i: int)
  requires 15 <= i < 31
  ensures pageRoutesApps[i].path == browserNotesCleanup ==> pageRoutesApps[i].method_.Post?
{
  if i == 15 { NotNonPostCleanup(pageRoutesApps[15]); } else if i == 16 { NotNonPostCleanup(pageRoutesApps[16]); } else if i == 17 { NotNonPostCleanup(pageRoutesApps[17]); } else if i == 18 { NotNonPostCleanup(pageRoutesApps[18]); } else if i == 19 { NotNonPostCleanup(pageRoutesApps[19]); }
  else if i == 20 { NotNonPostCleanup(pageRoutesApps[20]); } else if i == 21 { NotNonPostCleanup(pageRoutesApps[21]); } else if i == 22 { NotNonPostCleanup(pageRoutesApps[22]); } else if i == 23 { NotNonPostCleanup(pageRoutesApps[23]); } else if i == 24 { NotNonPostCleanup(pageRoutesApps[24]); }
  else if i == 25 { NotNonPostCleanup(pageRoutesApps[25]); } else if i == 26 { NotNonPostCleanup(pageRoutesApps[26]); } else if i == 27 { NotNonPostCleanup(pageRoutesApps[27]); } else if i == 28 { NotNonPostCleanup(pageRoutesApps[28]); } else if i == 29 { NotNonPostCleanup(pageRoutesApps[29]); }
  else { NotNonPostCleanup(pageRoutesApps[30]); }
}

lemma AppsNotCleanup(route: Route)
  requires route in pageRoutesApps
  ensures route.path == browserNotesCleanup ==> route.method_.Post?
{
  assert |pageRoutesApps| == 31;
  var i :| 0 <= i < 31 && pageRoutesApps[i] == route;
  if i < 15 { AppsNotCleanupA(i); } else { AppsNotCleanupB(i); }
}

lemma WorkflowsNotCleanupA(i: int)
  requires 0 <= i < 15
  ensures pageRoutesWorkflows[i].path == browserNotesCleanup ==> pageRoutesWorkflows[i].method_.Post?
{
  if i == 0 { NotNonPostCleanup(pageRoutesWorkflows[0]); } else if i == 1 { NotNonPostCleanup(pageRoutesWorkflows[1]); } else if i == 2 { NotNonPostCleanup(pageRoutesWorkflows[2]); } else if i == 3 { NotNonPostCleanup(pageRoutesWorkflows[3]); } else if i == 4 { NotNonPostCleanup(pageRoutesWorkflows[4]); }
  else if i == 5 { NotNonPostCleanup(pageRoutesWorkflows[5]); } else if i == 6 { NotNonPostCleanup(pageRoutesWorkflows[6]); } else if i == 7 { NotNonPostCleanup(pageRoutesWorkflows[7]); } else if i == 8 { NotNonPostCleanup(pageRoutesWorkflows[8]); } else if i == 9 { NotNonPostCleanup(pageRoutesWorkflows[9]); }
  else if i == 10 { NotNonPostCleanup(pageRoutesWorkflows[10]); } else if i == 11 { NotNonPostCleanup(pageRoutesWorkflows[11]); } else if i == 12 { NotNonPostCleanup(pageRoutesWorkflows[12]); } else if i == 13 { NotNonPostCleanup(pageRoutesWorkflows[13]); } else { NotNonPostCleanup(pageRoutesWorkflows[14]); }
}

lemma WorkflowsNotCleanupB(i: int)
  requires 15 <= i < 30
  ensures pageRoutesWorkflows[i].path == browserNotesCleanup ==> pageRoutesWorkflows[i].method_.Post?
{
  if i == 15 { NotNonPostCleanup(pageRoutesWorkflows[15]); } else if i == 16 { NotNonPostCleanup(pageRoutesWorkflows[16]); } else if i == 17 { NotNonPostCleanup(pageRoutesWorkflows[17]); } else if i == 18 { NotNonPostCleanup(pageRoutesWorkflows[18]); } else if i == 19 { NotNonPostCleanup(pageRoutesWorkflows[19]); }
  else if i == 20 { NotNonPostCleanup(pageRoutesWorkflows[20]); } else if i == 21 { NotNonPostCleanup(pageRoutesWorkflows[21]); } else if i == 22 { NotNonPostCleanup(pageRoutesWorkflows[22]); } else if i == 23 { NotNonPostCleanup(pageRoutesWorkflows[23]); } else if i == 24 { NotNonPostCleanup(pageRoutesWorkflows[24]); }
  else if i == 25 { NotNonPostCleanup(pageRoutesWorkflows[25]); } else if i == 26 { NotNonPostCleanup(pageRoutesWorkflows[26]); } else if i == 27 { NotNonPostCleanup(pageRoutesWorkflows[27]); } else if i == 28 { NotNonPostCleanup(pageRoutesWorkflows[28]); } else { NotNonPostCleanup(pageRoutesWorkflows[29]); }
}

lemma WorkflowsNotCleanup(route: Route)
  requires route in pageRoutesWorkflows
  ensures route.path == browserNotesCleanup ==> route.method_.Post?
{
  assert |pageRoutesWorkflows| == 30;
  var i :| 0 <= i < 30 && pageRoutesWorkflows[i] == route;
  if i < 15 { WorkflowsNotCleanupA(i); } else { WorkflowsNotCleanupB(i); }
}

lemma TasksWalletNotCleanupA(i: int)
  requires 0 <= i < 15
  ensures pageRoutesTasksWallet[i].path == browserNotesCleanup ==> pageRoutesTasksWallet[i].method_.Post?
{
  if i == 0 { NotNonPostCleanup(pageRoutesTasksWallet[0]); } else if i == 1 { NotNonPostCleanup(pageRoutesTasksWallet[1]); } else if i == 2 { NotNonPostCleanup(pageRoutesTasksWallet[2]); } else if i == 3 { NotNonPostCleanup(pageRoutesTasksWallet[3]); } else if i == 4 { NotNonPostCleanup(pageRoutesTasksWallet[4]); }
  else if i == 5 { NotNonPostCleanup(pageRoutesTasksWallet[5]); } else if i == 6 { NotNonPostCleanup(pageRoutesTasksWallet[6]); } else if i == 7 { NotNonPostCleanup(pageRoutesTasksWallet[7]); } else if i == 8 { NotNonPostCleanup(pageRoutesTasksWallet[8]); } else if i == 9 { NotNonPostCleanup(pageRoutesTasksWallet[9]); }
  else if i == 10 { NotNonPostCleanup(pageRoutesTasksWallet[10]); } else if i == 11 { NotNonPostCleanup(pageRoutesTasksWallet[11]); } else if i == 12 { NotNonPostCleanup(pageRoutesTasksWallet[12]); } else if i == 13 { NotNonPostCleanup(pageRoutesTasksWallet[13]); } else { NotNonPostCleanup(pageRoutesTasksWallet[14]); }
}

lemma TasksWalletNotCleanupB(i: int)
  requires 15 <= i < 30
  ensures pageRoutesTasksWallet[i].path == browserNotesCleanup ==> pageRoutesTasksWallet[i].method_.Post?
{
  if i == 15 { NotNonPostCleanup(pageRoutesTasksWallet[15]); } else if i == 16 { NotNonPostCleanup(pageRoutesTasksWallet[16]); } else if i == 17 { NotNonPostCleanup(pageRoutesTasksWallet[17]); } else if i == 18 { NotNonPostCleanup(pageRoutesTasksWallet[18]); } else if i == 19 { NotNonPostCleanup(pageRoutesTasksWallet[19]); }
  else if i == 20 { NotNonPostCleanup(pageRoutesTasksWallet[20]); } else if i == 21 { NotNonPostCleanup(pageRoutesTasksWallet[21]); } else if i == 22 { NotNonPostCleanup(pageRoutesTasksWallet[22]); } else if i == 23 { NotNonPostCleanup(pageRoutesTasksWallet[23]); } else if i == 24 { NotNonPostCleanup(pageRoutesTasksWallet[24]); }
  else if i == 25 { NotNonPostCleanup(pageRoutesTasksWallet[25]); } else if i == 26 { NotNonPostCleanup(pageRoutesTasksWallet[26]); } else if i == 27 { NotNonPostCleanup(pageRoutesTasksWallet[27]); } else if i == 28 { NotNonPostCleanup(pageRoutesTasksWallet[28]); } else { NotNonPostCleanup(pageRoutesTasksWallet[29]); }
}

lemma TasksWalletNotCleanup(route: Route)
  requires route in pageRoutesTasksWallet
  ensures route.path == browserNotesCleanup ==> route.method_.Post?
{
  assert |pageRoutesTasksWallet| == 30;
  var i :| 0 <= i < 30 && pageRoutesTasksWallet[i] == route;
  if i < 15 { TasksWalletNotCleanupA(i); } else { TasksWalletNotCleanupB(i); }
}

lemma lawBrowserNotesCleanupIsOnThePage_ensures(method_: Method)
  ensures (lawBrowserNotesCleanupIsOnThePage(method_) == true)
{
  var r := Route(method_, browserNotesCleanup, false);
  if method_.Post? {
    assert pageRoutesWorkflows[11] == r;
    assert r in pageRoutesWorkflows;
    assert r in concatRoutes(pageRoutesWorkflows, pageRoutesTasksWallet);
    assert r in pageRoutes;
  } else if r in pageRoutes {
    if r in pageRoutesCore { CoreNotCleanup(r); }
    else if r in pageRoutesApps { AppsNotCleanup(r); }
    else if r in pageRoutesWorkflows { WorkflowsNotCleanup(r); }
    else { TasksWalletNotCleanup(r); }
  }
}
