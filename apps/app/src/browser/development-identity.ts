import type {BrowserDomainDocument,DomainRecovery} from './domain-document';
import {developmentCloudAccount,readDevelopmentCloudAccount} from './development-account-document';
import {devSurfacesEnabled} from '../build-flags';
import {browserDevProfile} from './dev-profile';
export const developmentProfiles=['local','cloud','remote'] as const;
export type DevelopmentProfile=typeof developmentProfiles[number];
/** Owner namespaces of the development profiles and the two sample Cloud accounts. */
export const developmentNamespace=/^(local|remote|cloud(?:\.(first|second))?)$/;
export function assertDevelopmentProfile(profile:DevelopmentProfile){if(!browserDevProfile||!developmentProfiles.includes(profile))throw Error('Choose a development profile.');}
export type DevelopmentIdentity={profile:DevelopmentProfile;account?:'first'|'second';session?:string;namespace:string;ownerId:string;agentId:string};
/** Default reply for explicit development profiles; absent from flag-off builds. */
export const developmentDefaultReply:string=devSurfacesEnabled?'Development reply. Edit this response in Agent connection.':'';
export function developmentIdentity(profile:DevelopmentProfile):DevelopmentIdentity{
 if(!devSurfacesEnabled)throw Error('Development profiles are unavailable in this build.');
 const account=profile==='cloud'?developmentCloudAccount():null,namespace=profile+(account?`.${account.account}`:'');
 return {profile,...(account?{account:account.account,session:account.session}:{}),namespace,ownerId:`development-${namespace}-owner`,agentId:`development-${namespace}-agent`};
}
const sameIdentity=(a:DevelopmentIdentity,b:DevelopmentIdentity)=>a.namespace===b.namespace&&a.session===b.session;
export function assertDevelopmentIdentity(identity:DevelopmentIdentity){if(!sameIdentity(developmentIdentity(identity.profile),identity))throw Error('Development account changed.');}

export async function readDevelopmentIdentity(profile:DevelopmentProfile,signal?:AbortSignal):Promise<DevelopmentIdentity>{if(profile==='cloud')await readDevelopmentCloudAccount(signal);signal?.throwIfAborted();return developmentIdentity(profile);}
export async function verifyDevelopmentIdentity(identity:DevelopmentIdentity,signal?:AbortSignal){if(!sameIdentity(await readDevelopmentIdentity(identity.profile,signal),identity))throw Error('Development account changed.');}

/** Recovery remains tied to the captured owner even if a tab misses invalidation. */
export function developmentOwnerRecovery(domain:Pick<BrowserDomainDocument,'capture'|'reset'>,identity:DevelopmentIdentity){return {
 async capture(signal?:AbortSignal){await verifyDevelopmentIdentity(identity,signal);const value=await domain.capture(signal);await verifyDevelopmentIdentity(identity,signal);return value;},
 async reset(expected:DomainRecovery,signal?:AbortSignal){await verifyDevelopmentIdentity(identity,signal);await domain.reset(expected,signal);await verifyDevelopmentIdentity(identity,signal);},
};}
