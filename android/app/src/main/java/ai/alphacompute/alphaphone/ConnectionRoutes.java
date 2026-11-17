package ai.alphacompute.alphaphone;

import ai.eliza.plugins.agent.connection.CloudConnectionPolicy;

/**
 * Alpha's renderer transport route policy: the shared plugin-native-agent CloudConnectionPolicy with Alpha's
 * Eliza Cloud deployment hosts (CloudDeployment, generated from scripts/cloud-deployment-policy.ts) and Google consent as
 * the one external provider. A flag-off build contacts only https://api.eliza.app; a dedicated Cloud agent runtime
 * and a paired remote agent are refused from the URL alone (P-22/P-31, #406). Native Eliza Cloud sign-in sends its
 * fixed routes only through the shared sign-in client (ai.eliza.auth.cloud.CloudSignInRoutes, registered by
 * AlphaCloudSignInPlugin); this transport admits none of them, nor the Cloud sign-in hand-off.
 */
final class ConnectionRoutes {
 private ConnectionRoutes() {}
 /** The hosted invoice an upgrade that needs payment action answers (Stripe's invoice page only). */
 static final String STRIPE_INVOICE_HOST="invoice.stripe.com";
 /**
  * The external hosts this build opens: Google consent always; with the Alpha Cloud cutover
  * (CloudDeployment.ALPHA_CLOUD_CUTOVER) also the Stripe pages an in-app checkout or plan upgrade
  * answers (cloud-plans.ts). Without it the current Cloud's hosted billing page is the only billing surface.
  */
 static CloudConnectionPolicy policy(boolean alphaCloud){
  return new CloudConnectionPolicy(new CloudConnectionPolicy.Hosts(
   CloudDeployment.PRODUCTION_API_HOST,CloudDeployment.STAGING_API_HOST,CloudDeployment.PRODUCTION_WEB_HOST,CloudDeployment.STAGING_WEB_HOST,
   CloudDeployment.PRODUCTION_SERVICES_HOST,CloudDeployment.STAGING_SERVICES_HOST,
   alphaCloud?java.util.Set.of("accounts.google.com",CloudConnectionPolicy.SUBSCRIPTION_CHECKOUT_HOST,STRIPE_INVOICE_HOST):java.util.Collections.singleton("accounts.google.com")));
 }
 private static final CloudConnectionPolicy CURRENT_CLOUD=policy(false),ALPHA_CLOUD=policy(true);
 static final CloudConnectionPolicy POLICY=CloudDeployment.ALPHA_CLOUD_CUTOVER?ALPHA_CLOUD:CURRENT_CLOUD;
 /** Referral read and apply with the device's own key (Alpha Cloud manages referrals in the app). */
 static boolean referral(String path,String query,String method,boolean hasBody){
  if(query!=null)return false;
  if("/api/v1/referrals".equals(path))return "GET".equals(method)&&!hasBody;
  return "/api/v1/referrals/apply".equals(path)&&"POST".equals(method)&&hasBody;
 }
 static boolean retiredPairing(String decodedPath){return POLICY.retiredPairing(decodedPath,false);}
 static boolean admittedOrigin(String scheme,String host,int port){return POLICY.admittedOrigin(scheme,host,port,false);}
 /**
  * The Cloud sign-in hand-off (/api/auth/cli-session and its poll) is refused (AP-03, #734): Alpha signs in
  * through the native host, so it refuses the hand-off ahead of the shared route set.
  */
 static boolean cloudSignInHandOff(String path){return path!=null&&("/api/auth/cli-session".equals(path)||path.startsWith("/api/auth/cli-session/"));}
 static boolean managedService(String path,String query,String method,boolean hasBody){return managedService(path,query,method,hasBody,CloudDeployment.ALPHA_CLOUD_CUTOVER);}
 /**
  * The in-app plan routes the device key uses (the plan catalogue, checkout and its confirmation, which the shared
  * route set admits, and referrals) exist only with the Alpha Cloud cutover. Without it they are refused here.
  */
 static boolean inAppPlanRoute(String path){
  return CloudConnectionPolicy.SUBSCRIPTION_PLANS_PATH.equals(path)||"/api/v1/subscriptions/checkout".equals(path)||"/api/v1/subscriptions/checkout/confirm".equals(path)
   ||"/api/v1/referrals".equals(path)||"/api/v1/referrals/apply".equals(path);
 }
 static boolean managedService(String path,String query,String method,boolean hasBody,boolean alphaCloud){
  if(cloudSignInHandOff(path)||!alphaCloud&&inAppPlanRoute(path))return false;
  return POLICY.managedService(path,query,method,hasBody,false)||alphaCloud&&referral(path,query,method,hasBody);
 }
 static boolean calendarSync(String path,String query,String method,boolean hasBody){return CloudConnectionPolicy.calendarSync(path,query,method,hasBody);}
 static boolean externalHost(String scheme,String host,int port){return POLICY.externalHost(scheme,host,port,false);}
 static boolean externalHost(String scheme,String host,int port,boolean alphaCloud){return (alphaCloud?ALPHA_CLOUD:CURRENT_CLOUD).externalHost(scheme,host,port,false);}
 static boolean externalCliLogin(String host,String path){return POLICY.externalCliLogin(host,path,false);}
 static boolean admittedHeader(String name){return CloudConnectionPolicy.admittedHeader(name,false);}
 static boolean mapsRequestIdentity(String name,String value,String path,String method){return CloudConnectionPolicy.mapsRequestIdentity(name,value,path,method);}
 /**
  * Syntax-only bound on a declared device capability list (test-mocks remote and development Cloud agents). The agent
  * validates the header itself (device-action-routes) and the value carries no authority, so any well-formed name passes,
  * as on the resident path; a value allowlist here only drifted from what the renderer negotiates.
  */
 static boolean deviceCapabilities(String value){
  if(value==null||value.isEmpty()||value.length()>2048)return false;
  String[] parts=value.split(",",-1);
  if(parts.length>32)return false;
  for(String part:parts)if(!part.trim().matches("[a-z0-9][a-z0-9.-]{0,63}"))return false;
  return true;
 }
 static boolean cloudSelfRevocation(String scheme,String host,int port,String rawPath,String rawQuery,String method,boolean hasBody){return POLICY.cloudSelfRevocation(scheme,host,port,rawPath,rawQuery,method,hasBody,false);}
}
