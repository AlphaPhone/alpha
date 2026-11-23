// The complete unmodified producer closure is shared by preparation and admission.
/** ARM64 remains the historical primary record; generated builds also carry x86_64. */
export function embeddingAbiLibraries<T>(record: {abi:string; libraries:T[]; additionalAbis?:{abi:string; libraries:T[]}[]}) {
 return [{abi:record.abi,libraries:record.libraries},...(record.additionalAbis??[])];
}
export const embeddingProducerInputPaths=[
 "package.json",
 "packages/agent/package.json",
 "packages/os/android/local-inference/package.json",
 "packages/os/android/local-inference/scripts/aosp/compile-libllama-paths.ts",
 "packages/os/android/local-inference/scripts/aosp/compile-libllama.ts",
 "packages/os/android/local-inference/scripts/aosp/compile-shim.ts",
 "packages/os/android/local-inference/scripts/aosp/vulkan-source-contract.ts",
 "packages/os/android/local-inference/scripts/aosp/zig-toolchain.ts",
 "packages/os/android/local-inference/scripts/build-helpers/arm64-simd.ts",
 "packages/os/android/local-inference/scripts/build-helpers/elizavoice-build-flags.ts",
 "packages/os/android/local-inference/scripts/build-helpers/omnivoice-merged.ts",
 "packages/os/android/local-inference/scripts/build-helpers/verify-fused-symbols.ts",
 "packages/os/android/local-inference/scripts/lib/repo-root.ts",
 "packages/os/android/local-inference/scripts/stage-elizavoice-lib.ts"
];
// The native preparation and admission paths share one identity transformation.
export const nativeInputPaths = [
 'packages/os/android/local-inference/scripts/stage-elizavoice-lib.ts',
 'packages/os/android/local-inference/scripts/build-helpers/arm64-simd.ts',
 'packages/os/android/local-inference/scripts/build-helpers/verify-fused-symbols.ts',
 'packages/os/android/local-inference/src/main/elizavoice-jni/CMakeLists.txt',
 'packages/os/android/local-inference/src/main/elizavoice-jni/elizavoice-jni.cpp',
];
export const nativeJavaPath = 'packages/os/android/local-inference/src/main/java/ai/eliza/voice/VoiceNative.java';
interface NativeBinding {mode: 'registered'|'exported'; className: string; subset: 'full'}
export function nativeBinding(cpp: string, cmake: string, identity: string): NativeBinding {
 if(!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(identity))throw Error('Invalid product identity');
 const registered=/env->RegisterNatives\s*\(/.test(cpp);
 if(registered&&(!/JNI_OnLoad\s*\(/.test(cpp)||!cmake.includes('ELIZA_VOICE_JNI_CLASS')||!cmake.includes('ELIZA_VOICE_JNI_SUBSET')))throw Error('Unsupported native registration contract');
 return {mode:registered?'registered':'exported',className:'ai/eliza/voice/VoiceNative',subset:'full'};
}
export function nativeInputs(binding: NativeBinding){return binding.mode==='registered'?[...nativeInputPaths,nativeJavaPath]:nativeInputPaths;}
/** The upstream JNI source is used verbatim: one bridge, libparadeevoicejni.so bound to ai/eliza/voice/VoiceNative. */
export function nativeGenerated(relative: string, source: string, _identity: string, _binding: NativeBinding){
 return source;
}
export function nativeCmakeOptions(binding: NativeBinding){return binding.mode==='registered'?[`-DELIZA_VOICE_JNI_CLASS=${binding.className}`,'-DELIZA_VOICE_JNI_SUBSET=full','-DELIZA_VOICE_JNI_LIBRARY=paradeevoicejni']:[];}
const clean=(source: string)=>source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
/** Reject a source pin whose full registration table cannot bind its staged Java class. */
export function verifyNativeJava(cpp: string,java: string){
 const types: Record<string,string> = {void:'V',boolean:'Z',byte:'B',char:'C',short:'S',int:'I',long:'J',float:'F',double:'D',String:'Ljava/lang/String;',Object:'Ljava/lang/Object;'};
 const descriptor=(type: string): string=>{type=type.replace(/\s/g,'');if(type.endsWith('[]'))return '['+descriptor(type.slice(0,-2));if(!Object.hasOwn(types,type))throw Error('Unsupported native Java type '+type);return types[type];};
 const declarations=new Map();
 for(const match of clean(java).matchAll(/\bstatic\s+native\s+([\w\[\]]+)\s+(\w+)\s*\(([^)]*)\)\s*;/g)){
  const parameters=match[3].trim()?match[3].split(',').map(parameter=>descriptor(parameter.trim().split(/\s+/).slice(0,-1).join(''))).join(''):'';
  if(declarations.has(match[2]))throw Error('Overloaded native declaration requires review');
  declarations.set(match[2],`(${parameters})${descriptor(match[1])}`);
 }
 const methods=[...clean(cpp).matchAll(/ELIZA_NATIVE\(\s*(\w+)\s*,\s*"([^"]+)"\s*\)/g)];
 if(!methods.length||new Set(methods.map(match=>match[1])).size!==methods.length||methods.length!==declarations.size)throw Error('Native registration and Java declaration set changed');
 for(const [,name,signature] of methods)if(declarations.get(name)!==signature)throw Error('Native registration signature changed: '+name);
 for(const required of ['nativeEmbed','nativeEmbedUtf8','nativeEmbedWithOptionsUtf8'])if(!declarations.has(required))throw Error('Required native embedding declaration missing');
 return methods.length;
}
export function nativeRequiredSymbols(binding: NativeBinding){return binding.mode==='registered'?['JNI_OnLoad']:['nativeEmbed','nativeEmbedUtf8','nativeEmbedWithOptionsUtf8'].map(name=>'Java_'+binding.className.replaceAll('/','_')+'_'+name);}
export function verifyNativeSymbols(symbols: string,binding: NativeBinding){
 const exports=symbols.trim().split('\n').filter(Boolean).map(line=>line.trim().split(/\s+/).at(-1) ?? '');
 for(const required of nativeRequiredSymbols(binding))if(!exports.includes(required))throw Error('Required embedding JNI symbol missing');
 if(binding.mode==='registered'&&exports.some(symbol=>symbol!=='JNI_OnLoad'))throw Error('Registered JNI bridge exports unexpected symbols');
 if(exports.some(symbol=>symbol.startsWith('Java_ai_elizaos_app_')))throw Error('Unrelocated JNI identity');
}
