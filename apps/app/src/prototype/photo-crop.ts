/**
 * The crop rectangle the photo editor sends with an edit: fractions (0 to 1) of the photo after
 * its rotation, origin at the top-left corner. This mirrors upstream PhotoCrop.java (pinned
 * vendor/eliza plugin-native-media): the same validation, the same "whole photo is no crop"
 * rule and the same pixel rounding, so the browser library and Android keep the same pixels.
 */
export type CropRect={x:number;y:number;width:number;height:number};
export type CropAspect='free'|'square'|'4:3'|'16:9';
export type CropHandle='move'|'nw'|'ne'|'sw'|'se';

/** The aspect choices the editor offers; a ratio is width over height for a landscape photo. */
export const CROP_ASPECTS:readonly {id:CropAspect;label:string;ratio?:number}[]=[
  {id:'free',label:'Free'},{id:'square',label:'Square',ratio:1},{id:'4:3',label:'4:3',ratio:4/3},{id:'16:9',label:'16:9',ratio:16/9},
];
export const WHOLE_PHOTO:CropRect=Object.freeze({x:0,y:0,width:1,height:1});
/** The smallest side a dragged crop keeps, as a fraction of the photo's side. */
export const MIN_CROP_SIDE=0.05;
/** Matches PhotoCrop's tolerance for a renderer's rounding at the photo's far edge. */
const EDGE=1e-9;
/** A rectangle closer than this to the whole photo is treated as no crop. */
const WHOLE=1e-6;

const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const clamp=(value:number,low:number,high:number)=>Math.min(high,Math.max(low,value));

/** Whether a rectangle keeps (practically) the whole photo. */
export function isWholePhoto(rect:CropRect){
  return rect.x<=WHOLE&&rect.y<=WHOLE&&rect.x+rect.width>=1-WHOLE&&rect.y+rect.height>=1-WHOLE;
}

/**
 * The rectangle an edit may send, or undefined when it keeps the whole photo. Throws, with
 * PhotoCrop's own wording, when the value is not a finite rectangle with an area inside the photo.
 */
export function validCropRect(input:unknown):CropRect|undefined{
  const value=input as Partial<CropRect>|null;
  if(!value||typeof value!=='object'||!finite(value.x)||!finite(value.y)||!finite(value.width)||!finite(value.height))throw Error('Choose a crop area inside the photo');
  const {x,y}=value;let {width,height}=value;
  if(!(x>=0&&x<1&&y>=0&&y<1&&width>0&&height>0&&x+width<=1+EDGE&&y+height<=1+EDGE))throw Error('Choose a crop area inside the photo');
  width=Math.min(width,1-x);height=Math.min(height,1-y);
  const rect={x,y,width,height};
  return isWholePhoto(rect)?undefined:rect;
}

/** The kept pixels of a rotated photo: left, top, width, height (PhotoCrop.pixels). Never empty. */
export function cropPixels(rect:CropRect,photoWidth:number,photoHeight:number):[number,number,number,number]{
  if(photoWidth<1||photoHeight<1)throw Error('Photo has no pixels');
  const left=Math.min(photoWidth-1,Math.round(rect.x*photoWidth)),top=Math.min(photoHeight-1,Math.round(rect.y*photoHeight));
  const right=Math.min(photoWidth,Math.max(left+1,Math.round((rect.x+rect.width)*photoWidth))),bottom=Math.min(photoHeight,Math.max(top+1,Math.round((rect.y+rect.height)*photoHeight)));
  return [left,top,right-left,bottom-top];
}

/**
 * The aspect choice as a ratio of fractions (fraction width over fraction height) for a photo of
 * the given (rotated) pixel size. A preset follows the photo's orientation: 4:3 on a portrait
 * photo keeps a portrait 3:4 area. Free has no ratio.
 */
export function aspectFraction(aspect:CropAspect,photoWidth:number,photoHeight:number){
  const ratio=CROP_ASPECTS.find(choice=>choice.id===aspect)?.ratio;
  if(!ratio||photoWidth<1||photoHeight<1)return undefined;
  const pixels=photoHeight>photoWidth?1/ratio:ratio;
  return pixels*photoHeight/photoWidth;
}

/** The largest rectangle of a fraction ratio, centred on `within`, that fits inside it. */
export function fitAspect(fraction:number,within:CropRect=WHOLE_PHOTO):CropRect{
  let width=within.width,height=within.height;
  if(width/height>fraction)width=height*fraction;else height=width/fraction;
  return {x:within.x+(within.width-width)/2,y:within.y+(within.height-height)/2,width,height};
}

/**
 * The rectangle after a drag of (dx, dy), in fractions of the photo, from `start`. `move` slides
 * the whole area inside the photo; a corner resizes against the opposite corner, keeps at least
 * MIN_CROP_SIDE on each side, and holds `fraction` (fraction width over height) when given.
 */
export function dragCrop(start:CropRect,handle:CropHandle,dx:number,dy:number,fraction?:number):CropRect{
  if(!finite(dx)||!finite(dy))return start;
  if(handle==='move')return {...start,x:clamp(start.x+dx,0,1-start.width),y:clamp(start.y+dy,0,1-start.height)};
  const east=handle==='ne'||handle==='se',south=handle==='sw'||handle==='se';
  const anchorX=east?start.x:start.x+start.width,anchorY=south?start.y:start.y+start.height;
  const maxWidth=east?1-anchorX:anchorX,maxHeight=south?1-anchorY:anchorY;
  // The dragged corner's distance from the anchor, along each side.
  let width=clamp(start.width+(east?dx:-dx),MIN_CROP_SIDE,maxWidth);
  let height=clamp(start.height+(south?dy:-dy),MIN_CROP_SIDE,maxHeight);
  if(fraction){
    // Follow whichever side the pointer changed more, then keep the minimum and fit the photo.
    if(Math.abs(width-start.width)/fraction>=Math.abs(height-start.height))height=width/fraction;else width=height*fraction;
    const grow=Math.max(1,MIN_CROP_SIDE/width,MIN_CROP_SIDE/height);width*=grow;height*=grow;
    const shrink=Math.min(1,maxWidth/width,maxHeight/height);width*=shrink;height*=shrink;
  }
  return {x:east?anchorX:anchorX-width,y:south?anchorY:anchorY-height,width,height};
}

