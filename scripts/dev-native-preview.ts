/** Private UI review server: the product renderer over the existing synthetic native bridge.
 * This entry is never imported by the product or its production Vite configuration. */
import {build} from 'esbuild';
import {createServer,mergeConfig,type Plugin} from 'vite';
import {fileURLToPath} from 'node:url';

if(process.env.ELIZA_DEV_ALLOW_TEST_MOCKS!=='1')throw Error('Native UI review requires ELIZA_DEV_ALLOW_TEST_MOCKS=1.');
if(process.env.ALPHA_LOCAL_AGENT_TOKEN_FILE){process.env.VITE_LOCAL_AGENT='1';process.env.ALPHA_DEV_CONNECTION_TOOLS='0';}
// vite.config computes its defines when imported, so it is imported only after the environment above is set.
const {default:base}=await import('../vite.config.ts');
const root=fileURLToPath(new URL('..',import.meta.url));
const args=process.argv.slice(2),at=args.indexOf('--port');
const port=at<0?5686:Number(args[at+1]);
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('Invalid preview port');
const fixture=await build({stdin:{contents:"import {installTelephonyFixture} from './scripts/fixtures/native-telephony.ts'; installTelephonyFixture({preview:true,mms:true});",resolveDir:root,sourcefile:'native-ui-review.ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022'});
const source=fixture.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const bridge:Plugin={name:'alpha-private-native-review',apply:'serve',transformIndexHtml:{order:'pre',handler:()=>[
 {tag:'meta',attrs:{name:'alpha-preview',content:'Synthetic device providers; no SIM, personal account or hardware access'},injectTo:'head-prepend'},
 {tag:'script',attrs:{'data-alpha-native-preview':'simulated'},children:source,injectTo:'head-prepend'},
]}};
const server=await createServer(mergeConfig(base,{configFile:false,plugins:[bridge],server:{host:'127.0.0.1',port,strictPort:true}}));
await server.listen();
console.log('Native-screen UI review: simulated providers only; not device acceptance.');
server.printUrls();
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void server.close().finally(()=>process.exit(0));});
