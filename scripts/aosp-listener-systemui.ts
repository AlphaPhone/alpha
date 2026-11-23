import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as osImage from '@elizaos/os/image';
import {run} from './upstream-os.ts';

type Bundle = 'ops' | 'chip' | 'assist' | 'power';
/** Prepare a reviewed SystemUI overlay for the wake listener from an unpatched AOSP source (@elizaos/os/image). */
export function prepareListenerSystemui(source: string,output: string,bundle: Bundle='ops'){return run(osImage.prepareListenerSystemui(source,output,bundle));}
/** Verify an AOSP source before or after the reviewed SystemUI patch for the wake listener (@elizaos/os/image). */
export function verifyListenerSystemui(source: string,state: 'before'|'after'='before',bundle: Bundle='ops'){return run(osImage.verifyListenerSystemui(source,state,bundle));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const args=process.argv.slice(2),source=args[args.indexOf('--source')+1];
 if(!args.includes('--source')||!source)throw Error('Use --source AOSP_ROOT [--chip | --assist] [--output NEW_OVERLAY | --after]');
 if(args.includes('--chip')&&args.includes('--assist'))throw Error('Choose one SystemUI bundle');
 const bundle: Bundle=args.includes('--chip')?'chip':args.includes('--assist')?'assist':'ops',output=args.includes('--output')?args[args.indexOf('--output')+1]:null;
 if(args.includes('--output')&&(!output||output.startsWith('--')))throw Error('--output needs a new directory');
 if(output&&args.includes('--after'))throw Error('--output requires unpatched source');
 console.log(JSON.stringify(output?await prepareListenerSystemui(source,path.resolve(output),bundle):await verifyListenerSystemui(source,args.includes('--after')?'after':'before',bundle),null,2));
}
