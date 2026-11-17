import assert from 'node:assert/strict';
import test from 'node:test';
import {CapacitorException,ExceptionCode} from '@capacitor/core';
import {browserErrorMessage} from '../apps/app/src/browser/browser-errors.ts';

test('only a genuine Capacitor unimplemented exception becomes plain Browser copy',()=>{
 const error=new CapacitorException('"AlphaBrowser" plugin is not implemented on android',ExceptionCode.Unimplemented);
 assert.equal(browserErrorMessage(error),'Unavailable');
});
test('Alpha’s own Browser recovery and capability instructions remain exact',()=>{
 for(const message of ['Saved bookmarks need recovery. Open Bookmarks to recover them.','Saved tabs and history could not be opened. They were kept unchanged; Clear browsing data resets them.','Load a page before reading.'])assert.equal(browserErrorMessage(new Error(message)),message);
});
test('the native tab host’s sentences are worded by Alpha (ui/browser/browser-messages.ts)',()=>{
 assert.equal(browserErrorMessage(new Error('This Android WebView does not support isolated browser profiles')),'Update WebView');
 assert.equal(browserErrorMessage(new Error('Reading unavailable on a sensitive or unverified page')),'Alpha doesn’t read pages that may be sensitive or that it can’t verify. Open a different page.');
 assert.equal(browserErrorMessage(new CapacitorException('Close a tab before opening another')),'Tab limit. Close a tab before opening another.');
});
test('an unknown native refusal reads as the fallback; lookalikes are not reclassified',()=>{
 for(const error of [new CapacitorException('Check the connection.',ExceptionCode.Unavailable),new CapacitorException('A new native sentence')])assert.equal(browserErrorMessage(error),'Browser unavailable');
 for(const error of [Object.assign(new Error('Keep this error'),{code:'UNIMPLEMENTED'}),new Error('"AlphaBrowser" plugin is not implemented on android')])assert.equal(browserErrorMessage(error),error.message);
 assert.equal(browserErrorMessage(null),'Browser unavailable');
});
