/** Public provider text only. Never accept HTML, links, credentials or caller-selected authorities. */
export interface CloudLegalDocument { title: string; revision: string; sections: { title: string; paragraphs: string[] }[] }
export interface CloudServiceInfo { name: string; terms: CloudLegalDocument; privacy: CloudLegalDocument }
function fail():never{throw Error('Service information unavailable');}
const row=(value:unknown,keys:string[]):Record<string,unknown>=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join()!==keys.sort().join())fail();
 return value as Record<string,unknown>;
};
const text=(value:unknown):string=>{if(typeof value!=='string'||!value.trim())fail();return value;};
function document(value:unknown):CloudLegalDocument{
 const data=row(value,['title','revision','sections']);
 if(!Array.isArray(data.sections)||!data.sections.length)fail();
 return {title:text(data.title),revision:text(data.revision),sections:data.sections.map(value=>{
  const section=row(value,['title','paragraphs']);
  if(!Array.isArray(section.paragraphs)||!section.paragraphs.length)fail();
  return {title:text(section.title),paragraphs:section.paragraphs.map(text)};
 })};
}
export function parseCloudServiceInfo(value:unknown):CloudServiceInfo{
 const envelope=row(value,['success','version','service']);
 if(envelope.success!==true||envelope.version!==1)fail();
 const data=row(envelope.service,['name','terms','privacy']);
 return {name:text(data.name),terms:document(data.terms),privacy:document(data.privacy)};
}
