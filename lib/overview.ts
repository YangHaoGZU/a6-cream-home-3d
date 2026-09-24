import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildOverviewModel } from './overview-model';
import { OverviewTap } from './overview-gesture';
import { panoramaPoints } from './panorama-data';
import { fittedOverviewDistance } from './navigation';
import { floorElevation } from './plan';
import { separateMarkers, type ProjectedPoint } from './overview-markers';
export type { ProjectedPoint } from './overview-markers';

export function createOverview(host:HTMLElement, onProject:(points:ProjectedPoint[])=>void, onSelect:(id:string)=>void) {
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor('#e5e0d7');
  const canvas=renderer.domElement;
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','空间总览模型。单指或鼠标拖动旋转，双指缩放和平移，点击编号进入全景。');
  host.appendChild(canvas);
  const scene=new THREE.Scene();
  const model=buildOverviewModel();scene.add(model);
  scene.add(new THREE.HemisphereLight('#fff8e9','#b2a494',2.1));
  const light=new THREE.DirectionalLight('#fff4d8',2.1);light.position.set(-10,25,18);scene.add(light);
  const fill=new THREE.DirectionalLight('#e5eeff',.7);fill.position.set(15,16,-14);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(46,1,.1,250);
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=false;
  controls.minDistance=8;controls.maxDistance=130;
  controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.43;
  controls.target.set(8.2,.2,8.9);
  controls.touches.ONE=THREE.TOUCH.ROTATE;
  controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;
  controls.screenSpacePanning=true;
  let frame=0,disposed=false,first=true;
  let projected:ProjectedPoint[]=[];
  let focusedId:string|null=null;
  const pointPositions=panoramaPoints.map(p=>({id:p.id,position:new THREE.Vector3(p.position[0],Math.max(1.35,floorElevation(...p.position)+.35),p.position[1])}));
  const draw=()=>{
    frame=0;if(disposed)return;
    camera.updateMatrixWorld();renderer.render(scene,camera);
    const {width,height}=canvas.getBoundingClientRect();
    projected=pointPositions.map(({id,position})=>{
      const p=position.clone().project(camera);
      const x=(p.x+1)*width/2,y=(1-p.y)*height/2;
      return {id,x,y,anchorX:x,anchorY:y,visible:p.z>-1&&p.z<1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.95};
    });separateMarkers(projected,width,height);onProject(projected);
  };
  const invalidate=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(draw);};
  const reset=()=>{
    focusedId=null;controls.target.set(8.2,.2,8.9);
    camera.position.copy(controls.target).add(new THREE.Vector3(19.4,23,22.1).normalize().multiplyScalar(fittedOverviewDistance(camera.aspect)));
    controls.update();invalidate();
  };
  const focus=(id:string)=>{
    const point=pointPositions.find(p=>p.id===id);if(!point)return;
    focusedId=id;
    const direction=camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(point.position);
    camera.position.copy(point.position).addScaledVector(direction,Math.max(11,9/Math.max(.45,camera.aspect)));
    controls.update();invalidate();
  };
  const resize=new ResizeObserver(()=>{
    const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
    renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();
    if(first||!focusedId){first=false;reset();}else invalidate();
  });resize.observe(host);
  controls.addEventListener('change',invalidate);

  // Markers are an HTML overlay with pointer-events:none. All pointer gestures
  // start on the same canvas, so even dragging from a marker rotates the model.
  const tap=new OverviewTap();
  const pick=(event:PointerEvent)=>{
    const r=canvas.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top;
    const radius=event.pointerType==='touch'?21:17;
    let best:ProjectedPoint|undefined, distance=radius;
    for(const p of projected){if(!p.visible)continue;const d=Math.hypot(p.x-x,p.y-y);if(d<distance){distance=d;best=p;}}
    return best?.id??null;
  };
  const down=(e:PointerEvent)=>tap.begin(e.pointerId,e.clientX,e.clientY,e.timeStamp,pick(e),e.pointerType==='touch',e.button);
  const move=(e:PointerEvent)=>{tap.move(e.pointerId,e.clientX,e.clientY);canvas.style.cursor=pick(e)?'pointer':'grab';};
  const up=(e:PointerEvent)=>{const id=tap.end(e.pointerId,e.clientX,e.clientY,e.timeStamp,pick(e));if(id)onSelect(id);};
  const cancel=(e:PointerEvent)=>tap.cancel(e.pointerId);
  const wheel=()=>tap.invalidate();
  const blur=()=>tap.reset();
  const visibility=()=>{if(document.hidden)tap.reset();};
  canvas.addEventListener('pointerdown',down,true);
  canvas.addEventListener('pointermove',move,true);
  canvas.addEventListener('pointerup',up,true);
  canvas.addEventListener('pointercancel',cancel,true);
  canvas.addEventListener('lostpointercapture',cancel,true);
  canvas.addEventListener('wheel',wheel,{passive:true,capture:true});
  window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  reset();
  return {
    reset,focus,
    zoom(factor:number){camera.position.sub(controls.target).multiplyScalar(factor).clampLength(controls.minDistance,controls.maxDistance).add(controls.target);controls.update();invalidate();},
    statistics:model.userData,
    dispose(){
      disposed=true;cancelAnimationFrame(frame);resize.disconnect();controls.dispose();tap.reset();
      canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',up,true);
      canvas.removeEventListener('pointercancel',cancel,true);canvas.removeEventListener('lostpointercapture',cancel,true);canvas.removeEventListener('wheel',wheel,true);
      window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);
      scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});
      renderer.dispose();canvas.remove();
    },
  };
}
export type OverviewApi=ReturnType<typeof createOverview>;
