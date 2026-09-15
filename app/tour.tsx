"use client";
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Layers3, Compass, FileImage, MapPin, RotateCcw, Plus, Minus, Maximize, Minimize, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { panoramaPoints, pointForRoom } from '@/lib/panorama-data';
import { rooms } from '@/lib/plan';
import type { OverviewApi, ProjectedPoint } from '@/lib/overview';
const Panorama = lazy(() => import('./panorama').catch(() => ({default: function LoadFailure() { return <div className="loading error" role="alert"><b>全景暂时未能载入</b><button onClick={()=>location.reload()}>刷新重试</button></div>; }})));
const hashPoint = () => panoramaPoints.find(p => location.hash === '#panorama/' + p.id);

export default function HomeTour() {
  const host = useRef<HTMLDivElement>(null), api = useRef<OverviewApi | null>(null);
  const markers = useRef(new Map<string, HTMLButtonElement>());
  const leaders = useRef(new Map<string, SVGLineElement>());
  const [panoramaOpen,setPanoramaOpen] = useState(() => !!hashPoint());
  const [roomId,setRoomId] = useState(() => hashPoint()?.room ?? 'living');
  const [selectedId,setSelectedId] = useState(() => hashPoint()?.id ?? 'living-entry');
  const [ready,setReady] = useState(false), [error,setError] = useState('');
  const [source,setSource] = useState(false), [pointsOpen,setPointsOpen] = useState(false);
  const [immersive,setImmersive] = useState(false);
  const openRef = useRef<(id:string)=>void>(()=>{});
  function openPoint(id:string) {
    const p = panoramaPoints.find(p=>p.id===id);if(!p)return;
    setSelectedId(id);setRoomId(p.room);setPointsOpen(false);
    history.replaceState(null,'',location.pathname+location.search+'#panorama/'+id);
    setPanoramaOpen(true);
  }
  openRef.current=openPoint;
  useEffect(()=>{
    const update=()=>{const p=hashPoint();setPanoramaOpen(!!p);if(p){setRoomId(p.room);setSelectedId(p.id);}};
    window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);
  },[]);
  useEffect(()=>{
    if(panoramaOpen)return;
    let cancelled=false;setReady(false);setError('');
    const project=(points:ProjectedPoint[])=>{
      for(const p of points){const button=markers.current.get(p.id);if(!button)continue;
        button.style.visibility=p.visible?'visible':'hidden';
        button.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
        const line=leaders.current.get(p.id);
        if(line){line.style.display=p.visible&&Math.hypot(p.x-p.anchorX,p.y-p.anchorY)>5?'':'none';
          line.setAttribute('x1',String(p.anchorX));line.setAttribute('y1',String(p.anchorY));line.setAttribute('x2',String(p.x));line.setAttribute('y2',String(p.y));}
      }
    };
    import('@/lib/overview').then(({createOverview})=>{
      if(cancelled||!host.current)return;
      try { api.current=createOverview(host.current,project,id=>openRef.current(id));setReady(true); }
      catch(e){console.error(e);setError('3D 暂时无法显示，你仍可从点位列表进入全景。');}
    }).catch(()=>setError('总览未能载入，请重试或直接选择全景点位。'));
    return()=>{cancelled=true;api.current?.dispose();api.current=null;};
  },[panoramaOpen]);
  useEffect(()=>{
    const sync=()=>setImmersive(!!document.fullscreenElement);
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setImmersive(false);};
    document.addEventListener('fullscreenchange',sync);window.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('fullscreenchange',sync);window.removeEventListener('keydown',escape);};
  },[]);
  async function fullscreen() {
    if(immersive){setImmersive(false);if(document.fullscreenElement)await document.exitFullscreen?.();return;}
    setImmersive(true);try{await document.documentElement.requestFullscreen?.();}catch{/* iOS uses an in-page immersive view. */}
  }
  function changeTab(value:string) {
    if(value==='panorama'){openPoint(selectedId);return;}
    setPanoramaOpen(false);history.replaceState(null,'',location.pathname+location.search+'#overview');
  }
  return <main className={'tour-shell french-tour'+(immersive?' immersive':'')+(panoramaOpen?' panorama-active':'')}>
    <header className="topbar">
      <div className="brand"><span className="monogram">A<span>6</span></span><div><h1>法式自然 · 我的家</h1><p>190.65㎡ / 20 层 / 24 个全景点位</p></div></div>
      <Tabs value={panoramaOpen?'panorama':'overview'} onValueChange={changeTab} className="mode-tabs">
        <TabsList aria-label="查看方式">
          <TabsTrigger value="overview"><Layers3/>空间总览</TabsTrigger>
          <TabsTrigger value="panorama"><Compass/>全景漫游</TabsTrigger>
        </TabsList>
      </Tabs>
      <button className="source-button" aria-label="户型与设计说明" onClick={()=>setSource(true)}><FileImage size={18}/><span>户型说明</span></button>
    </header>
    <section className="viewport" aria-label={panoramaOpen?'全景漫游':'空间总览'}>
      {panoramaOpen ? <Suspense fallback={<div className="loading" role="status"><span/><p>正在载入全景…</p></div>}>
        <Panorama initialRoom={roomId} immersive={immersive} onFullscreen={fullscreen} onRoomChange={id=>{setRoomId(id);setSelectedId(hashPoint()?.id??pointForRoom(id).id);}}/>
      </Suspense> : <>
        <div className="three-host" ref={host}/>
        <div className="overview-markers" aria-label="模型上的全景点位">
          <svg className="overview-leaders" aria-hidden="true">{panoramaPoints.map(p=><line key={p.id} ref={el=>{if(el)leaders.current.set(p.id,el);else leaders.current.delete(p.id);}}/>)}</svg>
          {panoramaPoints.map((p,i)=><button key={p.id} className={'overview-marker'+(selectedId===p.id?' current':'')} ref={el=>{if(el)markers.current.set(p.id,el);else markers.current.delete(p.id);}} style={{visibility:'hidden'}} aria-label={`进入${p.name}全景`} title={p.name} onClick={e=>{if(e.detail===0)openPoint(p.id);}}>
            <span>{i+1}</span><b>{p.name}</b>
          </button>)}
        </div>
        <div className="overview-heading"><span>法式自然风 · 空间示意</span><h2>从这里，走进每个房间</h2><p>点击编号，打开对应全景</p></div>
        <div className="top-tools overview-tools">
          <button onClick={()=>api.current?.zoom(.83)} aria-label="放大模型" title="放大"><Plus size={19}/></button>
          <button onClick={()=>api.current?.zoom(1.2)} aria-label="缩小模型" title="缩小"><Minus size={19}/></button>
          <button onClick={()=>api.current?.reset()} aria-label="恢复总览视角" title="恢复视角"><RotateCcw size={18}/></button>
          <button onClick={fullscreen} aria-label={immersive?'退出沉浸模式':'沉浸模式'} title="沉浸模式">{immersive?<Minimize size={18}/>:<Maximize size={18}/>}</button>
        </div>
        {!ready&&!error&&<div className="loading" role="status"><span/><b>正在展开空间总览</b></div>}
        {error&&<div className="loading error" role="alert"><b>暂时无法显示模型</b><p>{error}</p><button onClick={()=>setPointsOpen(true)}>选择全景点位</button></div>}
        <div className="overview-bottom"><button className="overview-open-points" onClick={()=>setPointsOpen(true)}><MapPin size={18}/><span>选择空间 <small>24 个点位</small></span></button><p><span>拖动旋转 · 滚轮缩放</span><span>手机：单指旋转 · 双指缩放 / 平移</span></p><span className="overview-north">普通层高 3m · 挑空阳台 6m</span></div>
      </>}
      {immersive&&<button className="immersive-exit" aria-label="退出沉浸模式" onClick={fullscreen}><X size={18}/></button>}
    </section>
    <Sheet open={pointsOpen} onOpenChange={setPointsOpen}>
      <SheetContent side="bottom" className="mobile-sheet overview-sheet">
        <SheetHeader><SheetTitle>选择全景点位</SheetTitle><SheetDescription>共 18 个空间，24 个观察点</SheetDescription></SheetHeader>
        <div className="overview-point-list">{panoramaPoints.map((p,i)=><button key={p.id} onClick={()=>openPoint(p.id)}><span>{String(i+1).padStart(2,'0')}</span><b>{p.name}</b><Compass size={16}/></button>)}</div>
      </SheetContent>
    </Sheet>
    <Dialog open={source} onOpenChange={setSource}><DialogContent className="source-dialog"><DialogTitle>户型与设计说明</DialogTitle><DialogDescription>A6 · 190.65㎡ · 法式自然风</DialogDescription><div className="source-scroll">
      <img src="./floorplan.jpg?v=french-v1-tinypng" alt="房开 A6 原始户型图及标注尺寸" loading="lazy"/>
      <div className="dimension-table"><div><b>户型结构</b><p>沿用房开户型标注及既有布局。普通房间和长阳台层高 3m，挑空阳台 6m；长阳台封窗并与客厅连通，电视在客厅南侧实墙。未标注的细部尺寸为按图估算。</p></div><div><b>空间总览</b><p>总览采用剖切墙体与简化家具，便于看清房间和全景点位。总览的墙体显示高度为剖切高度，不代表实际层高。</p></div><div><b>材质与风格</b><p>暖白墙面、简洁法式饰线、米白亚麻、浅木色家具与藤编。室内木纹地面为人字拼瓷砖，厨卫为浅色瓷砖。</p></div><div><b>全景效果</b><p>全景直接使用 AI 生图，以原有空间和已确认风格图为参考。全景为效果示意，局部细节和跨视角一致性可能与模型存在差异；窗外城市为示意景观。</p></div></div>
    </div></DialogContent></Dialog>
  </main>;
}
