import {expect,type JSHandle,type Page} from '@playwright/test';

export async function openConnectionDiagnostics(page:Page){
 let controller:JSHandle<any>|undefined,finished=false;
 try{
  await expect.poll(async()=>{
   const current=controller??await page.evaluateHandle(async()=>{
    const {connectionController}=await import('/src/runtime/connection-ui.tsx');
    return connectionController;
   });
   if(finished){await current.dispose();return false;}
   controller=current;
   return current.evaluate(value=>value.getSnapshot().startupResolved);
  },{timeout:15_000}).toBe(true);
  await controller!.evaluate(value=>value.open());
 }finally{finished=true;await controller?.dispose();}
}
