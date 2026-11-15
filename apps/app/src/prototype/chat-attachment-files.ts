import {MAX_CHAT_UPLOAD_ATTACHMENTS} from '../../../../.eliza/client-features/packages/core/src/chat-upload-limits.ts';

export type ChatFile = {id:string;data:string;mimeType:string;name:string};
export function storedChatFiles(value:unknown):ChatFile[] {
  if(!Array.isArray(value))return [];
  return value.slice(0,MAX_CHAT_UPLOAD_ATTACHMENTS).filter((file):file is ChatFile=>
    typeof file?.id==='string'&&typeof file?.name==='string'&&file.name.length<=255&&
    typeof file?.mimeType==='string'&&typeof file?.data==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(file.data));
}
