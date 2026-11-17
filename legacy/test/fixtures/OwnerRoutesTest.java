package ai.alphacompute.alphaphone;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Scanner;
import org.json.JSONArray;
import org.json.JSONObject;

/** Executes the whole native request gate with the product's real serialized table. */
public final class OwnerRoutesTest {
 public static void main(String[] args) {
  JSONObject input=new JSONObject(new Scanner(System.in,"UTF-8").useDelimiter("\\A").next());
  String table=input.getString("table");
  if(input.optBoolean("refuseTable")) {
   try { OwnerRoutes.shipped(name->new ByteArrayInputStream(table.getBytes(StandardCharsets.UTF_8))); }
   catch(IllegalStateException expected) { System.out.println("refused table"); return; }
   throw new AssertionError("Invalid table loaded");
  }
  OwnerRoutes routes=OwnerRoutes.shipped(name->{
   if(!OwnerRoutes.ASSET.equals(name))throw new AssertionError("Unexpected asset "+name);
   return new ByteArrayInputStream(table.getBytes(StandardCharsets.UTF_8));
  });
  JSONArray results=new JSONArray(),cases=input.getJSONArray("cases");
  for(int i=0;i<cases.length();i++) {
   JSONObject item=cases.getJSONObject(i);
   String path=item.isNull("path")?null:item.getString("path");
   String method=item.isNull("method")?null:item.getString("method");
   String owner=item.isNull("owner")?null:item.getString("owner");
   String body=item.has("body")?item.getString("body"):item.has("repeat")?item.getString("repeat").repeat(item.getInt("count")):null;
   boolean actual=routes.requestAllowed(path,method,body,owner);
   if(actual!=item.getBoolean("expected"))throw new AssertionError(item.getString("name")+": expected "+item.getBoolean("expected")+" got "+actual);
   String group=routes.group(path);
   JSONObject result=new JSONObject().put("name",item.getString("name")).put("allowed",actual)
    .put("group",group==null?JSONObject.NULL:group).put("limit",OwnerRoutes.requestBodyLimit(path,method));
   if(group!=null)result.put("policyAllowed",routes.allowed(group,path,method));
   results.put(result);
  }
  System.out.println(new JSONObject().put("results",results));
 }
}
