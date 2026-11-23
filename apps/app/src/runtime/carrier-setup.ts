/** Carrier identifiers live only in this foreground session, outside shell state, storage,
 * diagnostics and agent observations. This module never starts a read on navigation or resume. */
export type CarrierField = {status:'available'|'permission-denied'|'unavailable'|'unsupported'|'not-read';value?:string};
export type CarrierSetup = {
 status:'ready';aospImage:boolean;canChooseSms:boolean;smsRole:CarrierField;dialerRole:CarrierField;modemCount:CarrierField;eid:CarrierField;
 hardware:Record<'manufacturer'|'model'|'device'|'android'|'baseband',CarrierField>;
 slots:Array<{slotIndex:number;imei:CarrierField;simState:CarrierField}>;
 subscriptions:{status:CarrierField['status'];items:Array<{subscriptionId:number;slotIndex:number;embedded:boolean;defaultData:boolean;carrier:CarrierField;name:CarrierField;iccid:CarrierField;operator:CarrierField;operatorCode:CarrierField;dataState:CarrierField;networkType:CarrierField;dataEnabled:CarrierField;roaming:CarrierField}>};
};
export const CARRIER_SETUP_PAGE='carrier-setup';
export function carrierSetupSurfaceOpen(settings: {page?:unknown}|null|undefined):boolean{return settings?.page===CARRIER_SETUP_PAGE;}
export function carrierFieldText(field:CarrierField|undefined):string {
 if(field?.status==='available'&&typeof field.value==='string'&&field.value.trim())return field.value;
 return field?.status==='not-read'?'Not read':field?.status==='permission-denied'?'Access denied by Android':field?.status==='unsupported'?'Not supported on this device':'Unavailable from Android';
}
/** A token identifies one locally displayed field, never the identifier bytes. */
export function carrierIdentifier(data:CarrierSetup|undefined,token:string):string|undefined {
 let field:CarrierField|undefined;
 if(token==='eid')field=data?.eid;
 else if(/^imei-\d+$/.test(token))field=data?.slots.find(slot=>slot.slotIndex===Number(token.slice(5)))?.imei;
 else if(/^iccid-\d+$/.test(token))field=data?.subscriptions.items.find(sub=>sub.subscriptionId===Number(token.slice(6)))?.iccid;
 return field?.status==='available'&&typeof field.value==='string'&&field.value.trim()?field.value:undefined;
}
export function createCarrierSetupSession(ports:{read():Promise<CarrierSetup>;readEid?():Promise<CarrierField>;copy(text:string):Promise<void>;current():boolean;changed():void}) {
 let data:CarrierSetup|undefined,busy=false,eidBusy=false,failed=false,generation=0;
 return {
  snapshot:()=>({data,busy,eidBusy,failed}),
  clear(){const had=!!data||busy||eidBusy||failed;generation++;data=undefined;busy=false;eidBusy=false;failed=false;if(had)ports.changed();},
  async show(){
   if(busy||!ports.current())return;
   const token=++generation;data=undefined;busy=true;eidBusy=false;failed=false;ports.changed();
   try{const next=await ports.read();if(token===generation&&ports.current()){if(next?.status!=='ready')throw Error('Unavailable');data=next;}}
   catch{if(token===generation&&ports.current())failed=true;}
   finally{if(token===generation){busy=false;if(!ports.current())data=undefined;ports.changed();}}
  },
  async showEid(){
   if(busy||eidBusy||!data||!ports.readEid||!ports.current())return;
   const token=generation;eidBusy=true;ports.changed();
   try{const eid=await ports.readEid();if(token===generation&&ports.current()&&data)data={...data,eid};}
   catch{if(token===generation&&ports.current()&&data)data={...data,eid:{status:'unavailable'}};}
   finally{if(token===generation){eidBusy=false;if(!ports.current())data=undefined;ports.changed();}}
  },
  async copy(token:string){
   if(!ports.current())return false;
   const value=carrierIdentifier(data,token);if(value===undefined)return false;
   await ports.copy(value);return true;
  },
 };
}
