import test from 'node:test';
import assert from 'node:assert/strict';
import {checkChatSearch} from '../specs/quint/refinement/application/chat-search.mjs';
test('whole chat search module retires owner and cancelled replies',async()=>{
 const result=await checkChatSearch();assert.ok(result.passed&&result.inputsUnchanged&&result.driverInputsBound);
});
