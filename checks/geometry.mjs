import assert from 'node:assert/strict';
import {DIMENSIONS as d,rooms,walls,floorRects,contains} from '../lib/plan.ts';
const sum=a=>a.reduce((x,y)=>x+y,0);for(const [a,b] of [[d.northChain,15.2],[d.southChain,15.2],[d.westChain,17.8],[d.eastChain,16.7]])assert.ok(Math.abs(sum(a)-b)<1e-8);
assert.ok(rooms.every(r=>r.height===(r.id==='terrace'?6:3)));assert.deepEqual(rooms.find(r=>r.id==='terrace').rect,[0,12.8,4,17.8]);
const obstacles=[];for(const w of walls){const v=w.a[0]===w.b[0],t=w.thickness??(w.external?.2:.12),L=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);let c=0;const add=(s,e)=>{if(e>s)obstacles.push(v?[w.a[0]-t/2,w.a[1]+s,w.a[0]+t/2,w.a[1]+e]:[w.a[0]+s,w.a[1]-t/2,w.a[0]+e,w.a[1]+t/2])};for(const o of w.openings??[]){assert.ok(o.a>=c&&o.b<=L+1e-8&&o.b>o.a,JSON.stringify(w));add(c,o.a);if(o.kind==='window')add(o.a,o.b);c=o.b;}add(c,L)}
const can=(x,z)=>floorRects.some(r=>contains(r,x,z))&&!obstacles.some(r=>x>r[0]-.16&&x<r[2]+.16&&z>r[1]-.16&&z<r[3]+.16);
for(const r of rooms)assert.ok(can(...r.position),`room spawn blocked ${r.id}`);
const seen=new Set(),q=[[52,94]];const key=(x,z)=>x+','+z;seen.add(key(52,94));for(let i=0;i<q.length;i++){const[x,z]=q[i];for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=key(a,b);if(!seen.has(k)&&can(a/10,b/10)){seen.add(k);q.push([a,b]);}}}
for(const r of rooms)assert.ok(seen.has(key(Math.round(r.position[0]*10),Math.round(r.position[1]*10))),`No walk path to ${r.id}`);
console.log(`PASS: four dimension chains; 3m/6m heights; ${rooms.length} valid spawns; all rooms connected via doorways; ${seen.size} floor-grid points reachable.`);
