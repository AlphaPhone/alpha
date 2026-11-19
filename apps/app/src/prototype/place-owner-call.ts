import type {AospTelephony} from '../runtime/aosp-telephony';
import {callResultText,handoffResultText} from '../ui/telephony/telephony-messages';

/** A direct user tap uses Telecom. A known role or permission refusal can open the system dialer. */
export async function placeOwnerCall(client:AospTelephony,number:string,current:()=>boolean){
 try{
  const result=await client.placeCall(number);
  if(result.status==='placed')return {placed:true,notice:''};
  return {placed:false,notice:callResultText(result)};
 }catch(error){
  const code=(error as {code?:string})?.code;
  if(current()&&(code==='role-required'||code==='permission-required')){
   try{return {placed:false,notice:handoffResultText(await client.dial(number))};}
   catch{return {placed:false,notice:'Couldn’t open'};}
  }
  return {placed:false,notice:'Call unconfirmed'};
 }
}
