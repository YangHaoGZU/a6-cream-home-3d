import assert from 'node:assert/strict';
import {DIMENSIONS as d,rooms,walls,floorRects,contains,coreObstacles,floorElevation} from '../lib/plan.ts';
import {furnishings,furnishingObstacles,fixtureObstacles,furnishingBounds} from '../lib/furniture-layout.ts';
const sum=a=>a.reduce((x,y)=>x+y,0);for(const [a,b] of [[d.northChain,15.2],[d.southChain,15.2],[d.westChain,17.8],[d.eastChain,16.7]])assert.ok(Math.abs(sum(a)-b)<1e-8);
assert.ok(rooms.every(r=>r.height===(r.id==='terrace'?6:3)));assert.deepEqual(rooms.find(r=>r.id==='terrace').rect,[0,12.8,4,17.8]);
const obstacles=[];for(const w of walls){const v=w.a[0]===w.b[0],t=w.thickness??(w.external?.2:.12),L=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);let c=0;const add=(s,e)=>{if(e>s)obstacles.push(v?[w.a[0]-t/2,w.a[1]+s,w.a[0]+t/2,w.a[1]+e]:[w.a[0]+s,w.a[1]-t/2,w.a[0]+e,w.a[1]+t/2])};for(const o of w.openings??[]){assert.ok(o.a>=c&&o.b<=L+1e-8&&o.b>o.a,JSON.stringify(w));add(c,o.a);if(o.kind==='window')add(o.a,o.b);c=o.b;}add(c,L)}
const southNorth=walls.find(w=>w.a[0]===4&&w.a[1]===12.8&&w.b[0]===7.2);
const southEast=walls.find(w=>w.a[0]===7.2&&w.a[1]===12.8);
assert.equal(southNorth.openings?.length??0,0,'South bedroom north wall must be solid');
assert.ok(southEast.openings?.some(o=>o.kind==='door'),'South bedroom doorway must face east toward the bathroom');
assert.equal(walls.find(w=>w.a[0]===0&&w.a[1]===5&&w.b[0]===4).openings?.length??0,0,'North balcony boundary must be solid');
const terraceGlazing=walls.find(w=>w.a[0]===2.1&&w.a[1]===12.8&&w.b[0]===4);
assert.ok(terraceGlazing?.openings?.some(o=>o.kind==='window'&&o.bottom<.1&&o.top===2.8),'Terrace north-east gap must be glazed');
assert.ok(!walls.some(w=>w.a[1]===12.8&&w.b[1]===12.8&&w.a[0]<2.1),'Long balcony passage to terrace must remain open');
assert.equal(furnishings.filter(f=>f.kind==='bed').length,4);
assert.equal(furnishings.filter(f=>f.kind==='toilet').length,3);
assert.equal(furnishings.filter(f=>f.kind==='shower').length,3);
assert.ok(furnishings.some(f=>f.kind==='fridge')&&furnishings.some(f=>f.kind==='laundry'));
for(const id of ['north','south','suite','master']){
 const bed=furnishings.find(f=>f.id===id+'-bed'),west=id==='north'||id==='south';
 assert.ok(Math.abs(-Math.sin(bed.yaw??0)-(west?-1:1))<1e-8,`${id} bed head must face ${west?'west':'east'}`);
 const bounds=furnishingBounds(bed),wardrobes=furnishings.filter(f=>f.room===id&&f.kind==='wardrobe');
 for(const wardrobe of wardrobes){const r=furnishingBounds(wardrobe);assert.ok(bounds[2]<=r[0]||r[2]<=bounds[0]||bounds[3]<=r[1]||r[3]<=bounds[1],`${id} bed overlaps wardrobe`);}
}
assert.ok(furnishingBounds(furnishings.find(f=>f.id==='south-wardrobe'))[3]<13.5);
assert.ok(furnishingBounds(furnishings.find(f=>f.id==='north-wardrobe'))[1]>4.3);
assert.ok(['master','suite'].every(id=>furnishings.filter(f=>f.room===id&&f.kind==='wardrobe').length===2));
assert.ok(furnishings.some(f=>f.id==='lobby-shoes'&&f.x>8.6&&f.z>10.35));
assert.ok(walls.some(w=>w.a[0]===16.4&&w.a[1]===9.4&&w.b[1]===11.6&&!w.openings?.length),'Corridor far end must be closed');
obstacles.push(...furnishingObstacles,...fixtureObstacles,...coreObstacles);
const can=(x,z)=>floorRects.some(r=>contains(r,x,z))&&!obstacles.some(r=>x>r[0]-.16&&x<r[2]+.16&&z>r[1]-.16&&z<r[3]+.16);
for(const r of rooms)assert.ok(can(...r.position),`room spawn blocked ${r.id}`);
const start=rooms[0].position.map(v=>Math.round(v*10));
const seen=new Set(),q=[start];const key=(x,z)=>x+','+z;seen.add(key(...start));for(let i=0;i<q.length;i++){const[x,z]=q[i];for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=key(a,b);if(!seen.has(k)&&can(a/10,b/10)&&Math.abs(floorElevation(a/10,b/10)-floorElevation(x/10,z/10))<.2){seen.add(k);q.push([a,b]);}}}
const publicRooms = new Set(['lobby','hall','lift','stairs']);
for(const r of rooms.filter(r=>!publicRooms.has(r.id)))assert.ok(seen.has(key(Math.round(r.position[0]*10),Math.round(r.position[1]*10))),`No walk path to ${r.id}`);
assert.ok(!seen.has(key(106,106)), 'Closed entrance must separate apartment and lobby');
const publicSeen=new Set(), publicQueue=[[106,106]];publicSeen.add(key(106,106));
for(let i=0;i<publicQueue.length;i++){const[x,z]=publicQueue[i];for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=key(a,b);if(!publicSeen.has(k)&&can(a/10,b/10)&&Math.abs(floorElevation(a/10,b/10)-floorElevation(x/10,z/10))<.2){publicSeen.add(k);publicQueue.push([a,b]);}}}
for(const r of rooms.filter(r=>publicRooms.has(r.id)))assert.ok(publicSeen.has(key(Math.round(r.position[0]*10),Math.round(r.position[1]*10))),`No public path to ${r.id}`);
for(const f of furnishings.filter(f=>f.kind==='shower'))assert.ok(seen.has(key(Math.round(f.x*10),Math.round(f.z*10))),`Shower inaccessible: ${f.id}`);
assert.ok(publicSeen.has(key(124,72)),'Upper stair landing must be reachable via both flights');
assert.equal(floorElevation(12.4,7.2),3);
assert.equal(floorElevation(15.6,8),1.5);
console.log(`PASS: developer-plan bed directions and wardrobes; clear entry and shoe cabinet; closed corridor end; preserved door/balcony fixes; four dimension chains; 3m/6m heights; ${furnishings.length} furnishings; ${rooms.length} valid spawns; rooms reachable within apartment/public sections; closed entrance blocks passage; both stair flights climbable; ${seen.size} reachable floor-grid points.`);
