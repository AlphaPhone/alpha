import type {Page} from '@playwright/test';
/** Account-local copies are normal entries in Drafts, separate from Gmail drafts. */
export async function localDraftRow(page:Page,name:string|RegExp=/^Local draft,/){
 await page.getByRole('button',{name:'Other mail folders',exact:true}).click();await page.getByRole('menuitemradio',{name:'Drafts',exact:true}).click();
 return page.getByRole('button',{name}).first();
}

type SavedDraft={id:string;mode?:string;subject:string;body:string;attachments?:Array<{name:string;mimeType:string;dataBase64:string}>};
/** The account's set-aside local drafts in Drafts, oldest first, as stored. */
export function savedInboxDrafts(page:Page,owner:[string,string,string,string]){
 return page.evaluate(async owner=>{
  const {inboxLocalStore}=await import('/src/runtime/inbox-local-store.ts');
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(owner)));
  const digest=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  const shelf=await inboxLocalStore.read<{items:Array<{draft:SavedDraft}>}>(`inbox-drafts:v1:shelf:${digest}`);
  return shelf?.items.map(row=>row.draft) ?? [];
 },owner);
}

export async function savedInboxAttachments(page:Page,owner:[string,string,string,string]){
 return (await savedInboxDrafts(page,owner))[0]?.attachments ?? [];
}
