import assert from 'node:assert/strict';
import {DIMENSIONS as d,rooms,walls,floorRects,contains} from '../lib/plan.ts';
import {furnishings,furnishingObstacles,fixtureObstacles} from '../lib/furniture-layout.ts';
const sum=a=>a.reduce((x,y)=>x+y,0);for(const [a,b] of [[d.northChain,15.2],[d.southChain,15.2],[d.westChain,17.8],[d.eastChain,16.7]])assert.ok(Math.abs(sum(a)-b)<1e-8);
assert.ok(rooms.every(r=>r.height===(r.id==='terrace'?6:3)));assert.deepEqual(rooms.find(r=>r.id==='terrace').rect,[0,12.8,4,17.8]);
const obstacles=[];for(const w of walls){const v=w.a[0]===w.b[0],t=w.thickness??(w.external?.2:.12),L=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);let c=0;const add=(s,e)=>{if(e>s)obstacles.push(v?[w.a[0]-t/2,w.a[1]+s,w.a[0]+t/2,w.a[1]+e]:[w.a[0]+s,w.a[1]-t/2,w.a[0]+e,w.a[1]+t/2])};for(const o of w.openings??[]){assert.ok(o.a>=c&&o.b<=L+1e-8&&o.b>o.a,JSON.stringify(w));add(c,o.a);if(o.kind==='window')add(o.a,o.b);c=o.b;}add(c,L)}
const southNorth=walls.find(w=>w.a[0]===4&&w.a[1]===12.8&&w.b[0]===7.2);
const southEast=walls.find(w=>w.a[0]===7.2&&w.a[1]===12.8);
assert.equal(southNorth.openings?.length??0,0,'South bedroom north wall must be solid');
assert.ok(southEast.openings?.some(o=>o.kind==='door'),'South bedroom doorway must face east toward the bathroom');
assert.equal(walls.find(w=>w.a[0]===0&&w.a[1]===5&&w.b[0]===4).openings?.length??0,0,'North balcony boundary must be solid');
assert.equal(furnishings.filter(f=>f.kind==='bed').length,4);
assert.equal(furnishings.filter(f=>f.kind==='toilet').length,3);
assert.equal(furnishings.filter(f=>f.kind==='shower').length,3);
assert.ok(furnishings.some(f=>f.kind==='fridge')&&furnishings.some(f=>f.kind==='laundry'));
obstacles.push(...furnishingObstacles,...fixtureObstacles);
const can=(x,z)=>floorRects.some(r=>contains(r,x,z))&&!obstacles.some(r=>x>r[0]-.16&&x<r[2]+.16&&z>r[1]-.16&&z<r[3]+.16);
for(const r of rooms)assert.ok(can(...r.position),`room spawn blocked ${r.id}`);
const start=rooms[0].position.map(v=>Math.round(v*10));
const seen=new Set(),q=[start];const key=(x,z)=>x+','+z;seen.add(key(...start));for(let i=0;i<q.length;i++){const[x,z]=q[i];for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=key(a,b);if(!seen.has(k)&&can(a/10,b/10)){seen.add(k);q.push([a,b]);}}}
for(const r of rooms)assert.ok(seen.has(key(Math.round(r.position[0]*10),Math.round(r.position[1]*10))),`No walk path to ${r.id}`);
for(const f of furnishings.filter(f=>f.kind==='shower'))assert.ok(seen.has(key(Math.round(f.x*10),Math.round(f.z*10))),`Shower inaccessible: ${f.id}`);
console.log(`PASS: corrected door and balcony wall; four dimension chains; 3m/6m heights; ${furnishings.length} furnishings; ${rooms.length} valid spawns; all furnished rooms connected via doorways; ${seen.size} floor-grid points reachable.`);
