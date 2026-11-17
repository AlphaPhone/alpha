import {MMS_ATTACHMENT_TYPES, MMS_MAX_ATTACHMENTS, MMS_MAX_TOTAL_BYTES} from '../../../../.eliza/client-features/packages/contracts/src/mms-send.ts';
import type {MmsAttachmentDraft, MmsReview, SmsReview} from './aosp-telephony';

export type SmsDraftStore = {
  readRaw(slot: string): Promise<string | null>;
  compareExchangeRaw(slot: string, expected: string | null, value: string | null): Promise<{status: 'saved' | 'conflict'}>;
};
type Picture = MmsReview['attachments'][number];
export type ReviewedSms = SmsReview & {subscriptionId: number};
export type SmsDraft = {
  recipients: string;
  body: string;
  origin: 'owner' | 'asked';
  sim: string;
  pictures: MmsAttachmentDraft[];
  operation: {kind: 'sms' | 'mms'; id: string; recipients: string[]; subscriptionId: number} | null;
};
const THREAD = /^thread:[1-9]\d{0,18}$/;
const NUMBER = /^\+?\d{2,20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slotFor = (thread: string | null) => {
  if (thread !== null && !THREAD.test(thread)) throw Error('Invalid Messages draft thread');
  return `sms-draft:v1:${thread ?? 'new'}`;
};
function base64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x4000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x4000));
  }
  return btoa(binary);
}
type ReviewedDraft = {kind: 'sms'; id: string; review: ReviewedSms} | {kind: 'mms'; id: string; review: MmsReview};
export function reviewedDraft({body, pictures, operation}: SmsDraft): ReviewedDraft | null {
  if (!operation) return null;
  const {kind, id, recipients, subscriptionId} = operation;
  const review = {recipients, body, subscriptionId};
  return kind === 'sms' ? {kind, id, review} : {kind, id, review: {...review, attachments: pictures as Picture[]}};
}
function decode(raw: string | null, slot: string): SmsDraft | null {
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (value?.binding !== slot || typeof value.recipients !== 'string' || value.recipients.length > 512 ||
      typeof value.body !== 'string' || value.body.length > 1600 || !['owner', 'asked'].includes(value.origin) ||
      typeof value.sim !== 'string' || !/^\d{0,10}$/.test(value.sim) ||
      !Array.isArray(value.pictures) || value.pictures.length > MMS_MAX_ATTACHMENTS) throw Error('Invalid Messages draft');
  const pictures: Picture[] = value.pictures.map((picture: {contentType: Picture['contentType']; name: string; bytes: string}) => {
    if (!MMS_ATTACHMENT_TYPES.includes(picture?.contentType) || typeof picture.name !== 'string' ||
        !/^picture-[1-9]\d{0,8}\.(jpg|png|gif)$/.test(picture.name) || typeof picture.bytes !== 'string' ||
        picture.bytes.length > Math.ceil(MMS_MAX_TOTAL_BYTES / 3) * 4) throw Error('Invalid Messages draft picture');
    const bytes = Uint8Array.from(atob(picture.bytes), c => c.charCodeAt(0));
    if (!bytes.length || bytes.length > MMS_MAX_TOTAL_BYTES) throw Error('Invalid Messages draft picture size');
    return {contentType: picture.contentType, name: picture.name, bytes};
  });
  const {operation} = value;
  if (operation !== null && (!['sms', 'mms'].includes(operation?.kind) || typeof operation.id !== 'string' || !UUID.test(operation.id) ||
      !Number.isInteger(operation.subscriptionId) || operation.subscriptionId < 0 || operation.subscriptionId > 2147483647 ||
      !Array.isArray(operation.recipients) || !operation.recipients.length || operation.recipients.length > 10 ||
      operation.recipients.some((number: unknown) => typeof number !== 'string' || !NUMBER.test(number)) ||
      (operation.kind === 'sms' && pictures.length > 0))) throw Error('Invalid saved Messages operation');
  return {recipients: value.recipients, body: value.body, origin: value.origin, sim: value.sim, pictures, operation};
}

/** Serialize writes from this WebView. CAS keeps another WebView's newer value and also guards
 * a late receipt from erasing a draft changed after this composer loaded it. */
export function createNativeSmsDraftShelf(store: SmsDraftStore) {
  let tail: Promise<unknown> = Promise.resolve();
  const failed = new Map<string, () => Promise<void>>();
  const encodedPictures = new WeakMap<MmsAttachmentDraft, string>();
  function encode(draft: SmsDraft, slot: string) {
    const pictures = draft.pictures.map(picture => {
      let bytes = encodedPictures.get(picture);
      if (bytes === undefined) {
        bytes = base64(picture.bytes);
        encodedPictures.set(picture, bytes);
      }
      return {contentType: picture.contentType, name: picture.name, bytes};
    });
    return JSON.stringify({binding: slot, ...draft, pictures});
  }
  const serial = <T>(work: () => Promise<T>) => {
    const result = tail.then(work);
    tail = result.catch(() => {});
    return result;
  };
  async function write(slot: string, expected: string | null, value: string | null) {
    if (expected !== value) {
      const result = await store.compareExchangeRaw(slot, expected, value);
      if (result.status !== 'saved' && await store.readRaw(slot) !== value) throw Error('Messages draft changed');
    }
    failed.delete(slot);
  }
  return {
    open(thread: string | null) {
      return serial(async () => {
        const slot = slotFor(thread);
        const pending = failed.get(slot);
        if (pending) await pending();
        let expected = await store.readRaw(slot);
        let queued: {draft: SmsDraft | null; result: Promise<void>} | null = null;
        return {
          draft: decode(expected, slot),
          save(draft: SmsDraft | null) {
            // A slow native write only needs the latest edit waiting behind it.
            if (queued) {
              queued.draft = draft;
              return queued.result;
            }
            const result = serial(async () => {
              const next = queued!.draft;
              queued = null;
              const value = next === null ? null : encode(next, slot);
              const save = async () => {
                await write(slot, expected, value);
                expected = value;
              };
              try { await save(); }
              catch (error) { failed.set(slot, save); throw error; }
            });
            queued = {draft, result};
            return result;
          },
        };
      });
    },
    flush() {
      return serial(async () => {
        for (const save of failed.values()) await save();
      });
    },
  };
}
