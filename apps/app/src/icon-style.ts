import type {CSSProperties} from 'react';
import catalog from './icon-catalog.json';
const custom:Record<string,{path:string}>=catalog.custom;
const names=new Set<string>([...Object.values(catalog.ic),...catalog.extra]);
/** One pinned icon source for the template, React and DOM controls. */
export function iconStyle(asset:string,filled=false):CSSProperties{
 const name=Object.keys(custom).find(key=>custom[key].path===asset)||(asset.startsWith('/icons/lucide/')?asset.slice('/icons/lucide/'.length).replace(/\.svg$/,''):asset);
 if(!names.has(name))throw Error('Unknown published icon: '+name);
 const path=custom[name]?.path||'/icons/lucide/'+name+(filled&&catalog.filled.includes(name)?'-filled':'')+'.svg';
 return {display:'inline-block',flexShrink:0,width:'24px',height:'24px',backgroundColor:'currentColor',mask:`url("${path}") center / contain no-repeat`,WebkitMask:`url("${path}") center / contain no-repeat`};
}
