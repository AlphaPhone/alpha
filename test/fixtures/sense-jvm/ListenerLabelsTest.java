package ai.alphacompute.alphaphone.sense;

import ai.eliza.sense.ListenerPolicy.State;
import java.util.HashSet;
import java.util.Set;

/** Alpha's listener state text: one lock-screen-safe label per shared state (ported from ListenerPolicyTest's label check). */
public final class ListenerLabelsTest {
 static void check(boolean value,String why){if(!value)throw new AssertionError(why);}
 public static void main(String[] args){
  Set<String> seen=new HashSet<>();
  for(State state:State.values()){
   String label=ListenerLabels.label(state);
   check(label!=null&&!label.isEmpty()&&label.length()<64,"lock-screen-safe label: "+state);
   check(!label.contains("\n")&&label.equals(label.trim()),"single line: "+state);
   check(seen.add(label),"distinct label: "+state);
  }
  check("Listening".equals(ListenerLabels.label(State.LISTENING)),"listening");
  check("Listening is off".equals(ListenerLabels.label(State.OFF)),"off");
  System.out.println("PASS Alpha listener labels ("+seen.size()+" states)");
 }
}
