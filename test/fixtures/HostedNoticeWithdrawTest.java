package ai.elizaresearch.alphaphone;
import org.json.*;
import java.util.*;
public final class HostedNoticeWithdrawTest {
 static void require(boolean value,String message){if(!value)throw new AssertionError(message);}
 public static void main(String[] args)throws Exception {
  Map<String,String> slots=new HashMap<>();List<String> cancelled=new ArrayList<>();Map<String,Boolean> posted=new LinkedHashMap<>();Set<String> active=new HashSet<>();
  HostedResultNotices.Storage storage=new HostedResultNotices.Storage(){public String read(String slot){return slots.get(slot);}public void write(String slot,String value){slots.put(slot,value);}};
  HostedResultNotices.Poster poster=new HostedResultNotices.Poster(){public boolean allowed(){return true;}public boolean active(String key){return active.contains(key);}public void post(String key){post(key,false);}public void post(String key,boolean silent){posted.put(key,silent);active.add(key);}public void cancel(String key){cancelled.add(key);active.remove(key);}};
  HostedResultNotices notices=new HostedResultNotices(storage,poster);
  String origin="https://agent.invalid",scope=HostedResultNotices.hash(new JSONArray().put(origin).put("owner").put("agent").toString()),slot="hosted-digests:v1:"+scope;
  JSONArray ids=new JSONArray();
  java.util.function.BiFunction<String,String,JSONObject> retain=(run,workflow)->{try{ids.put(run);slots.put(slot,new JSONObject().put("ids",ids).toString());slots.put(slot+":"+run,new JSONObject().put("runId",run).put("workflowId",workflow).put("workflowVersionId","v1").toString());return new JSONObject().put("scope",scope).put("origin",origin).put("ownerId","owner").put("agentId","agent").put("runId",run).put("workflowId",workflow).put("workflowVersionId","v1");}catch(JSONException e){throw new RuntimeException(e);}};
  java.util.function.Function<String,String> phase=key->new JSONObject(slots.get(HostedResultNotices.LEDGER)).getJSONObject(key).getString("phase");
  String morning=HostedResultNotices.hash(scope+":run-morning"),evening=HostedResultNotices.hash(scope+":run-evening"),later=HostedResultNotices.hash(scope+":run-later");
  require("posted".equals(notices.publish(retain.apply("run-morning","morning-loop")))&&!posted.get(morning),"a closed panel alerts");
  notices.withdraw(scope,"run-morning");
  require(cancelled.equals(List.of(morning))&&!active.contains(morning)&&"seen".equals(phase.apply(morning)),"withdraw marks the record seen and cancels by key");
  require("seen".equals(notices.publish(retain.apply("run-morning","morning-loop")))&&posted.size()==1,"a seen result is never reposted");
  require("posted".equals(notices.publish(retain.apply("run-evening","evening-loop"))),"second loop posts");
  notices.capture(evening);String token=notices.peek().getString("token");
  notices.withdraw(scope,"run-evening");
  require(!active.contains(evening)&&token.equals(notices.peek().getString("token")),"withdraw keeps a pending tap");
  notices.consume(token);require(notices.peek().length()==0&&"opened".equals(phase.apply(evening)),"the kept tap still opens");
  int before=cancelled.size();notices.withdraw(scope,"run-unknown");require(cancelled.size()==before,"an unknown run changes nothing");
  try{notices.withdraw("not-a-scope","run-morning");throw new AssertionError("bad scope accepted");}catch(IllegalArgumentException expected){}
  notices.panel(scope);
  require("posted".equals(notices.publish(retain.apply("run-later","later-loop")))&&posted.get(later),"publish while the panel shows this scope is silent");
  notices.panel(null);String next=HostedResultNotices.hash(scope+":run-next");
  require("posted".equals(notices.publish(retain.apply("run-next","next-loop")))&&!posted.get(next),"a paused or closed panel alerts again");
  notices.panel(HostedResultNotices.hash("other"));String other=HostedResultNotices.hash(scope+":run-other");
  require("posted".equals(notices.publish(retain.apply("run-other","other-loop")))&&!posted.get(other),"another scope's open panel does not silence this one");
  System.out.println("PASS hosted notice withdraw: seen by key, pending tap kept, silent while the panel is open");
 }
}
