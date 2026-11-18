import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
// The Cloud service name comes only from the generated Cloud deployment policy;
// Alpha's runtime and native sources must not hard-code another product's name in user copy.
const sources=[['apps/app/src/runtime',/\.(ts|tsx)$/],['android/app/src/main/java/ai/alphacompute/alphaphone',/\.java$/]];
const generated=new Set(['apps/app/src/runtime/cloud-deployment.generated.ts','android/app/src/main/java/ai/alphacompute/alphaphone/CloudDeployment.java']);
const stripComments=text=>text.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[\s;{}(),])\/\/.*$/gm,'$1');

test('runtime and native sources carry no hard-coded Eliza product name outside the Cloud configuration',()=>{
 const found=[];
 for(const [dir,pattern] of sources)for(const name of fs.readdirSync(path.join(root,dir),{recursive:true})){
  const rel=path.join(dir,String(name));
  if(!pattern.test(rel)||generated.has(rel))continue;
  stripComments(fs.readFileSync(path.join(root,rel),'utf8')).split('\n').forEach((line,index)=>{
   // X-Eliza-* are wire headers (protocol, not branding). The UPSTREAM_* notice markers are the
   // pinned upstream text, matched to recognise stored rows and never shown (system-notice-collapse.test.mjs).
   if(/^export const UPSTREAM_[A-Z_]+_NOTICE = /.test(line)&&rel==='apps/app/src/runtime/action-message-presentation.ts')return;
   if(/(?<![\w-])Eliza(?![\w-])/.test(line.replace(/X-Eliza-[\w-]+/g,'')))found.push(`${rel}:${index+1}`);
  });
 }
 assert.deepEqual(found,[]);
});
