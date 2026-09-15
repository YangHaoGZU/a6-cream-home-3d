import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { floorTileCells } from './floor-tiles';
import { walls, rooms, contains, type Rect } from './plan';
import { furnishings } from './furniture-layout';

// This small, self-contained model is built from metre-based floor-plan data.
// It contains no GLB, raster textures, texture decoders or Blender dependencies.
export function buildOverviewModel() {
  const root = new THREE.Group();
  root.name = 'A6-french-natural-overview';
  const palette = {
    plaster: '#f0e8da', linen: '#eee5d4', oak: '#b38b5b', stone: '#d8cbbc',
    dark: '#3c3832', brass: '#a68b5d', green: '#75805a', glass: '#afc4bd', rug: '#cec5ae',
  };
  type MaterialKey = keyof typeof palette;
  const batches = new Map<MaterialKey, THREE.BufferGeometry[]>();
  const dummy = new THREE.Object3D();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  const leafGeo = new THREE.IcosahedronGeometry(1, 0);
  const put = (geo: THREE.BufferGeometry, color: MaterialKey, x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, yaw, 0); dummy.scale.set(w, h, d); dummy.updateMatrix();
    const g = geo.clone().applyMatrix4(dummy.matrix);
    const list = batches.get(color) ?? []; list.push(g); batches.set(color, list);
  };
  const box = (color: MaterialKey, x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0) => put(boxGeo, color, x, y, z, w, h, d, yaw);
  const cyl = (color: MaterialKey, x: number, y: number, z: number, r: number, h: number, rz = r) => put(cylinderGeo, color, x, y, z, r, h, rz);
  const rect = (r: Rect, y: number, h: number, color: MaterialKey) => box(color, (r[0] + r[2]) / 2, y, (r[1] + r[3]) / 2, r[2] - r[0], h, r[3] - r[1]);
  const cells = floorTileCells();
  for (const c of cells) rect(c.rect, -.09, .18, 'oak');

  // Herringbone tile joints are cheap line geometry, clipped to the floor union.
  const lines: number[] = [];
  function clippedLine(x1: number, z1: number, x2: number, z2: number, r: Rect) {
    const dx = x2 - x1, dz = z2 - z1;
    let a = 0, b = 1;
    for (const [p, q] of [[-dx, x1-r[0]], [dx, r[2]-x1], [-dz, z1-r[1]], [dz, r[3]-z1]]) {
      if (!p) { if (q < 0) return; continue; }
      const t = q / p;
      if (p < 0) a = Math.max(a,t); else b = Math.min(b,t);
      if (a >= b) return;
    }
    lines.push(x1+a*dx,.012,z1+a*dz,x1+b*dx,.012,z1+b*dz);
  }
  const rotate = (x: number, z: number) => [(x-z)*Math.SQRT1_2, (x+z)*Math.SQRT1_2];
  for (let i=-22;i<=22;i++) for (let j=-30;j<=50;j++) {
    const x=i*.9+j*.18,z=-i*.9+j*.18;
    const a=rotate(x,z), b=rotate(x+.9,z), c=rotate(x,z+.18), d=rotate(x,z+1.08);
    for (const cell of cells) {
      clippedLine(...a as [number,number],...b as [number,number],cell.rect);
      clippedLine(...c as [number,number],...d as [number,number],cell.rect);
    }
  }
  const tileLines = new THREE.BufferGeometry();
  tileLines.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
  root.add(new THREE.LineSegments(tileLines,new THREE.LineBasicMaterial({color:'#d3bfa0',transparent:true,opacity:.55})));
  for (const room of rooms.filter(r=>['bath1','bath2','bath3','kitchen','utility','lobby','hall','lift','stairs'].includes(r.id)))
    rect(room.rect,.023,.02,'stone');

  // Dollhouse section: retain wall footprints/openings and show a consistent low
  // cut height. The section height is not the actual room height (3m / 6m).
  const wallTop = 1.2;
  for (const w of walls) {
    const vertical = w.a[0] === w.b[0], len=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);
    const thickness=w.thickness??(w.external?.18:.12);
    const segment=(s:number,e:number,height=wallTop,color:MaterialKey='plaster')=>{
      if(e<=s||height<=0)return;
      box(color,w.a[0]+(vertical?0:(s+e)/2),height/2,w.a[1]+(vertical?(s+e)/2:0),vertical?thickness:e-s,height,vertical?e-s:thickness);
      if(color==='plaster') box('linen',w.a[0]+(vertical?0:(s+e)/2),height-.055,w.a[1]+(vertical?(s+e)/2:0),vertical?thickness+.025:e-s,.045,vertical?e-s:thickness+.025);
    };
    let previous=0;
    for(const o of w.openings??[]) {
      segment(previous,o.a);
      if(o.kind==='window') { segment(o.a,o.b,Math.min(o.bottom,wallTop)); segment(o.a,o.b,.035,'dark'); }
      previous=o.b;
    }
    segment(previous,len);
  }
  // Glazed west long balcony and six-metre terrace section footprint.
  for (let z=5;z<12.8;z+=1.3) {
    box('dark',.025,.56,Math.min(z+1.3,12.8),.045,1.12,.045);
    box('glass',.02,.4,z+.6,.024,.76,1.2);
  }
  box('dark',.02,1.13,8.9,.05,.045,7.8);
  for (const r of [[-.02,12.8,.035,17.8],[0,17.76,4,17.81]] as Rect[])rect(r,.49,.98,'glass');
  box('oak',8.59,.58,9.7,.075,1.16,1.21); // closed front door

  for (const f of furnishings) {
    const a=f.yaw??0, c=Math.cos(a),s=Math.sin(a);
    const local=(color:MaterialKey,x:number,y:number,z:number,w:number,h:number,d:number)=>box(color,f.x+x*c+z*s,y,f.z-x*s+z*c,w,h,d,a);
    const legs=(w:number,d:number,h=.67)=>{for(const x of [-w/2+.065,w/2-.065])for(const z of [-d/2+.065,d/2-.065])local('oak',x,h/2,z,.06,h,.06);};
    switch(f.kind) {
      case 'bed':
        local('rug',0,.047,.25,f.w+.65,.02,f.d+.55);
        local('oak',0,.2,0,f.w,.32,f.d);
        local('linen',0,.47,0,f.w-.04,.23,f.d-.06);
        local('linen',0,.82,-f.d/2+.06,f.w+.06,.78,.12);
        local('stone',0,.61,.45,f.w-.08,.035,.48);
        for(const x of [-f.w*.24,f.w*.24]) local('plaster',x,.65,-f.d*.31,f.w*.4,.15,.38);
        break;
      case 'sofa': case 'armchair': {
        const wide=f.kind==='sofa',w=f.w,d=f.d;
        local('oak',0,.13,0,w-.12,.17,d-.12);
        local('linen',0,.4,0,w,.4,d);
        local('linen',0,.72,-d/2+.11,w,.48,.21);
        for(const x of [-w/2+.1,w/2-.1])local('linen',x,.55,0,.2,.5,d);
        for(const x of wide?[-w*.26,w*.26]:[0])local('plaster',x,.62,-.15,wide?.58:.38,.26,.21);
        break;
      }
      case 'diningtable':
        local('oak',0,.74,0,f.w,.09,f.d);
        local('oak',-.55,.36,0,.27,.72,.52);local('oak',.55,.36,0,.27,.72,.52);break;
      case 'chair':
        legs(f.w,f.d,.43);local('linen',0,.46,0,f.w,.09,f.d);
        local('oak',0,.75,-f.d/2+.03,f.w,.5,.05);local('rug',0,.76,-f.d/2-.002,f.w-.08,.35,.015);break;
      case 'coffee':
        cyl('stone',f.x,.39,f.z,f.w*.5,.09,f.d*.5);cyl('stone',f.x,.2,f.z,f.w*.22,.34,f.d*.25);break;
      case 'tvwall':
        local('oak',0,.29,0,f.w,.52,.36);local('dark',0,.93,-.02,f.w*.72,.68,.055);break;
      case 'wardrobe': case 'entrycabinet':
        local('plaster',0,.59,0,f.w,1.16,f.d);
        for(let x=-f.w/2+.36;x<f.w/2;x+=.6)local('brass',x,.7,f.d/2+.015,.025,.22,.025);break;
      case 'kitchenrun':
        local('plaster',0,.44,0,f.w,.86,f.d);local('stone',0,.9,0,f.w+.04,.06,f.d+.03);
        local(f.variant==='hob'?'dark':'glass',0,.94,0,.61,.025,.39);
        break;
      case 'fridge':
        local('plaster',0,.65,0,f.w,1.3,f.d);local('brass',f.w*.35,.85,f.d/2,.03,.28,.025);break;
      case 'laundry':
        local('plaster',0,.65,0,f.w,1.3,f.d);
        for(const y of [.32,.99])local('dark',0,y,f.d/2+.02,.37,.37,.025);break;
      case 'vanity':
        local('oak',0,.53,0,f.w,.58,f.d);local('plaster',0,.86,0,f.w+.02,.12,f.d);local('glass',0,.932,0,f.w*.7,.018,f.d*.65);break;
      case 'toilet':
        cyl('plaster',f.x,.31,f.z,f.w*.45,.42,f.d*.43);local('plaster',0,.61,-f.d*.34,f.w,.37,.17);break;
      case 'shower':
        local('stone',0,.055,0,f.w,.05,f.d);local('glass',0,.58,f.d/2,f.w,1.1,.025);break;
      case 'tub':
        local('plaster',0,.31,0,f.w,.57,f.d);local('glass',0,.605,0,f.w-.17,.025,f.d-.17);break;
      case 'plant': {
        const h=Math.min(f.h??1.3,1.6);
        cyl('stone',f.x,.22,f.z,.22,.4);cyl('oak',f.x,h/2,f.z,.04,h);
        put(leafGeo,'green',f.x,h*.8,f.z,.4,.5,.36);break;
      }
      case 'sideboard':case 'console':case 'nightstand':case 'desk':
        legs(f.w,f.d,.65);local('oak',0,.71,0,f.w,.14,f.d);break;
      // High pendants and AC units are omitted in the open-top miniature.
    }
  }
  rect([3.75,9.65,6.8,11.82],.038,.02,'rug');
  // Outdoor umbrella uses only ten triangles per surface.
  cyl('oak',1.6,1.1,15.3,.035,2.2);
  const canopy=new THREE.ConeGeometry(1.2,.38,10,1,true);
  put(canopy,'linen',1.6,2.18,15.3,1,1,1);canopy.dispose();
  for(let i=0;i<9;i++)box('stone',12.8+(i+.5)*2.35/9,(i+1)*1.5/18,8.71,2.35/9,(i+1)*1.5/9,1.06);
  rect([15.15,6.77,16.27,9.25],.75,1.5,'stone');
  for(let i=0;i<9;i++)box('stone',15.15-(i+.5)*2.35/9,1.5+(i+1)*1.5/18,7.27,2.35/9,(i+1)*1.5/9,1);
  box('dark',9.72,.65,8.92,1.22,1.3,.05);
  box('plaster',14.1,.55,9.78,4.4,1.1,.73);

  let triangles=0;
  for(const [key,geometries] of batches) {
    const merged=mergeGeometries(geometries);
    for(const g of geometries)g.dispose();
    if(!merged)throw new Error('Overview geometry merge failed');
    const material=new THREE.MeshLambertMaterial({color:palette[key]});
    const mesh=new THREE.Mesh(merged,material);mesh.name=key;root.add(mesh);
    triangles+=(merged.index?.count??merged.attributes.position.count)/3;
  }
  boxGeo.dispose();cylinderGeo.dispose();leafGeo.dispose();
  root.userData={triangles,drawCalls:root.children.length,style:'french-natural',wallSectionHeight:wallTop,actualRoomHeight:3,actualTerraceHeight:6};
  return root;
}
