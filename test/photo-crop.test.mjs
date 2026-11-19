import test from 'node:test';import assert from 'node:assert/strict';
// Photo editor crop rules (photo-crop.ts, PHOTO-01). The rules mirror the pinned upstream
// PhotoCrop.java; browser-photo-edit.spec drives the rendered crop step and the saved pixels.
const c=await import('../apps/app/src/prototype/photo-crop.ts');
const close=(actual,expected,message)=>{for(const key of ['x','y','width','height'])assert.ok(Math.abs(actual[key]-expected[key])<1e-9,`${message}: ${key} ${actual[key]} != ${expected[key]}`);};

test('a crop rectangle is checked like PhotoCrop.rect and the whole photo is no crop',()=>{
 assert.deepEqual(c.validCropRect({x:.25,y:.1,width:.5,height:.4}),{x:.25,y:.1,width:.5,height:.4});
 assert.equal(c.validCropRect({x:0,y:0,width:1,height:1}),undefined,'the whole photo is no crop');
 assert.equal(c.validCropRect({x:1e-7,y:0,width:1-1e-7,height:1}),undefined,'a rounding away from the whole photo is still no crop');
 // A renderer's rounding past the far edge is trimmed, as PhotoCrop does.
 assert.deepEqual(c.validCropRect({x:.1,y:.7,width:.9+1e-12,height:.3+1e-12}),{x:.1,y:.7,width:.9,height:.30000000000000004});
 for(const bad of [null,{},{x:0,y:0,width:0,height:.5},{x:-.1,y:0,width:.5,height:.5},{x:1,y:0,width:.1,height:.1},{x:.6,y:0,width:.5,height:.5},{x:0,y:0,width:NaN,height:.5},{x:'0',y:0,width:.5,height:.5},{x:0,y:0,width:Infinity,height:.5}])
  assert.throws(()=>c.validCropRect(bad),/^Error: Choose a crop area inside the photo$/,JSON.stringify(bad));
});

test('kept pixels round like PhotoCrop.pixels and are never empty',()=>{
 // The same cases as upstream PhotoCropTest.java.
 assert.deepEqual(c.cropPixels({x:.5,y:.5,width:.5,height:.5},101,51),[51,26,50,25]);
 assert.deepEqual(c.cropPixels({x:0,y:0,width:1,height:.5},640,480),[0,0,640,240]);
 assert.deepEqual(c.cropPixels({x:.999,y:.999,width:.001,height:.001},10,10),[9,9,1,1]);
 assert.deepEqual(c.cropPixels({x:.4,y:.4,width:.0001,height:.0001},10,10),[4,4,1,1]);
 assert.deepEqual(c.cropPixels({x:.1,y:.7,width:.9+1e-12,height:.3+1e-12},1000,1000),[100,700,900,300]);
 assert.throws(()=>c.cropPixels({x:0,y:0,width:1,height:1},0,10),/Photo has no pixels/);
});

test('shape presets follow the photo orientation and fit the largest centred area',()=>{
 assert.equal(c.aspectFraction('free',400,300),undefined);
 // Square on a 400x300 photo: 300x300 pixels, so 0.75 of the width and all of the height.
 close(c.fitAspect(c.aspectFraction('square',400,300)),{x:.125,y:0,width:.75,height:1},'square landscape');
 // 4:3 on a portrait 300x400 photo keeps a portrait 3:4 area: the whole photo.
 close(c.fitAspect(c.aspectFraction('4:3',300,400)),{x:0,y:0,width:1,height:1},'4:3 portrait');
 // 16:9 on a 400x300 photo: 400x225 pixels.
 close(c.fitAspect(c.aspectFraction('16:9',400,300)),{x:0,y:.125,width:1,height:.75},'16:9 landscape');
 assert.deepEqual(c.CROP_ASPECTS.map(choice=>choice.label),['Free','Square','4:3','16:9']);
});

test('dragging moves inside the photo, resizes against the opposite corner and keeps a minimum',()=>{
 const start={x:.2,y:.2,width:.5,height:.5};
 close(c.dragCrop(start,'move',.1,-.05),{x:.3,y:.15,width:.5,height:.5},'move');
 close(c.dragCrop(start,'move',.9,.9),{x:.5,y:.5,width:.5,height:.5},'move stops at the far edges');
 close(c.dragCrop(start,'move',-.9,-.9),{x:0,y:0,width:.5,height:.5},'move stops at the near edges');
 close(c.dragCrop(start,'se',.1,.2),{x:.2,y:.2,width:.6,height:.7},'south-east grows');
 close(c.dragCrop(start,'nw',.1,.2),{x:.3,y:.4,width:.4,height:.3},'north-west shrinks against the south-east corner');
 close(c.dragCrop(start,'ne',.9,-.9),{x:.2,y:0,width:.8,height:.7},'north-east stops at the photo');
 close(c.dragCrop(start,'sw',.9,.9),{x:.7-c.MIN_CROP_SIDE,y:.2,width:c.MIN_CROP_SIDE,height:.8},'south-west keeps the minimum width');
 assert.equal(c.dragCrop(start,'se',NaN,0),start,'a broken pointer reading changes nothing');
});

