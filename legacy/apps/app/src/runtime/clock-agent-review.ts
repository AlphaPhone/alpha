import {alphaActionJournal} from '../native/alpha-action-journal.ts';
import {createClockReviewExecutor} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-review-executor';
// One owner-retirement registry for this renderer; native approval remains in AlphaActionJournal.
const executor=createClockReviewExecutor(alphaActionJournal);
export const retireClockReviews=executor.retire;
export const reviewAgentClock=executor.review;
