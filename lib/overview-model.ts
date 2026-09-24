import * as THREE from 'three';
import model from './generated/nordic-overview.json';
// Quantized meshes exported from the approved Blender scene, in metres.
export function buildOverviewModel() {
 const root = new THREE.Group(); root.name='A6-modern-nordic-overview';
 for(const b of model.groups){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.positions.map(v=>v/model.quantization),3));g.setIndex(b.indices);g.computeVertexNormals();g.computeBoundingSphere();
  const m=new THREE.MeshStandardMaterial({color:b.color,roughness:.88,flatShading:true,transparent:b.opacity<1,opacity:b.opacity,depthWrite:b.opacity===1,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(g,m);mesh.name=b.name;root.add(mesh);
 }
 root.userData={triangles:model.triangles,sourceSHA256:model.sourceSHA256,revision:model.revision};return root;
}
