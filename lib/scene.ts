import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { rooms, floorRects, walls, contains, roomAt, type Rect } from './plan';
import { buildFurnishings } from './furnishings';
export type Mode='overview'|'walk'|'plan';
export type TourOptions={mode:Mode;ceiling:boolean;cutaway:boolean;dimensions:boolean;furniture:boolean};
export type TourApi={setOptions:(o:TourOptions)=>void;go:(id:string)=>void;reset:()=>void;move:(direction:string,pressed:boolean)=>void;dispose:()=>void};
export function createTour(host:HTMLElement,onPosition:(x:number,z:number,yaw:number,id:string)=>void):TourApi {
 const scene=new THREE.Scene(); scene.background=new THREE.Color('#e6e9e6');
 const camera=new THREE.PerspectiveCamera(46,1,.05,200);camera.rotation.order='YXZ';
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.localClippingEnabled=true;
 host.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','三维户型。拖动旋转；漫游模式下使用 W A S D 行走。');
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=6;controls.maxDistance=48;controls.maxPolarAngle=Math.PI/2-.04;
 const pmrem=new THREE.PMREMGenerator(renderer);const envScene=new RoomEnvironment();const environment=pmrem.fromScene(envScene,.03);scene.environment=environment.texture;scene.environmentIntensity=.25;envScene.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xfff8ec,0xa6aaa4,2.1));
 const sun=new THREE.DirectionalLight(0xfff4df,3.2);sun.position.set(-7,17,21);sun.target.position.set(7,0,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.5,far:55});sun.shadow.bias=-.0002;sun.shadow.normalBias=.015;sun.shadow.radius=4;scene.add(sun,sun.target);
 const wallMat=new THREE.MeshStandardMaterial({color:'#f4ecdf',roughness:.88});
 const stoneMat=new THREE.MeshStandardMaterial({color:'#ddd0b8',roughness:.72});
 const trimMat=new THREE.MeshStandardMaterial({color:'#e7ddca',roughness:.63});
 const ceilingMat=new THREE.MeshStandardMaterial({color:'#fff9ee',roughness:.92});
 const frameMat=new THREE.MeshStandardMaterial({color:'#817b6d',roughness:.43,metalness:.55});
 const glassMat=new THREE.MeshPhysicalMaterial({color:'#d4e6e5',roughness:.1,metalness:0,transparent:true,opacity:.15,depthWrite:false});
 const railMat=new THREE.MeshStandardMaterial({color:'#62665e',metalness:.45,roughness:.53});
 const glowMat=new THREE.MeshStandardMaterial({color:'#fff2c9',emissive:'#ffe2a0',emissiveIntensity:2});
 const boxGeometry=new THREE.BoxGeometry(1,1,1);const floors=new THREE.Group();const wallGroup=new THREE.Group();const ceilingGroup=new THREE.Group();const dimGroup=new THREE.Group();const caps=new THREE.Group();scene.add(floors,wallGroup,ceilingGroup,dimGroup,caps);
 const collisions:Rect[]=[];const solidParts:{x:number,z:number,w:number,d:number,b:number,t:number}[]=[];const trackedMaterials=new Set<THREE.Material>();const claddingMaterials:THREE.Material[]=[];
 function box(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material,parent:THREE.Object3D=scene,shadow=true){if(w<=0||h<=0||d<=0)return;const mesh=new THREE.Mesh(boxGeometry,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);trackedMaterials.add(mat);return mesh;}
 function tileMaterial(w:number,d:number,outdoor=false){const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d')!;ctx.fillStyle=outdoor?'#d8cbb7':'#e3d8c5';ctx.fillRect(0,0,512,512);let seed=4827;for(let i=0;i<13500;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%512;seed=(seed*1664525+1013904223)>>>0;const y=seed%512;ctx.fillStyle=i%2?'rgba(145,123,94,.028)':'rgba(255,252,240,.07)';ctx.fillRect(x,y,3,2);}ctx.fillStyle='#c0b6a6';ctx.fillRect(0,0,512,1.2);ctx.fillRect(0,0,1.2,512);const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(w/1.2,d/.6);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return new THREE.MeshStandardMaterial({map:texture,roughness:outdoor?.85:.34,metalness:0,envMapIntensity:.45});}
 for(const r of floorRects){const [x,z,x2,z2]=r;box((x+x2)/2,-.126,(z+z2)/2,x2-x,.22,z2-z,stoneMat,floors);const material=tileMaterial(x2-x,z2-z);box((x+x2)/2,-.008,(z+z2)/2,x2-x,.016,z2-z,material,floors,false);}
 // Dedicated anti-slip tile faces, continuous same cream family.
 for(const r of rooms.filter(r=>r.outdoor)){const [x,z,x2,z2]=r.rect;box((x+x2)/2,-.0055,(z+z2)/2,x2-x,.012,z2-z,tileMaterial(x2-x,z2-z,true),floors,false);}
 for(const wall of walls){const [ax,az]=wall.a,[bx,bz]=wall.b;const vertical=ax===bx;const length=Math.hypot(bx-ax,bz-az),height=wall.height??3,th=wall.thickness??(wall.external?.2:.12);const openings=[...(wall.openings??[])].sort((a,b)=>a.a-b.a);
  function part(start:number,end:number,bottom:number,top:number,mat:THREE.Material=wallMat){if(end-start<.001||top-bottom<.001)return;const mid=(start+end)/2;const x=vertical?ax:ax+mid,z=vertical?az+mid:az;const w=vertical?th:end-start,d=vertical?end-start:th;box(x,(bottom+top)/2,z,w,top-bottom,d,mat,wallGroup);if(bottom<1.9&&top>.25)collisions.push([x-w/2,z-d/2,x+w/2,z+d/2]);solidParts.push({x,z,w,d,b:bottom,t:top});if(bottom===0){box(x,.044,z,w+.014,.088,d+.014,trimMat,wallGroup,false);}
   for(const bathroom of rooms.filter(r=>r.id.startsWith('bath'))){const r=bathroom.rect;let from:number,to:number,offset:number;if(vertical){if(Math.abs(ax-r[0])<.01)offset=th/2+.01;else if(Math.abs(ax-r[2])<.01)offset=-th/2-.01;else continue;from=Math.max(az+start,r[1]);to=Math.min(az+end,r[3]);}else{if(Math.abs(az-r[1])<.01)offset=th/2+.01;else if(Math.abs(az-r[3])<.01)offset=-th/2-.01;else continue;from=Math.max(ax+start,r[0]);to=Math.min(ax+end,r[2]);}const hi=Math.min(top,2.85);if(to-from>.015&&hi>bottom){const finish=tileMaterial(to-from,hi-bottom);finish.roughness=.43;claddingMaterials.push(finish);box(vertical?ax+offset:(from+to)/2,(hi+bottom)/2,vertical?(from+to)/2:az+offset,vertical?.016:to-from,hi-bottom,vertical?to-from:.016,finish,wallGroup,false);}}
  }
  let cursor=0;for(const opening of openings){part(cursor,opening.a,0,height);part(opening.a,opening.b,0,opening.bottom);part(opening.a,opening.b,opening.top,height);
   const a=opening.a,b=opening.b,lo=opening.bottom,hi=opening.top;
   const frame=(s:number,e:number,l:number,h:number)=>{const mid=(s+e)/2;box(vertical?ax:ax+mid,(l+h)/2,vertical?az+mid:az,vertical?th+.02:e-s,h-l,vertical?e-s:th+.02,opening.kind==='door'?trimMat:frameMat,wallGroup);};
   frame(a,a+.045,lo,hi);frame(b-.045,b,lo,hi);frame(a,b,hi-.045,hi);
   if(opening.kind==='window'){frame(a,b,lo,lo+.04);const subdivisions=Math.max(1,Math.ceil((b-a)/1.25));for(let i=1;i<subdivisions;i++){const p=a+(b-a)*i/subdivisions;frame(p-.018,p+.018,lo,hi);}const mid=(a+b)/2;box(vertical?ax:ax+mid,(lo+hi)/2,vertical?az+mid:az,vertical?.015:b-a,hi-lo,vertical?b-a:.015,glassMat,wallGroup,false);if(lo<1.9)collisions.push(vertical?[ax-.06,az+a,ax+.06,az+b]:[ax+a,az-.06,ax+b,az+.06]);}
   cursor=b;
  }part(cursor,length,0,height);
 }
 // Balcony guardrails / genuine six-metre terrace columns; no mezzanine floor.
 function rail(ax:number,az:number,bx:number,bz:number){const vertical=ax===bx,length=Math.hypot(bx-ax,bz-az);box((ax+bx)/2,.1,(az+bz)/2,vertical?.14:length,.2,vertical?length:.14,stoneMat);box((ax+bx)/2,1.15,(az+bz)/2,vertical?.05:length,.045,vertical?length:.05,railMat);for(let t=0;t<=length;t+=.13)box(vertical?ax:ax+t,.65,vertical?az+t:az,.018,1,.018,railMat,scene,false);collisions.push([Math.min(ax,bx)-.1,Math.min(az,bz)-.1,Math.max(ax,bx)+.1,Math.max(az,bz)+.1]);}
 rail(0,5,0,17.8);rail(0,17.8,4,17.8);rail(4,16.7,4,17.8);
 for(const [x,z,h] of [[0,5,3],[0,12.8,6],[0,17.8,6],[4,17.8,6]]){box(x,h/2,z,.32,h,.32,wallMat);collisions.push([x-.16,z-.16,x+.16,z+.16]);}
 // The common lift/stair core is outside the apartment, retained only as an orientation footprint.
 const coreMat=new THREE.MeshStandardMaterial({color:'#bdc1bd',roughness:1});box(12.6,-.05,9.1,7.8,.13,5,coreMat);
 // Exact structural heights: ceiling surface at 3m / 6m; shallow perimeter soffit at 2.85m / 5.85m.
 const ceilingRects:Rect[]=[[4,0,7,1.4],[4,1.4,7,5],[7,1.4,10.2,5],[10.2,1.4,13.5,6.6],[13.5,2.3,15.2,6.6],[8.6,5,10.2,6.6],[2.1,5,8.6,11.6],[2.1,11.6,9,12.8],[0,5,2.1,12.8],[4,12.8,7.2,16.7],[7.2,12.8,9,16.7],[9,11.6,13.1,16.7],[13.1,11.6,15.2,16.7],[0,12.8,4,17.8]];
 for(const r of ceilingRects){const [x,z,x2,z2]=r,w=x2-x,d=z2-z,h=x===0&&z===12.8?6:3;box((x+x2)/2,h+.07,(z+z2)/2,w,.14,d,ceilingMat,ceilingGroup);const inset=.26;box((x+x2)/2,h-.075,z+inset/2,w,.15,inset,ceilingMat,ceilingGroup);box((x+x2)/2,h-.075,z2-inset/2,w,.15,inset,ceilingMat,ceilingGroup);box(x+inset/2,h-.075,(z+z2)/2,inset,.15,d,ceilingMat,ceilingGroup);box(x2-inset/2,h-.075,(z+z2)/2,inset,.15,d,ceilingMat,ceilingGroup);
  if(w>2&&d>2){box((x+x2)/2,h-.105,z+.265,w-.54,.015,.025,glowMat,ceilingGroup,false);box((x+x2)/2,h-.105,z2-.265,w-.54,.015,.025,glowMat,ceilingGroup,false);for(const xx of [x+.55,x2-.55])for(const zz of [z+.55,z2-.55]){const disc=new THREE.Mesh(new THREE.CylinderGeometry(.042,.042,.014,16),glowMat);disc.position.set(xx,h-.16,zz);ceilingGroup.add(disc);}}
 }
 const fitted=buildFurnishings();scene.add(fitted.group,fitted.ceilingFixtures);
 // Restrained shadow catcher below the apartment, not another storey.
 box(7.6,-.47,8.9,200,.08,200,new THREE.MeshStandardMaterial({color:'#e0e3dd',roughness:1}),scene,false);
 const dimensionMat=new THREE.LineBasicMaterial({color:'#7e6d54',depthTest:false});
 function line(points:number[][]){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p as [number,number,number])));const l=new THREE.Line(g,dimensionMat);l.renderOrder=4;dimGroup.add(l);}
 function label(text:string,x:number,y:number,z:number,scale=1.5){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle='rgba(255,253,246,.96)';ctx.beginPath();ctx.roundRect(4,4,504,120,20);ctx.fill();ctx.fillStyle='#514637';ctx.font='500 48px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);const texture=new THREE.CanvasTexture(c);const m=new THREE.SpriteMaterial({map:texture,depthTest:false});const s=new THREE.Sprite(m);s.position.set(x,y,z);s.scale.set(scale,scale/4,1);s.renderOrder=6;dimGroup.add(s);}
 function dimX(a:number,b:number,z:number,text:string){line([[a,.06,z],[b,.06,z]]);for(const x of[a,b])line([[x,.06,z-.13],[x,.06,z+.13]]);label(text,(a+b)/2,.12,z,.95);}
 let offset=0;for(const len of [4,3.2,1.8,4.1,2.1]){dimX(offset,offset+len,18.65,(len*1000).toFixed(0));offset+=len;}dimX(0,15.2,-1.1,'15 200 mm');
 line([[-.9,.08,0],[-.9,.08,17.8]]);label('17 800 mm',-.9,.2,8.9,2);line([[-.5,0,17.8],[-.5,6,17.8]]);label('6 000 mm',-.5,4.4,17.8,1.8);label('3 000 mm',-0.2,3.15,8,1.6);
 for(const r of rooms.filter(r=>!r.id.startsWith('bath')&&r.id!=='entry'))label(r.name,r.position[0],.15,r.position[1],1.35);
 label('北 ↑',7.6,.1,-2,1.2);label('挑空 · 无楼板',2,.1,2.5,2);label('公共电梯 / 楼梯',12.7,.11,9.1,2.5);
 const clipPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),1.2);
 for(const p of solidParts)if(p.b<1.2&&p.t>1.2)box(p.x,1.198,p.z,p.w,.008,p.d,trimMat,caps,false);
 let options:TourOptions={mode:'overview',ceiling:false,cutaway:true,dimensions:false,furniture:true};let selected='living',yaw=Math.PI,pitch=0,drag=false,downX=0,downY=0,lastX=0,lastY=0,moved=0,frame=0,prevTime=0,lastReport=0;const pressed=new Set<string>();
 function applyOptions(){controls.enabled=options.mode!=='walk';ceilingGroup.visible=options.ceiling;fitted.group.visible=options.furniture;fitted.ceilingFixtures.visible=options.ceiling&&options.furniture;dimGroup.visible=options.dimensions&&options.mode!=='walk';const cut=options.cutaway&&options.mode!=='walk';for(const mat of[wallMat,trimMat,frameMat,glassMat,...claddingMaterials]){mat.clippingPlanes=cut?[clipPlane]:[];mat.needsUpdate=true;}caps.visible=cut;renderer.toneMappingExposure=options.mode==='walk'?1.27:1.1;controls.enableRotate=options.mode!=='plan';}
 function setWalk(id:string){const room=rooms.find(r=>r.id===id)??rooms[0];selected=id;yaw=room.yaw;pitch=0;camera.position.set(room.position[0],1.65,room.position[1]);camera.rotation.set(pitch,yaw,0);camera.fov=65;camera.updateProjectionMatrix();onPosition(camera.position.x,camera.position.z,yaw,id);}
 function view(mode:Mode){if(mode==='walk'){setWalk(selected);return;}camera.fov=46;camera.updateProjectionMatrix();controls.target.set(7.6,0,8.9);if(mode==='plan')camera.position.set(7.6,30,8.901);else camera.position.set(27,23,31);controls.update();}
 function canWalk(x:number,z:number){const radius=.16;if(!floorRects.some(r=>contains(r,x,z)))return false;const hits=(r:Rect)=>x>r[0]-radius&&x<r[2]+radius&&z>r[1]-radius&&z<r[3]+radius;return !collisions.some(hits)&&(!options.furniture||!fitted.obstacles.some(hits));}
 function advance(dx:number,dz:number){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));for(let i=0;i<steps;i++){if(canWalk(camera.position.x+dx/steps,camera.position.z))camera.position.x+=dx/steps;if(canWalk(camera.position.x,camera.position.z+dz/steps))camera.position.z+=dz/steps;}}
 function down(e:PointerEvent){if(options.mode!=='walk')return;renderer.domElement.focus();drag=true;downX=lastX=e.clientX;downY=lastY=e.clientY;moved=0;renderer.domElement.setPointerCapture(e.pointerId);}
 function motion(e:PointerEvent){if(!drag||options.mode!=='walk')return;const dx=e.clientX-lastX,dy=e.clientY-lastY;moved+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-1.25,1.25);camera.rotation.set(pitch,yaw,0);lastX=e.clientX;lastY=e.clientY;}
 function up(e:PointerEvent){if(!drag)return;drag=false;if(moved<6&&options.mode==='walk'){const rect=renderer.domElement.getBoundingClientRect();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((downX-rect.left)/rect.width*2-1,-(downY-rect.top)/rect.height*2+1),camera);const hit=ray.intersectObjects(floors.children,false)[0];if(hit&&hit.distance<12){advance(hit.point.x-camera.position.x,hit.point.z-camera.position.z);}}if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);}
 function keyboard(e:KeyboardEvent){if(options.mode!=='walk'||(e.target instanceof HTMLElement&&e.target.closest('button,input,[role="dialog"]')))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].includes(e.code)){e.preventDefault();pressed.add(e.code);}}
 const release=(e:KeyboardEvent)=>pressed.delete(e.code);const blur=()=>{pressed.clear();drag=false;};
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',motion);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',blur);window.addEventListener('keydown',keyboard);window.addEventListener('keyup',release);window.addEventListener('blur',blur);
 const resize=new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();if(width&&height){renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}});resize.observe(host);
 function animate(time:number){const dt=Math.min((time-prevTime)/1000,.05);prevTime=time;if(options.mode==='walk'){let f=Number(pressed.has('KeyW')||pressed.has('ArrowUp'))-Number(pressed.has('KeyS')||pressed.has('ArrowDown'));let r=Number(pressed.has('KeyD'))-Number(pressed.has('KeyA'));const normal=Math.hypot(f,r)||1;f/=normal;r/=normal;const speed=(pressed.has('ShiftLeft')?3:1.7)*dt;advance((-Math.sin(yaw)*f+Math.cos(yaw)*r)*speed,(-Math.cos(yaw)*f-Math.sin(yaw)*r)*speed);if(pressed.has('ArrowLeft'))yaw+=dt*1.4;if(pressed.has('ArrowRight'))yaw-=dt*1.4;camera.rotation.set(pitch,yaw,0);if(time-lastReport>150){const room=roomAt(camera.position.x,camera.position.z);onPosition(camera.position.x,camera.position.z,yaw,room?.id??selected);lastReport=time;}}else controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate);}
 view('overview');applyOptions();frame=requestAnimationFrame(animate);
 return {
  setOptions(o){const changed=options.mode!==o.mode,restoreFurniture=!options.furniture&&o.furniture;options=o;pressed.clear();applyOptions();if(changed)view(o.mode);else if(restoreFurniture&&o.mode==='walk'&&!canWalk(camera.position.x,camera.position.z))setWalk(roomAt(camera.position.x,camera.position.z)?.id??selected);},
  go(id){selected=id;if(options.mode==='walk')setWalk(id);else{const r=rooms.find(r=>r.id===id)!;controls.target.set(r.position[0],0,r.position[1]);camera.position.set(r.position[0]+8,12,r.position[1]+10);controls.update();}},
  reset(){view(options.mode);},
  move(direction,active){if(active)pressed.add(direction);else pressed.delete(direction);},
  dispose(){cancelAnimationFrame(frame);resize.disconnect();controls.dispose();window.removeEventListener('keydown',keyboard);window.removeEventListener('keyup',release);window.removeEventListener('blur',blur);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',motion);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',blur);const geometries=new Set<THREE.BufferGeometry>();scene.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Line||obj instanceof THREE.Sprite){if('geometry'in obj)geometries.add(obj.geometry);for(const m of(Array.isArray(obj.material)?obj.material:[obj.material]))trackedMaterials.add(m);}});for(const g of geometries)g.dispose();for(const m of trackedMaterials){const mat=m as THREE.MeshStandardMaterial;if(mat.map)mat.map.dispose();m.dispose();}environment.dispose();renderer.dispose();renderer.domElement.remove();}
 };
}