test('a held shape survives every drag and still fits the photo',()=>{
 const fraction=c.aspectFraction('square',400,300),start=c.fitAspect(fraction);
 for(const [handle,dx,dy] of [['se',-.3,0],['se',0,-.3],['nw',.2,.1],['ne',.5,-.5],['sw',-.5,.5],['se',.9,.9],['nw',.9,.9]]){
  const next=c.dragCrop(start,handle,dx,dy,fraction);
  assert.ok(Math.abs(next.width/next.height-fraction)<1e-9,`${handle} ${dx},${dy} keeps the shape`);
  assert.ok(next.x>=-1e-12&&next.y>=-1e-12&&next.x+next.width<=1+1e-12&&next.y+next.height<=1+1e-12,`${handle} ${dx},${dy} stays inside`);
  assert.ok(next.width>=c.MIN_CROP_SIDE-1e-12&&next.height>=c.MIN_CROP_SIDE-1e-12,`${handle} ${dx},${dy} keeps the minimum`);
  assert.doesNotThrow(()=>c.validCropRect(next));
 }
 // Shrinking the width alone shrinks the area: it does not snap back to the old height.
 assert.ok(c.dragCrop(start,'se',-.3,0,fraction).width<start.width-.29);
});

test('rotating a quarter turn keeps the same part of the photo',()=>{
 const rect={x:.1,y:.2,width:.3,height:.4};
 close(c.rotateCropQuarter(rect),{x:.4,y:.1,width:.4,height:.3},'one turn');
 close(c.rotateCropQuarter(c.rotateCropQuarter(c.rotateCropQuarter(c.rotateCropQuarter(rect)))),rect,'four turns');
 // The kept pixels of a 200x100 photo turned to 100x200 are the same pixels, turned.
 const [l,t,w,h]=c.cropPixels(rect,200,100),[l2,t2,w2,h2]=c.cropPixels(c.rotateCropQuarter(rect),100,200);
 assert.deepEqual([w2,h2],[h,w]);assert.deepEqual([l2,t2],[100-(t+h),l]);
});

test('arrow keys move the area, and with Shift resize it',()=>{
 const rect={x:.2,y:.2,width:.5,height:.5};
 close(c.nudgeCrop(rect,'ArrowRight',false),{x:.22,y:.2,width:.5,height:.5},'move right');
 close(c.nudgeCrop(rect,'ArrowUp',true),{x:.2,y:.2,width:.5,height:.48},'Shift resizes');
 assert.equal(c.nudgeCrop(rect,'Enter',false),undefined);
});

test('the crop step shows the photo contained in the editor box and acts on the live session only',()=>{
 assert.deepEqual(c.cropLayout({width:240,height:120}),{left:0,top:145,width:348,height:174});
 assert.deepEqual(c.cropLayout({width:120,height:240}),{left:58,top:0,width:232,height:464});
 let session={rect:{...c.WHOLE_PHOTO},aspect:'free',image:'data:image/png;base64,AA',width:400,height:300},live=session,applied=0,cancelled=0;
 const update=next=>{session=next;live=next;};
 const view=c.cropView(session,()=>live,update,()=>applied++,()=>cancelled++);
 assert.equal(view.frame,'left:0%;top:0%;width:100%;height:100%');assert.equal(view.resetDisabled,true);
 view.aspects.find(choice=>choice.id==='square').pick();
 close(session.rect,{x:.125,y:0,width:.75,height:1},'square chosen');assert.equal(session.aspect,'square');
 const next=c.cropView(session,()=>live,update,()=>applied++,()=>cancelled++);
 assert.equal(next.aspects.find(choice=>choice.id==='square').on,true);assert.equal(next.resetDisabled,false);
 assert.equal(next.frame,'left:12.5%;top:0%;width:75%;height:100%');
 // An old paint's handlers act on the live session, not the one they were painted from.
 const key=event=>({key:event,shiftKey:false,preventDefault(){}});
 view.key(key('ArrowRight'));close(session.rect,{x:.145,y:0,width:.75,height:1},'stale handler moves the live area');
 next.reset();assert.deepEqual(session.rect,c.WHOLE_PHOTO);assert.equal(session.aspect,'free');
 next.apply();assert.equal(applied,1);
 // A busy or closed step ignores input.
 live=undefined;const before=session;next.key(key('ArrowLeft'));next.reset();next.apply();
 assert.equal(session,before);assert.equal(applied,1);
 next.cancel();assert.equal(cancelled,1);
});
