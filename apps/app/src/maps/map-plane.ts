import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPlane as SharedMapPlane, type MapBasemap } from '../../../../.eliza/client-features/plugins/plugin-maps/src/client/map-plane.ts';
import fontUrl from '@fontsource/public-sans/files/public-sans-latin-400-normal.woff2?url';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { nativeRegion, nativeRegionRequest } from './regional-provider';
/** MapLibre paint colors are concrete values, not CSS variable expressions. Resolve against
 * this connected host on each construction/retry; never cache a previous theme's palette. */
export function resolveMapColors(container: HTMLElement, colors: Record<string, string>): Record<string, string> {
 const document = container.ownerDocument, view = document.defaultView;
 if (!container.isConnected || !view) throw new Error('Map theme colors are unavailable.');
 const hostStyle = view.getComputedStyle(container);
 const probe = document.createElement('span');
 probe.hidden = true;
 probe.setAttribute('aria-hidden', 'true');
 container.appendChild(probe);
 try {
  return Object.fromEntries(Object.entries(colors).map(([key, input]) => {
   let value = input.trim();
   const visited = new Set<string>();
   for (let depth = 0; value.includes('var('); depth++) {
    const token = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value)?.[1];
    if (!token || visited.has(token) || depth >= 16) throw new Error('Map theme colors are unavailable.');
    visited.add(token);
    value = hostStyle.getPropertyValue(token).trim();
    if (!value) throw new Error('Map theme colors are unavailable.');
   }
   // Clear first: CSS keeps its previous value when an invalid assignment is ignored.
   probe.style.color = '';
   probe.style.setProperty('color', value, 'important');
   if (!probe.style.color) throw new Error('Map theme colors are unavailable.');
   const concrete = view.getComputedStyle(probe).color;
   const match = /^(rgb|rgba)\(([^)]+)\)$/.exec(concrete);
   const parts = match?.[2].split(',').map(part => part.trim());
   const channels = parts?.map(Number);
   if (!match || !parts || parts.some(part => !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(part)) || !channels || channels.length !== (match[1] === 'rgba' ? 4 : 3)
     || channels.some((channel, index) => !Number.isFinite(channel) || channel < 0 || channel > (index === 3 ? 1 : 255))) {
    throw new Error('Map theme colors are unavailable.');
   }
   return [key, concrete];
  }));
 } finally {
  probe.remove();
 }
}

type Raster=Extract<MapBasemap,{kind:'cloud-raster'}>;
type CopyrightView=Parameters<NonNullable<Raster['copyright']>>[0];
const mercatorLatitude=(y:number)=>Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI;
/** The area a settled camera can show at any bearing: MapLibre's world is 512px square at zoom 0. */
export function viewportArea(center:{latitude:number;longitude:number},zoom:number,width:number,height:number):CopyrightView {
 const world=512*2**zoom,reach=Math.hypot(width,height)/2/world;
 const y=(1-Math.asinh(Math.tan(Math.max(-85.0511,Math.min(85.0511,center.latitude))*Math.PI/180))/Math.PI)/2;
 const west=center.longitude-reach*360,east=center.longitude+reach*360,whole=reach>=.5||west<-180||east>180;
 return {zoom:Math.round(zoom),north:mercatorLatitude(Math.max(0,y-reach)),south:mercatorLatitude(Math.min(1,y+reach)),west:whole?-180:west,east:whole?180:east};
}
/**
 * The provider copyright for the visible area, read after the map settles. The shared plane hides
 * its canvas until that read answers, on every zoom step and long pan; on a phone that read took
 * 3.7 s, during which the loaded tiles were invisible. Here tiles draw as they arrive and the text
 * follows; until it does the host shows the provider's standing tile attribution.
 */
function settledCopyright(container:HTMLElement,copyright:NonNullable<Raster['copyright']>,report:(text:string)=>void) {
 let pending:AbortController|undefined,attributed:CopyrightView|undefined;
 const covers=(area:CopyrightView|undefined,view:CopyrightView)=>!!area&&area.zoom===view.zoom&&area.north>=view.north&&area.south<=view.south&&area.east>=view.east&&area.west<=view.west;
 return {
  settled(center:{latitude:number;longitude:number},zoom:number) {
   const view=viewportArea(center,zoom,container.clientWidth,container.clientHeight);
   if(covers(attributed,view))return;
   pending?.abort();const controller=pending=new AbortController();
   // One more viewport on each side, so short pans and route following ask nothing.
   const tall=view.north-view.south,wide=view.east-view.west;
   const requested={zoom:view.zoom,north:Math.min(90,view.north+tall),south:Math.max(-90,view.south-tall),east:Math.min(180,view.east+wide),west:Math.max(-180,view.west-wide)};
   copyright(requested,controller.signal).then(text=>{
    if(controller.signal.aborted)return;
    attributed=requested;container.dataset.mapCopyright=text;report(text);
   },()=>{
    // The area keeps its standing attribution; the next settled camera asks again.
    if(controller.signal.aborted)return;
    attributed=undefined;delete container.dataset.mapCopyright;report('');
   });
  },
  stop(){pending?.abort();},
 };
}

/** Product palette, typography and space reserved for the Alpha route sheets. The shared
 * plane reflows the selected place when these sheets move (plugin-maps 5176c4523c). */
export class MapPlane extends SharedMapPlane {
 private stopCopyright?:()=>void;
 constructor(container:HTMLElement,region:MapBasemap,onError:()=>void,colors:Record<string,string>,onPin?:(id:string)=>void,onCopyright?:(text:string)=>void,onInteraction?:()=>void,onViewport?:(center:{latitude:number;longitude:number},zoom:number)=>void) {
  const worldwide=region.kind==='global'||region.kind==='cloud-raster';
  const copyright=region.kind==='cloud-raster'&&region.copyright?settledCopyright(container,region.copyright.bind(region),text=>onCopyright?.(text)):undefined;
  // Without `copyright` the shared plane shows tiles as they load and marks the map ready on its first style load.
  const basemap:MapBasemap=copyright&&region.kind==='cloud-raster'?{kind:region.kind,attribution:region.attribution,minZoom:region.minZoom,maxZoom:region.maxZoom,tileSize:region.tileSize,tile:region.tile}:region;
  super(container,basemap,onError,region.kind==='global'?colors:resolveMapColors(container,colors),{fontUrl,workerUrl,accent:'#1616d8',protocol:'alpha-region',routePadding:{top:220,bottom:280,left:30,right:30},nativeRegion,nativeRequest:nativeRegionRequest,onInteraction,
   // The settled camera ranks the user's next search around the area on screen (the screen controller's rule).
   onViewport:(center,zoom)=>{copyright?.settled(center,zoom);onViewport?.(center,zoom);},selectionPadding:worldwide?()=>{
   const bounds=container.getBoundingClientRect();
   const credits=container.parentElement?.querySelector('.alpha-map-credits')?.getBoundingClientRect();
   const header=container.parentElement?.querySelector('[data-alpha-app-header="main"]')?.getBoundingClientRect();
   const sheet=container.parentElement?.querySelector('[data-alpha-maps-sheet]')?.getBoundingClientRect();
   const right=sheet&&sheet.left>bounds.left+30?Math.max(30,bounds.right-sheet.left+30):30;
   return {top:header?header.bottom-bounds.top+60:100,bottom:credits?bounds.bottom-credits.top+16:Math.min(430,container.clientHeight*.52+30),left:30,right};
  }:undefined,onPin});
  this.stopCopyright=copyright?.stop;
 }
 override destroy() { this.stopCopyright?.();super.destroy(); }
}
