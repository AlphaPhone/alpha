// Alpha's CalendarEventSnapshot copies the revision digest of the shared CalendarEventGuard.Snapshot
// (package-private in plugin-native-calendar). Alpha's reviews record that digest; the shared
// reviewed-exact deletion (CalendarPlugin.deleteReviewedExact) recomputes it with the shared guard.
// If the two ever differ, every reviewed Calendar change and deletion refuses as "changed", so this
// test keeps the copied digest equal to the pinned shared one.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ALPHA=source('android/app/src/main/java/ai/alphacompute/alphaphone/CalendarEventSnapshot.java');
const SHARED=source('vendor/eliza/plugins/plugin-native-calendar/android/src/main/java/ai/eliza/plugins/calendar/CalendarEventGuard.java');

const line=(text,pattern,name)=>{
 const found=text.split('\n').map(value=>value.trim()).find(value=>pattern.test(value));
 assert.ok(found,`${name} not found`);
 return found;
};
// The digest's inputs and construction, with the class name the only expected difference.
const parts=text=>({
 event:line(text,/^private static final String\[\] EVENT=/,'EVENT fields'),
 calendar:line(text,/^private static final String\[\] CALENDAR=/,'CALENDAR fields'),
 canonical:line(text,/^StringBuilder canonical=new StringBuilder\(\);/,'canonical encoding'),
 hash:line(text,/^byte\[\] bytes=MessageDigest\.getInstance\("SHA-256"\)/,'SHA-256 digest'),
 source:line(text,/^sourceRevision=sourceDigest\(calendar\);/,'source revision'),
 sourceDigest:line(text,/^private static String sourceDigest\(/,'source digest'),
 append:line(text,/^private static void append\(/,'field encoding'),
});

test('Alpha’s Calendar snapshot digest equals the pinned shared guard’s', ()=>{
 assert.deepEqual(parts(ALPHA),parts(SHARED));
});

test('the shared deletion still recomputes the digest with the shared guard', ()=>{
 const plugin=source('vendor/eliza/plugins/plugin-native-calendar/android/src/main/java/ai/eliza/plugins/calendar/CalendarPlugin.java');
 const body=plugin.slice(plugin.indexOf('public static JSObject deleteReviewedExact('));
 assert.match(body.slice(0,1500),/CalendarEventGuard\.read\(/);
 assert.match(body.slice(0,1500),/current\.revision\.equals\(/);
});
