import {productionCloud, stagingCloud as stagingAuthority} from './cloud-deployment.generated.ts';
// Staging exists only in test-mocks builds, development serving and Node contract tests (no Vite).
// The condition is written out here, not imported: Vite replaces import.meta.env before the bundler
// links modules, so a product build drops this module's staging import whichever chunk holds it.
const stagingCloud=import.meta.env===undefined||import.meta.env.VITE_ELIZA_DEV_ALLOW_TEST_MOCKS==='1'||import.meta.env.DEV===true?stagingAuthority:undefined;
/** Official managed Google consent only; never an arbitrary external-browser URL. */
export function googleAuthorizationUrlAllowed(value:string):boolean {
 try {
  const url=new URL(value);
  if(url.origin!=='https://accounts.google.com'||url.username||url.password||url.hash||url.port||!['/o/oauth2/v2/auth','/o/oauth2/auth'].includes(url.pathname))return false;
  const params=url.searchParams;
  if([...params.keys()].length>16||new Set(params.keys()).size!==[...params.keys()].length)return false;
  if(params.get('response_type')!=='code'||!params.get('client_id')||!params.get('state')||params.get('state')!.length>4096)return false;
  const callback=new URL(params.get('redirect_uri')||'');
  const callbackOrigins=[productionCloud.api,productionCloud.web,`https://${productionCloud.agents}`,...(stagingCloud?[stagingCloud.api,stagingCloud.web,`https://${stagingCloud.agents}`]:[])];
  if(!callbackOrigins.includes(callback.origin)||callback.username||callback.password||callback.port||callback.hash||callback.search||callback.pathname!=='/api/v1/oauth/google/callback')return false;
  const allowed=new Set(['openid','email','profile','https://www.googleapis.com/auth/userinfo.email','https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/gmail.compose','https://www.googleapis.com/auth/gmail.modify','https://www.googleapis.com/auth/calendar.readonly','https://www.googleapis.com/auth/calendar.events']);
  const scopes=(params.get('scope')||'').split(/\s+/).filter(Boolean);
  return scopes.length>0&&scopes.every(scope=>allowed.has(scope));
 }catch{return false;}
}
