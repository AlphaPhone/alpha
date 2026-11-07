/** Renders the actual production template's voice section with the DCLogic renderer: the chat
 * notices above the composer (disclosure, recovery) and the inline voice controls. Bundled once
 * per process. Set globalThis.document and matchMedia before the first call. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

let loaded;
export function voiceMarkup(){return loaded??=load();}

async function load(){
 const template=fs.readFileSync('apps/app/src/prototype/template.html','utf8');
 const noticesStart=template.indexOf('<div class="alpha-chat-notices">'),noticesEnd=template.indexOf('<sc-if value="{{legacyChatRecorder}}">',noticesStart);
 const controlsStart=template.indexOf('<sc-if value="{{inlineChatRecorder}}">',noticesEnd),controlsEnd=template.indexOf('<sc-if value="{{panelComposer}}">',controlsStart);
 assert.ok(noticesStart>=0&&noticesEnd>noticesStart&&controlsStart>noticesEnd&&controlsEnd>controlsStart);
 const fragment='<div class="os"><div data-screen="1">'+template.slice(noticesStart,noticesEnd)+template.slice(controlsStart,controlsEnd)+'</div></div>';
 const bundle=await build({stdin:{contents:`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{DCLogic}from'./apps/app/src/prototype/dc-lite.js';import{VoiceActivity}from'./apps/app/src/prototype/voice-activity.tsx';export const createActivity=props=>React.createElement(VoiceActivity,props);class Fixture extends DCLogic{renderVals(){return this.props.values;}}export const render=values=>renderToStaticMarkup(React.createElement(Fixture,{phoneSurface:true,values}));`,resolveDir:process.cwd(),loader:'js'},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'actual-voice-template',setup(b){b.onResolve({filter:/template\.html\?raw$/},()=>({path:'voice',namespace:'actual-template'}));b.onLoad({filter:/.*/,namespace:'actual-template'},()=>({contents:'export default '+JSON.stringify(fragment),loader:'js'}));}}]});
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'voice-markup-')),file=path.join(temporary,'renderer.cjs');
 try{fs.writeFileSync(file,bundle.outputFiles[0].text);return createRequire(import.meta.url)(file);}
 finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
