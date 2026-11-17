/**
 * Browser downloads through a hidden link: the bytes go to the browser's download manager, which
 * never reports where, or whether, the file landed. Used by the browser Files and Notes document
 * backends, which hand over an object URL they own or a blob.
 */
export function downloadUrl(url:string,name:string){
 const link=document.createElement('a');link.href=url;link.download=name;link.hidden=true;
 try{document.body.append(link);link.click();}finally{link.remove();}
}
/** Downloads a blob and revokes its object URL after `revokeAfterMs`. */
export function downloadBlob(blob:Blob,name:string,revokeAfterMs=60_000){
 const url=URL.createObjectURL(blob);
 try{downloadUrl(url,name);}finally{setTimeout(()=>URL.revokeObjectURL(url),revokeAfterMs);}
}
