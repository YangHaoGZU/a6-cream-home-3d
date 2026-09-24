import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
const b=await build({stdin:{contents:"export * from './lib/plan';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {rooms,DIMENSIONS}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const model=JSON.parse(fs.readFileSync('lib/generated/nordic-overview.json'));
const design=JSON.parse(fs.readFileSync('lib/generated/design-manifest.json'));
assert.equal(DIMENSIONS.height,3);assert.equal(DIMENSIONS.terraceHeight,6);
assert.equal(DIMENSIONS.eastLength,16.4);assert.equal(rooms.length,18);
for(const chain of ['northChain','southChain'])assert.ok(Math.abs(DIMENSIONS[chain].reduce((a,b)=>a+b)-15.2)<1e-8);
for(const c of design.checks)if('pass_' in c)assert.equal(c.pass_,true,c.check);
for(const f of design.fixtures){assert.equal(f.facing,'east');assert.equal(f.backing_wall,'west');assert.equal(f.rear_gap_m,.02);}
const beds=design.checks.filter(c=>c.check.includes('bed contained'));assert.equal(beds.length,4);
for(const g of model.groups){assert.equal(g.positions.length%3,0);assert.equal(g.indices.length%3,0);assert.ok(g.indices.every(i=>i>=0&&i<g.positions.length/3));}
assert.equal(model.groups.reduce((n,g)=>n+g.indices.length/3,0),model.triangles);
assert.equal(model.actualRoomHeight,3);assert.equal(model.actualTerraceHeight,6);
console.log('PASS: exported mesh indices, room dimensions, four beds, corrected fixtures and approved design checks.');
