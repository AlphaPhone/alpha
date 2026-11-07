package ai.elizaresearch.alphaphone;

import java.util.Set;

/** Host-JVM check of the renderer recovery budget and escape decision. Not Android evidence. */
public final class RendererRecoveryBudgetTest {
 private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
 private static final RendererRecoveryBudget.Action NOW=RendererRecoveryBudget.Action.RECREATE_NOW,
  LATER=RendererRecoveryBudget.Action.RECREATE_AFTER_BACKOFF,ESCAPE=RendererRecoveryBudget.Action.SHOW_ESCAPE;
 public static void main(String[] args){
  // Standalone (not HOME): three immediate recoveries, then a 5 s backoff inside the window.
  RendererRecoveryBudget budget=new RendererRecoveryBudget();
  long t=1_000L;
  for(int loss=1;loss<=3;loss++)check(budget.onLoss(t+loss*1_000L,false)==NOW,"loss "+loss+" recreates at once");
  check(budget.onLoss(t+4_000L,false)==LATER,"the fourth loss in the window backs off");
  check(RendererRecoveryBudget.delay(LATER)==5_000L&&RendererRecoveryBudget.delay(NOW)==0L,"backoff is 5 s");
  check(budget.onLoss(t+59_000L,false)==LATER,"still inside the 60 s window");
  // The window runs from its first loss; a loss after it starts a new budget.
  check(budget.onLoss(t+1_000L+60_001L,false)==NOW,"after the window the budget resets");
  check(budget.onLoss(t+62_000L,false)==NOW&&budget.onLoss(t+63_000L,false)==NOW,"a fresh window has three immediate recoveries");
  check(budget.onLoss(t+64_000L,false)==LATER,"and then backs off again");
  // Clock zero is a valid start (elapsed realtime early in boot).
  RendererRecoveryBudget early=new RendererRecoveryBudget();
  for(int loss=0;loss<3;loss++)check(early.onLoss(loss,false)==NOW,"a window may start at time zero");
  check(early.onLoss(3,false)==LATER,"and is counted from there");
  // HOME: the fourth loss inside the window shows the native escape view instead of recreating.
  RendererRecoveryBudget home=new RendererRecoveryBudget();
  for(int loss=1;loss<=3;loss++)check(home.onLoss(loss*100L,true)==NOW,"HOME loss "+loss+" recreates at once");
  check(home.onLoss(400L,true)==ESCAPE,"N=4 losses inside the window while HOME show the escape view");
  check(home.onLoss(500L,true)==ESCAPE,"Reload that dies again inside the window shows it again, never a loop");
  check(RendererRecoveryBudget.delay(ESCAPE)==0L,"the escape view does not schedule a recreate");
  check(home.onLoss(100L+60_001L,true)==NOW,"a loss after the window recreates again");
  // Three losses spread beyond the window never reach the escape view.
  RendererRecoveryBudget spread=new RendererRecoveryBudget();
  for(int loss=0;loss<8;loss++)check(spread.onLoss(loss*61_000L,true)==NOW,"spread losses recover at once");
  // Crash vs system reclaim, visible vs background. A reclaim in the background is never counted:
  // any number of them leaves the full budget, and each waits for the next onStart.
  RendererRecoveryBudget.Action START=RendererRecoveryBudget.Action.REBUILD_ON_START;
  RendererRecoveryBudget reclaim=new RendererRecoveryBudget();
  for(int loss=1;loss<=10;loss++)check(reclaim.onLoss(loss*100L,true,false,false)==START,"background reclaim "+loss+" waits for onStart");
  check(RendererRecoveryBudget.delay(START)==0L,"no timed recreate for a background loss");
  for(int loss=1;loss<=3;loss++)check(reclaim.onLoss(1_000L+loss,true,true,true)==NOW,"background reclaims left the budget whole");
  check(reclaim.onLoss(1_004L,true,true,true)==ESCAPE,"visible crashes past the budget while HOME show the escape view");
  // A reclaim while visible counts like a crash.
  RendererRecoveryBudget visibleReclaim=new RendererRecoveryBudget();
  for(int loss=1;loss<=3;loss++)check(visibleReclaim.onLoss(loss,false,false,true)==NOW,"visible reclaim "+loss+" recreates at once");
  check(visibleReclaim.onLoss(4L,false,false,true)==LATER,"a visible reclaim past the budget backs off when not HOME");
  // A crash in the background counts but rebuilds at onStart, unless it is past the budget while HOME.
  RendererRecoveryBudget hidden=new RendererRecoveryBudget();
  for(int loss=1;loss<=3;loss++)check(hidden.onLoss(loss,true,true,false)==START,"background crash "+loss+" rebuilds at onStart");
  check(hidden.onLoss(4L,false,true,false)==START,"past the budget, not HOME: still rebuilt at onStart");
  check(hidden.onLoss(5L,true,true,false)==ESCAPE,"past the budget while HOME: the escape view, counted");
  // Not HOME (another app holds the role): never the escape view, only the backoff.
  RendererRecoveryBudget notHome=new RendererRecoveryBudget();
  for(int loss=1;loss<=3;loss++)notHome.onLoss(loss,false,true,true);
  check(notHome.onLoss(4L,false,true,true)==LATER&&notHome.onLoss(5L,false,true,true)==LATER,"not HOME backs off instead of the escape view");
  // Buttons resolve to stock Settings activities, with the documented fallbacks.
  Set<String> all=Set.of("android.settings.SETTINGS","android.settings.HOME_SETTINGS","android.settings.MANAGE_DEFAULT_APPS_SETTINGS");
  check("android.settings.SETTINGS".equals(RendererRecoveryBudget.settingsAction(all::contains)),"Open Android Settings uses ACTION_SETTINGS");
  check("android.settings.HOME_SETTINGS".equals(RendererRecoveryBudget.homeChoiceAction(all::contains)),"Choose Home app prefers ACTION_HOME_SETTINGS");
  Set<String> noHome=Set.of("android.settings.SETTINGS","android.settings.MANAGE_DEFAULT_APPS_SETTINGS");
  check("android.settings.MANAGE_DEFAULT_APPS_SETTINGS".equals(RendererRecoveryBudget.homeChoiceAction(noHome::contains)),"then default apps");
  Set<String> settingsOnly=Set.of("android.settings.SETTINGS");
  check("android.settings.SETTINGS".equals(RendererRecoveryBudget.homeChoiceAction(settingsOnly::contains)),"then Settings itself");
  check(RendererRecoveryBudget.homeChoiceAction(action->false)==null&&RendererRecoveryBudget.settingsAction(action->false)==null,"no stock handler shows no button");
  System.out.println("PASS renderer recovery budget");
 }
}
