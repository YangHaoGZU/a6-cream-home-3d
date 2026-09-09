import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {build} from 'esbuild';
const bundled=await build({stdin:{contents:"export {rooms,floorElevation} from './lib/plan';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {rooms,floorElevation}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const buf=await fs.readFile('public/models/a6-modern-v3.glb');
const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),'',resolve,reject));
gltf.scene.updateMatrixWorld(true);
const cats=new Set();let tris=0;
gltf.scene.traverse(o=>{if(o.userData.category)cats.add(o.userData.category);if(o.isMesh)tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
assert.deepEqual([...cats].sort(),['architecture','ceilings','facade','furniture']);
for(const r of rooms){const eye=new THREE.Vector3(r.position[0],1.65+floorElevation(...r.position),r.position[1]);for(const dir of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]){const ray=new THREE.Raycaster(eye,new THREE.Vector3(...dir),0,.10);assert.equal(ray.intersectObject(gltf.scene,true).length,0,`Spawn intersects exported model: ${r.id}`);}}
const doorRay=new THREE.Raycaster(new THREE.Vector3(7.8,1.2,9.7),new THREE.Vector3(1,0,0),0,1.2);
assert.ok(doorRay.intersectObject(gltf.scene,true).some(h=>Math.abs(h.point.x-8.6)<.05),'Closed entry door missing from export');
console.log('PASS: exported Blender model parsed, four display categories, all 18 room spawns clear, closed door present;',Math.round(tris),'triangles');
