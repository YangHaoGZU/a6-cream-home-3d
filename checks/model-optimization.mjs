import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
const input=process.argv[2];
if(!input)throw Error('Pass the uncompressed source GLB');
async function read(file){const b=await fs.readFile(file);const start=performance.now();const g=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');console.log(file,b.length,'bytes, parse',Math.round(performance.now()-start),'ms');g.scene.updateMatrixWorld(true);return g.scene;}
const old=await read(input),optimized=await read('public/models/a6-modern-v3.glb');
function summarize(scene){const result=new Map();scene.traverse(o=>{if(!o.isMesh)return;let p=o;while(p&&!p.userData.category)p=p.parent;const cat=p?.userData.category;const row=result.get(cat)??{triangles:0,bounds:new THREE.Box3()};row.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;row.bounds.union(new THREE.Box3().setFromObject(o));result.set(cat,row);});return result;}
const a=summarize(old),b=summarize(optimized);
assert.deepEqual([...a.keys()].sort(),[...b.keys()].sort());
for(const [cat,before] of a){const after=b.get(cat);assert.equal(before.triangles,after.triangles);for(const edge of ['min','max'])for(const axis of ['x','y','z'])assert.ok(Math.abs(before.bounds[edge][axis]-after.bounds[edge][axis])<.005,`${cat} ${edge} ${axis} moved`);}
console.log('PASS: every category retains its triangle count and bounds within 5 mm.');
