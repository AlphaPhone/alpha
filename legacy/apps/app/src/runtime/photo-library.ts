/** Device photo/video library contract (issue 408, policy P-24): the shared elizaOS contract
 * (plugin-assistant device-actions/photo-library-contract) with Alpha's owner-facing text
 * (ui/photos/library-presentation.ts). The local agent may use every photo and video Android
 * lets Alpha read; full local access is not an upload. Native scope and identity rules are the
 * shared PermittedMediaCatalog (plugin-native-media). */
import * as shared from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/photo-library-contract.ts';
import * as presentation from '../ui/photos/library-presentation';

export * from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/photo-library-contract.ts';

const APP_NAME = 'Alpha';
export function scopePresentation(state: shared.LibraryScopeState | undefined): ReturnType<typeof presentation.scopePresentation> { return presentation.scopePresentation(state, APP_NAME); }
export function reviewText(action: shared.LibraryAction, count: number): ReturnType<typeof presentation.reviewText> { return presentation.reviewText(action, count, APP_NAME); }
export function describeLibraryOperation(op: shared.LibraryAgentOperation): ReturnType<typeof presentation.describeLibraryOperation> { return presentation.describeLibraryOperation(op, APP_NAME); }
/** The shared review freeze (action, items, expiry) carrying Alpha's review card text. */
export function prepareReview(...args: Parameters<typeof shared.prepareReview>): shared.LibraryReview {
  const review = shared.prepareReview(...args);
  return {...review, ...reviewText(review.action, review.items.length)};
}
