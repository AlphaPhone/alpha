// The pinned upstream view registry and navigation vocabulary, bundled whole from vendor/eliza.
// Only @elizaos/core is narrowed, to the real modules the registry reads; nothing is restated.
import {build} from 'esbuild';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve('vendor/eliza');
const from=file=>JSON.stringify(path.join(root,file));
const core=`export {ElizaError} from ${from('packages/core/src/errors.ts')};
export {getViewModalities,resolveViewKind} from ${from('packages/core/src/views/declarations.ts')};
export {hashArtworkSeed} from ${from('packages/core/src/utils/deterministic.ts')};
export {trimBoundaryCharacters} from ${from('packages/core/src/utils/string-boundaries.ts')};
export const logger=new Proxy({},{get:()=>()=>{}}),ModelType={};`;
const coreSlice={name:'core-slice',setup(b){
 b.onResolve({filter:/^@elizaos\/core(\/protocol)?$/},()=>({path:'core',namespace:'core-slice'}));
 b.onLoad({filter:/.*/,namespace:'core-slice'},()=>({loader:'ts',resolveDir:root,contents:core}));
}};
async function load(contents,options={}){
 const result=await build({stdin:{contents,resolveDir:root,loader:'ts'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',...options});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const registry='packages/agent/src/api/views-registry.ts';
export const upstreamViews=await load(
 `export * from ${from(registry)};export * from ${from('packages/agent/src/api/native-view-declarations.ts')};export {BUILTIN_VIEWS} from ${from('packages/agent/src/api/builtin-views.ts')};export * from ${from('packages/agent/src/runtime/view-navigation-targets.ts')};`,
 // The registry locates its own package from its module URL, which a bundled data: module lacks.
 {plugins:[coreSlice],define:{'import.meta.url':JSON.stringify(pathToFileURL(path.join(root,registry)).href)}});

// A plugin module's own `views` declarations. Its services, actions and routes are irrelevant
// to view registration, so every module it imports is an inert stand-in.
const inert={name:'inert-imports',setup(b){
 b.onResolve({filter:/.*/},args=>args.kind==='entry-point'||args.importer==='<stdin>'&&args.path.startsWith(root)?undefined:{path:'inert',namespace:'inert'});
 b.onLoad({filter:/.*/,namespace:'inert'},()=>({loader:'js',contents:`const inert=new Proxy(function(){},{get:(_,key)=>key===Symbol.iterator?function*(){}:key===Symbol.toPrimitive?()=>'':key==='then'?undefined:inert,getPrototypeOf:()=>inert,apply:()=>inert,construct:()=>inert});module.exports=inert;`}));
}};
/** The default export of vendor/eliza/plugins/<name>/src/plugin.ts. */
export async function upstreamPlugin(name){
 return (await load(`export {default} from ${from(`plugins/${name}/src/plugin.ts`)};`,{plugins:[inert]})).default;
}
