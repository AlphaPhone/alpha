package ai.alphacompute.alphaphone;

import android.content.Context;
import android.os.Process;
import android.os.SystemClock;
import android.system.Os;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.*;
import org.json.*;
import static org.junit.Assert.*;

/** Hashing, process and owner checks shared by the resident service and workflow crash tests. */
final class ResidentTestFixture {
 private ResidentTestFixture(){}
 static String hash(byte[] bytes){return AlphaUtil.sha256Hex(bytes);}
 static byte[] bounded(InputStream input,int max)throws Exception {ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[8192];int n;while((n=input.read(buf))!=-1){assertTrue("Input exceeds bound",out.size()+n<=max);out.write(buf,0,n);}return out.toByteArray();}
 static String boundedHash(InputStream input,long max)throws Exception {
  MessageDigest digest=AlphaUtil.sha256();byte[] buffer=new byte[65536];long total=0;int count;
  while((count=input.read(buffer))!=-1){assertTrue("Input exceeds bound",count<=max-total);total+=count;digest.update(buffer,0,count);}
  return AlphaUtil.hex(digest.digest());
 }
 static String fileHash(File file)throws Exception {try(InputStream in=new FileInputStream(file)){return AlphaUtil.sha256Hex(in);}}
 static String readUtf8(File file)throws IOException {return new String(Files.readAllBytes(file.toPath()),StandardCharsets.UTF_8);}
 /** Writes value as UTF-8, syncs it and makes it owner-only. */
 static void writePrivate(File file,String value)throws Exception {try(FileOutputStream out=new FileOutputStream(file)){out.write(value.getBytes(StandardCharsets.UTF_8));out.getFD().sync();}Os.chmod(file.getPath(),0600);}
 static JSONObject nativeGet(String path,String bearer)throws Exception {
  JSONObject headers=new JSONObject();if(bearer!=null)headers.put("Authorization","Bearer "+bearer);
  return new JSONObject(ElizaAgentService.requestLocalAgent(new JSONObject().put("path",path).put("method","GET").put("headers",headers).put("timeoutMs",10000).toString()));
 }
 static String processStart(int pid)throws Exception {String stat=new String(Files.readAllBytes(new File("/proc/"+pid+"/stat").toPath()),StandardCharsets.UTF_8);String[] columns=stat.substring(stat.lastIndexOf(')')+2).split(" ");return columns[19];}
 /** The one process of this UID running the packaged bundle with the fixture's executable hash. */
 static JSONObject ownedChild(Context context,String executableSha256)throws Exception {
  List<JSONObject> matches=new ArrayList<>();File[] processes=new File("/proc").listFiles();assertNotNull(processes);
  String bundle=new File(context.getFilesDir(),"agent/agent-bundle.js").getCanonicalPath();
  for(File proc:processes){if(!proc.getName().matches("[0-9]+"))continue;
   try {if(Os.stat(proc.getPath()).st_uid!=Process.myUid())continue;
    String command=new String(Files.readAllBytes(new File(proc,"cmdline").toPath()),StandardCharsets.UTF_8);
    if(!Arrays.asList(command.split(String.valueOf((char)0))).contains(bundle))continue;
    String executable=Os.readlink(new File(proc,"exe").getPath());
    if(!fileHash(new File(executable)).equals(executableSha256))continue;
    int pid=Integer.parseInt(proc.getName());matches.add(new JSONObject().put("pid",pid).put("start",processStart(pid)).put("uid",Process.myUid()).put("executableSha256",executableSha256));
   } catch(IOException|android.system.ErrnoException raced) { /* Other processes may exit during observation. */ }
  }
  assertEquals("Require exactly one verified native runtime process",1,matches.size());return matches.get(0);
 }
 static void stopped(Context context,JSONObject child)throws Exception {
  long end=SystemClock.elapsedRealtime()+30000;
  while(SystemClock.elapsedRealtime()<end){boolean gone=child==null||!new File("/proc/"+child.getInt("pid")).exists();if(!gone)try{gone=!processStart(child.getInt("pid")).equals(child.getString("start"));}catch(IOException raced){gone=true;}
   JSONObject status=ElizaAgentService.getLocalAgentBootState(context);if(gone&&!status.optBoolean("socketListening")&&!status.optBoolean("serviceActive"))return;SystemClock.sleep(100);}
  fail("Resident process/socket did not stop within 30s");
 }
 /** Checks an /api/auth/me reply is the owner on this bearer, and masks the session id. */
 static JSONObject owner(JSONObject who,String bearer)throws Exception {assertEquals("owner",who.getJSONObject("identity").getString("kind"));assertEquals("OWNER",who.getJSONObject("access").getString("role"));assertTrue("Native owner session mismatch",bearer.equals(who.getJSONObject("session").getString("id")));who.getJSONObject("session").put("id","native-service-session");return who;}
 /** The single running agent in an /api/agents reply. */
 static JSONObject agent(JSONObject reply)throws Exception {JSONArray agents=reply.getJSONArray("agents");assertEquals(1,agents.length());JSONObject agent=agents.getJSONObject(0);assertEquals("running",agent.getString("status"));return agent;}
}
