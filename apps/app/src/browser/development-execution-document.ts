import {browserDevProfile} from './dev-profile';
import {browserDocuments} from './documents';
import {BrowserDomainDocument} from './domain-document';
import {developmentNamespace,type DevelopmentIdentity} from './development-identity';
export type ExecutionDocument={actions:string|null;workflows:string|null};
type ExecutionPart=keyof ExecutionDocument;
const empty=():ExecutionDocument=>({actions:null,workflows:null});
/** Captured owner namespaces remain usable for terminal receipt recording after retirement. */
export function developmentExecutionDocument(identity:DevelopmentIdentity){
 if(!browserDevProfile||!developmentNamespace.test(identity.namespace))throw Error('Choose a development profile.');
 return new BrowserDomainDocument(browserDocuments,`alpha.browser.execution.${identity.namespace}.v1`);
}
export function executionPart<T>(document:ExecutionDocument,part:ExecutionPart,initial:()=>T):T{
 if(!document||typeof document!=='object'||Array.isArray(document)||!Object.hasOwn(document,'actions')||!Object.hasOwn(document,'workflows')||[document.actions,document.workflows].some(raw=>raw!==null&&typeof raw!=='string'))throw Error('Development execution data needs recovery.');
 return document[part]===null?initial():JSON.parse(document[part]);
}
export async function readExecutionPart<T>(identity:DevelopmentIdentity,part:ExecutionPart,initial:()=>T,signal?:AbortSignal):Promise<T>{
 const document=await developmentExecutionDocument(identity).read(empty,signal);signal?.throwIfAborted();return executionPart(document,part,initial);
}
export async function editExecutionPart<T,R>(identity:DevelopmentIdentity,part:ExecutionPart,initial:()=>T,editor:(state:T,document:ExecutionDocument)=>R|Promise<R>,signal?:AbortSignal):Promise<R>{
 return developmentExecutionDocument(identity).edit(empty,async document=>{const state=executionPart(document,part,initial),result=await editor(state,document);signal?.throwIfAborted();document[part]=JSON.stringify(state);return result;},signal);
}