/** The same kept area after the photo turns a quarter clockwise (the editor's Rotate). */
export function rotateCropQuarter(rect:CropRect):CropRect{
  return {x:clamp(1-(rect.y+rect.height),0,1),y:rect.x,width:rect.height,height:rect.width};
}

/** The rectangle the arrow keys give: a step moves the area, or with `resize` moves its far corner. */
export function nudgeCrop(rect:CropRect,key:string,resize:boolean,fraction?:number,step=0.02):CropRect|undefined{
  const delta=({ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]} as Record<string,[number,number]>)[key];
  if(!delta)return undefined;
  return dragCrop(rect,resize?'se':'move',delta[0],delta[1],fraction);
}

/** The editor's preview box (template.html photos-edit); the photo is shown inside it, contained. */
export const EDIT_BOX={width:348,height:464} as const;
type CropDrag={pointer:number;handle:CropHandle;x:number;y:number;start:CropRect;width:number;height:number};
/** The crop step of an open photo edit: the whole rotated, filtered photo and the area kept. */
export type CropSession={rect:CropRect;aspect:CropAspect;image:string;width:number;height:number;drag?:CropDrag};

/** Where the contained photo sits inside the preview box, in CSS pixels. */
export function cropLayout(session:Pick<CropSession,'width'|'height'>,box:{width:number;height:number}=EDIT_BOX){
  const scale=Math.min(box.width/Math.max(1,session.width),box.height/Math.max(1,session.height)),width=session.width*scale,height=session.height*scale;
  return {left:(box.width-width)/2,top:(box.height-height)/2,width,height};
}
const percent=(value:number)=>`${Math.round(value*100000)/1000}%`;

/**
 * The template data for the crop step, painted from `session`. Handlers outlive a paint, so they
 * act on `live()`: the current session, or undefined while the editor is busy or the step closed.
 * `update` stores a changed session and repaints; `apply` and `cancel` leave the step. Pointer
 * handlers measure the shown photo on the page, so a scaled page still drags by photo fractions.
 */
export function cropView(session:CropSession,live:()=>CropSession|undefined,update:(next:CropSession)=>void,apply:()=>void,cancel:()=>void,busy=false){
  const layout=cropLayout(session),rect=session.rect;
  const fraction=(value:CropSession)=>aspectFraction(value.aspect,value.width,value.height);
  const begin=(handle:CropHandle)=>(event:PointerEvent)=>{
    event.stopPropagation();const value=live();if(!value||event.button>0)return;
    const target=event.currentTarget as HTMLElement|null,image=target?.closest<HTMLElement>('[data-alpha-crop-image]')?.getBoundingClientRect();
    if(!image||image.width<1||image.height<1)return;
    try{target?.setPointerCapture(event.pointerId);}catch{}
    update({...value,drag:{pointer:event.pointerId,handle,x:event.clientX,y:event.clientY,start:value.rect,width:image.width,height:image.height}});
  };
  const move=(event:PointerEvent)=>{const value=live(),drag=value?.drag;if(!value||!drag||drag.pointer!==event.pointerId)return;event.preventDefault();
    update({...value,rect:dragCrop(drag.start,drag.handle,(event.clientX-drag.x)/drag.width,(event.clientY-drag.y)/drag.height,fraction(value))});};
  const end=(event:PointerEvent)=>{const value=live();if(value?.drag?.pointer===event.pointerId)update({...value,drag:undefined});};
  return {
    left:layout.left,top:layout.top,width:layout.width,height:layout.height,
    bg:`url("${session.image}") center / 100% 100% no-repeat`,
    frame:`left:${percent(rect.x)};top:${percent(rect.y)};width:${percent(rect.width)};height:${percent(rect.height)}`,
    busy,
    down:begin('move'),move,up:end,
    nw:begin('nw'),ne:begin('ne'),sw:begin('sw'),se:begin('se'),
    key:(event:KeyboardEvent)=>{const value=live();if(!value)return;const next=nudgeCrop(value.rect,event.key,event.shiftKey,fraction(value));if(!next)return;event.preventDefault();update({...value,rect:next});},
    aspects:CROP_ASPECTS.map(choice=>({id:choice.id,label:choice.label,name:`${choice.label} crop`,on:session.aspect===choice.id,
      css:session.aspect===choice.id?'background:#ffffff;color:#000000':'background:rgba(255,255,255,.12);color:#ffffff',
      pick:()=>{const value=live();if(!value)return;const ratio=aspectFraction(choice.id,value.width,value.height);update({...value,aspect:choice.id,drag:undefined,rect:ratio?fitAspect(ratio):value.rect});}})),
    reset:()=>{const value=live();if(value)update({...value,aspect:'free',drag:undefined,rect:{...WHOLE_PHOTO}});},
    resetDisabled:busy||isWholePhoto(session.rect)&&session.aspect==='free',
    apply:()=>{if(live())apply();},cancel,
  };
}
