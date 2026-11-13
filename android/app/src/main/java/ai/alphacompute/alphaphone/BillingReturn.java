package ai.alphacompute.alphaphone;

import java.net.URI;

/**
 * Pure admission of the subscription checkout's return link. Eliza Cloud derives the address from
 * the registered sign-in callback (`/auth/callback` replaced by `/billing/return`), so it arrives on
 * the build's verified App Link host (ELIZAOS_APP_LINK_HOST) as
 * {@code ?session_id=cs_...&result=success} or {@code ?result=cancel}. The link is an identifier,
 * never payment evidence: the renderer confirms the session with Cloud, which reads the payment
 * from the provider, and only for a checkout this phone recorded.
 */
final class BillingReturn {
 static final String PATH="/alphaphone/billing/return";
 private BillingReturn() {}

 static final class Result {
  /** "success" or "cancel". */
  final String result;
  /** The checkout session of a success; null for a cancel. */
  final String sessionId;
  Result(String result,String sessionId){this.result=result;this.sessionId=sessionId;}
 }

 /** The exact return on host, or null for anything else (another host, path, port, fragment, field or shape). */
 static Result parse(String host,String value) {
  if(host==null||host.isEmpty()||value==null||value.length()>512)return null;
  try {
   URI uri=new URI(value);
   if(!"https".equals(uri.getScheme())||!host.equals(uri.getHost())||uri.getPort()!=-1||uri.getRawUserInfo()!=null
     ||!PATH.equals(uri.getRawPath())||uri.getRawFragment()!=null||uri.getRawQuery()==null)return null;
   String result=null,sessionId=null;int fields=0;
   for(String part:uri.getRawQuery().split("&",-1)) {
    int equal=part.indexOf('=');if(equal<=0||equal!=part.lastIndexOf('='))return null;
    String key=part.substring(0,equal),text=part.substring(equal+1);fields++;
    if(key.equals("result")){if(result!=null)return null;result=text;}
    else if(key.equals("session_id")){if(sessionId!=null)return null;sessionId=text;}
    else return null;
   }
   if("cancel".equals(result))return fields==1?new Result("cancel",null):null;
   if(!"success".equals(result)||fields!=2||sessionId==null||!sessionId.matches("cs_(test|live)_[A-Za-z0-9]{1,200}"))return null;
   return new Result("success",sessionId);
  }catch(Exception invalid){return null;}
 }
}
