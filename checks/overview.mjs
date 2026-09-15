import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import * as THREE from 'three';
const result=await build({stdin:{contents:"export * from './lib/overview-model'; export * from './lib/overview-gesture'; export * from './lib/panorama-data'; export * from './lib/overview-markers'; export * from './lib/navigation';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {buildOverviewModel,OverviewTap,panoramaPoints,separateMarkers,fittedCameraDistance}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const start=performance.now();const model=buildOverviewModel();const elapsed=performance.now()-start;
assert.ok(model.userData.triangles<12000,'Overview triangle budget exceeded');
assert.ok(model.children.length<=12,'Overview draw-call budget exceeded');
let maxX=-Infinity,maxZ=-Infinity,minX=Infinity,minZ=Infinity;
for(const object of model.children){
 const geometry=object.geometry;
 assert.ok(geometry,'No external scene dependencies');
 geometry.computeBoundingBox();
 const pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++) for(let n=0;n<3;n++)assert.ok(Number.isFinite(pos.array[i*3+n]),'Invalid vertex');
 const box=geometry.boundingBox;maxX=Math.max(maxX,box.max.x);maxZ=Math.max(maxZ,box.max.z);minX=Math.min(minX,box.min.x);minZ=Math.min(minZ,box.min.z);
}
assert.ok(maxX<16.7&&maxX>16.4&&maxZ<18&&maxZ>17.8&&minX>-.2&&minZ>-.2,'Floor-plan bounds changed');
assert.equal(panoramaPoints.length,24);
const tap=new OverviewTap();let t=0;
const begin=(id=1,x=0,y=0,target='living-entry',touch=false,button=0)=>tap.begin(id,x,y,t,target,touch,button);
const end=(id=1,x=0,y=0,target='living-entry')=>tap.end(id,x,y,t+100,target);
begin();assert.equal(end(),'living-entry','Mouse click opens selected point');
begin(1,0,0,'living-entry',true);tap.move(1,4,5);assert.equal(end(1,4,5),'living-entry','Small touch jitter remains a tap');
begin();tap.move(1,20,0);tap.move(1,0,0);assert.equal(end(),null,'Drag returning to origin must not navigate');
begin();assert.equal(end(1,12,0),null,'Unreported release movement cannot trigger a tap');
begin();begin(2);assert.equal(end(2),null);assert.equal(end(),null,'Pinch must never navigate after second finger lifts');
begin();begin(2);assert.equal(end(),null);assert.equal(end(2),null,'Pinch release order does not matter');
begin();tap.invalidate();assert.equal(end(),null,'Wheel cancels tap');
begin();assert.equal(tap.end(1,0,0,700,'living-entry'),null,'Long press is not tap');
begin();assert.equal(end(1,0,0,'master-entry'),null,'Press/release on different targets');
begin(1,0,0,null);assert.equal(end(),null,'Starting off-marker never opens a point');
begin(1,0,0,'living-entry',false,2);assert.equal(end(),null,'Right mouse pan is not navigation');
begin();tap.cancel(1);assert.equal(end(),null,'Pointer cancellation never navigates');
begin();tap.reset();assert.equal(end(),null,'Blur resets gesture');
begin();assert.equal(end(),'living-entry','A new click works after cancellation');
const crowded=panoramaPoints.map((p,i)=>({id:p.id,x:120+i%4*8,y:170+Math.floor(i/4)*9,anchorX:120+i%4*8,anchorY:170+Math.floor(i/4)*9,visible:true}));
separateMarkers(crowded,296,430);
for(let i=0;i<crowded.length;i++)for(let j=i+1;j<crowded.length;j++)assert.ok(Math.hypot(crowded[i].x-crowded[j].x,crowded[i].y-crowded[j].y)>30,'Marker hit areas overlap');
for (const [width,height] of [[296,430],[351,540],[716,270],[1280,650]]) {
  const camera=new THREE.PerspectiveCamera(46,width/height,.1,250),target=new THREE.Vector3(8.2,.2,8.9);
  camera.position.copy(target).add(new THREE.Vector3(19.4,23,22.1).normalize().multiplyScalar(fittedCameraDistance('overview',width/height)));
  camera.lookAt(target);camera.updateMatrixWorld();
  const projected=panoramaPoints.map(p=>{const v=new THREE.Vector3(p.position[0],1.35,p.position[1]).project(camera);const x=(v.x+1)*width/2,y=(1-v.y)*height/2;return {id:p.id,x,y,anchorX:x,anchorY:y,visible:Math.abs(v.x)<.96&&Math.abs(v.y)<.95};});
  separateMarkers(projected,width,height);
  assert.ok(projected.every(p=>p.visible),'All 24 points fit '+width+'x'+height);
  for(let i=0;i<projected.length;i++)for(let j=i+1;j<projected.length;j++)assert.ok(Math.hypot(projected[i].x-projected[j].x,projected[i].y-projected[j].y)>30,'Point spacing '+width+'x'+height);
}
const source=await fs.readFile('app/tour.tsx','utf8');
assert.equal((source.match(/<TabsTrigger /g)||[]).length,2);
assert.ok(!source.includes('@/lib/scene'));
assert.ok(!source.includes('value="walk"')&&!source.includes('value="plan"'));
const overviewSource=await fs.readFile('lib/overview.ts','utf8');
assert.ok(!/GLTFLoader|fetch\(|TextureLoader|requestAnimationFrame\(draw\).*requestAnimationFrame/.test(overviewSource));
console.log(JSON.stringify({pass:true,triangles:model.userData.triangles,drawCalls:model.children.length,buildMilliseconds:Math.round(elapsed),points:panoramaPoints.length,gestureCases:14}));
for(const object of model.children){object.geometry.dispose();object.material.dispose();}
