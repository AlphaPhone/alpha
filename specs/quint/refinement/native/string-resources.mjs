// Alpha's string resources for JVM harnesses: an R.string class and a Context.getString(int) that
// return exactly what the resource file says, so a harness that checks notice text checks the
// shipped resource rather than a copy of it.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './java.mjs';

export const noticeStrings='android/app/src/main/res/values/alpha-notices.xml';

/** Android's resource escapes that these files use; anything else is refused rather than guessed. */
function value(raw,name){
  assert.ok(!/\\[^'"\\]|@|\?|%/.test(raw.replace(/\\['"\\]/g,'')),`${name} uses a resource escape or format the harness does not model`);
  return raw.replace(/\\(['"\\])/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
}

export function stringResources(file=noticeStrings){
  const xml=readFileSync(join(root,file),'utf8');
  const entries=[...xml.matchAll(/<string name="([a-z0-9_]+)">([^<]*)<\/string>/g)].map(([,name,raw])=>[name,value(raw,name)]);
  assert.ok(entries.length>0,`${file} defines strings`);
  const id=index=>0x7f100000+index;
  return {
    file,
    values:Object.fromEntries(entries),
    /** Body of R: `static final class string {...}`. */
    rString:`static final class string {${entries.map(([name],index)=>`static final int ${name}=${id(index)};`).join('')}}`,
    /** A Context method. */
    getString:` public String getString(int id){switch(id){${entries.map(([,text],index)=>`case ${id(index)}:return ${JSON.stringify(text)};`).join('')}default:throw new AssertionError("Unknown string resource "+id);}}\n`,
  };
}
