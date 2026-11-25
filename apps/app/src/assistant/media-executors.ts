import type { ExecutorCall } from "@elizaos/agent/client";
import { NOT_DISPATCHED } from "@elizaos/agent/client";
import type { DeviceOperation } from "@elizaos/agent/operations";
import type { Alpha } from "../runtime/area.tsx";
import type { ReviewAuthority } from "./media-review.vibe";

const refused = { kind: "refused", code: NOT_DISPATCHED } as const;

/** Route an admitted operation to the owning area's normal, retained runtime. */
export async function executeMedia(alpha: Alpha, operation: DeviceOperation, call: ExecutorCall, authority: ReviewAuthority): Promise<unknown> {
  if (operation.type === "phone_keypad" || operation.type === "phone_dial" || operation.type === "phone_call") {
    const { phoneAction } = await import("../phone/agent.vibe");
    return alpha.runtime.runPromise(phoneAction(operation, authority.current));
  }
  if (operation.type === "sms_reply_selected" || operation.type === "sms_compose") {
    const { messageAction } = await import("../messages/agent.vibe");
    return alpha.runtime.runPromise(messageAction(operation, call, authority.target, authority.current));
  }
  if (operation.type === "camera_capture_photo") {
    const [{ default: camera }, { requestCapture }] = await Promise.all([import("../camera/index.tsx"), import("../camera/camera.vibe")]);
    const answer = await camera.runtime(alpha).runPromise(requestCapture(operation.lens));
    if (answer.result === "Uncertain") return undefined;
    if (answer.result !== "Taken") return refused;
    const media = answer.media;
    const mediaId = media?.libraryId?.match(/:i:([1-9][0-9]{0,24})$/)?.[1];
    if (media === undefined || mediaId === undefined || media.width <= 0 || media.height <= 0) return undefined;
    return { kind: "applied", result: { version: 1, kind: operation.type, operationId: call.operationId, mediaId, libraryId: media.libraryId, width: Math.round(media.width), height: Math.round(media.height), mime: "image/jpeg" } };
  }
  if (operation.type.startsWith("files_")) {
    const [{ default: files }, { fileAction }] = await Promise.all([import("../files/index.tsx"), import("../files/agent.vibe")]);
    return files.runtime(alpha).runPromise(fileAction(operation, call));
  }
  const [{ default: photos }, { photoAction }] = await Promise.all([import("../photos/index.tsx"), import("../photos/agent.vibe")]);
  const result = await photos.runtime(alpha).runPromise(photoAction(operation));
  return result === undefined ? refused : { kind: "applied", result };
}
