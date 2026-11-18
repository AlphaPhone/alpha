import {useEffect,useRef,useState,type ReactElement} from 'react';
import {devSurfacesEnabled} from '../build-flags';
import {openDomainRecovery} from './domain-recovery';
import {readDevelopmentCloudAccount,developmentAccountRecovery,developmentCloudAccount,selectDevelopmentCloud,type DevelopmentAccount} from './development-account-document';
// Development-server-only account fixture; flag-off builds fold it to an empty component.
export const DevelopmentCloudAccountFixture:()=>ReactElement|null=devSurfacesEnabled?DevelopmentCloudFixture:()=>null;
function DevelopmentCloudFixture(){
 const [account,setAccount]=useState<ReturnType<typeof developmentCloudAccount>>(null),[choice,setChoice]=useState<DevelopmentAccount>('first'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const pending=useRef<AbortController|null>(null),generation=useRef(0),recovery=useRef<AbortController|null>(null);
 const retire=()=>{recovery.current?.abort();generation.current++;pending.current?.abort();pending.current=null;setBusy(false);};
 useEffect(()=>{
  const lifetime=new AbortController();
  const load=async()=>{const token=generation.current;setReady(false);setAccount(null);try{const saved=await readDevelopmentCloudAccount(lifetime.signal);if(lifetime.signal.aborted||token!==generation.current)return;setAccount(saved);setReady(true);setError('');if(saved)setChoice(saved.account);}catch(e){if(!lifetime.signal.aborted&&token===generation.current)setError((e as Error).message);}};
  const changed=()=>{retire();void load();};
  const hidden=()=>{if(document.hidden)retire();};window.addEventListener('alpha:development-account-invalidated',changed);document.addEventListener('visibilitychange',hidden);void load();
  return()=>{lifetime.abort();recovery.current?.abort();generation.current++;pending.current?.abort();window.removeEventListener('alpha:development-account-invalidated',changed);document.removeEventListener('visibilitychange',hidden);};
 },[]);
 async function work(run:(signal:AbortSignal)=>Promise<void>){if(pending.current)return;const controller=new AbortController(),token=generation.current;pending.current=controller;setBusy(true);setError('');try{await run(controller.signal);}catch(e){if(!controller.signal.aborted&&token===generation.current)setError((e as Error).message);}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section aria-label="Development Cloud account"><h2>Development Cloud account</h2><label>Sample account<select aria-label="Sample account" value={choice} disabled={busy||!ready} onChange={e=>setChoice(e.target.value as DevelopmentAccount)}><option value="first">First account</option><option value="second">Second account</option></select></label><button disabled={busy||!ready} onClick={()=>void work(async signal=>{const selected=await selectDevelopmentCloud(choice,signal);signal.throwIfAborted();setAccount(selected);})}>Use development account</button><button disabled={busy} onClick={()=>{retire();const controller=recovery.current=new AbortController();openDomainRecovery(developmentAccountRecovery,'Cloud account','Development Cloud account recovery','Download the saved sample account selection before resetting. Reset signs out development Cloud selection; it does not delete conversations or real provider credentials.',controller.signal);}}>Cloud account recovery</button>
 {account&&<><p>Connected development account: {account.account}</p><button disabled={busy} onClick={()=>void work(async signal=>{await selectDevelopmentCloud(null,signal);signal.throwIfAborted();setAccount(null);})}>Sign out development account</button></>}
 {busy&&<button onClick={()=>{retire();}}>Cancel development setup</button>}{error&&<p role="alert">{error}</p>}
 </section>;
}
