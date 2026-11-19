import {
  CHAT_IMAGE_MIME_TYPE_SET, CHAT_UPLOAD_MIME_TYPES, MAX_CHAT_ATTACHMENT_NAME_LENGTH,
  MAX_CHAT_IMAGE_INTAKE_BYTES, MAX_CHAT_MEDIA_RAW_BYTES, MAX_CHAT_UPLOAD_ATTACHMENTS,
} from '../../../../.eliza/client-features/packages/core/src/chat-upload-limits.ts';
import type {SummarySource} from './summary-source';

export type AttachmentBytes = { name: string; mimeType: string; dataBase64: string };
const uploadTypes = new Set<string>(CHAT_UPLOAD_MIME_TYPES.filter(type => !/^(audio|video)\//.test(type)));
export const chatAttachmentAccept = [...uploadTypes].join(',');
export const chatAttachmentFileLimit = (mime: string) => CHAT_IMAGE_MIME_TYPE_SET.has(mime) ? MAX_CHAT_IMAGE_INTAKE_BYTES : MAX_CHAT_MEDIA_RAW_BYTES;
export const acceptsChatAttachment = (name: string, mime: string) => name.length > 0 && name.length <= MAX_CHAT_ATTACHMENT_NAME_LENGTH && uploadTypes.has(mime);

export function decodedFile(value: AttachmentBytes): File {
  if (!acceptsChatAttachment(value.name, value.mimeType) || value.dataBase64.length > Math.ceil(chatAttachmentFileLimit(value.mimeType) / 3) * 4) {
    throw Error('Choose a supported photo or document.');
  }
  const raw = atob(value.dataBase64);
  const bytes = Uint8Array.from(raw, character => character.charCodeAt(0));
  return new File([bytes], value.name, { type: value.mimeType });
}

export type SelectedChatFile = {
  current(): boolean;
  read(current: () => boolean): Promise<File | undefined>;
  edit(compose: (draft: string, source?: SummarySource) => void, current: () => boolean, question?: string): void;
};

export type ChatFile = {id:string;data:string;mimeType:string;name:string};
export function storedChatFiles(value:unknown):ChatFile[] {
  if(!Array.isArray(value))return [];
  return value.slice(0,MAX_CHAT_UPLOAD_ATTACHMENTS).filter((file):file is ChatFile=>
    typeof file?.id==='string'&&typeof file?.name==='string'&&file.name.length<=255&&
    typeof file?.mimeType==='string'&&typeof file?.data==='string'&&/^[A-Za-z0-9+/]+={0,2}$/.test(file.data));
}
