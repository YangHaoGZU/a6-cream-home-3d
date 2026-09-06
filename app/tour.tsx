'use client';
import { useEffect,useRef,useState } from 'react';
import { ArrowUp,ArrowDown,ArrowLeft,ArrowRight,RotateCcw,Maximize,Layers3,Footprints,Scan,FileImage,ChevronRight,X,MoveUpRight } from 'lucide-react';
import { Tabs,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { rooms,walls,floorRects,DIMENSIONS } from '@/lib/plan';
import type { Mode,TourApi } from '@/lib/scene';

export default function HomeTour(){
 const host=useRef<HTMLDivElement>(null),api=useRef<TourApi|null>(null);const [ready,setReady]=useState(false),[error,setError]=useState(''),[mode,setMode]=useState<Mode>('overview'),[ceiling,setCeiling]=useState(false),[cutaway,setCutaway]=useState(true),[dimensions,setDimensions]=useState(true),[roomId,setRoomId]=useState('living'),[source,setSource]=useState(false),[mapOpen,setMapOpen]=useState(true),[position,setPosition]=useState({x:5.2,z:9.4,yaw:Math.PI});
 const current=rooms.find(r=>r.id===roomId)??rooms[0];
 useEffect(()=>{let cancelled=false;import('@/lib/scene').then(({createTour})=>{if(cancelled||!host.current)return;try{api.current=createTour(host.current,(x,z,yaw,id)=>{setPosition({x,z,yaw});setRoomId(id)});setReady(true);}catch(e){setError('此浏览器未能启动 3D 图形。请使用启用硬件加速的 Chrome、Edge 或 Safari，刷新后重试。');console.error(e)}}).catch(()=>setError('场景加载失败，请刷新网页重试。'));return()=>{cancelled=true;api.current?.dispose();api.current=null}},[]);
 useEffect(()=>{api.current?.setOptions({mode,ceiling,cutaway,dimensions});},[mode,ceiling,cutaway,dimensions,ready]);
 function changeMode(value:Mode){setMode(value);setCeiling(value==='walk');}
 function go(id:string){setRoomId(id);api.current?.go(id);changeMode('walk');}
 function fullscreen(){if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});}
 function mapKey(e:React.KeyboardEvent,id:string){if(e.key==='Enter'||e.key===' '){e.preventDefault();go(id)}}
 return <main className="tour-shell">
  <header className="topbar"><div className="brand"><span className="monogram">A<span>6</span></span><div><h1>奶油风 · 基装漫游</h1><p>190.65㎡ 户型 / 无家具</p></div></div>
   <Tabs value={mode} onValueChange={v=>changeMode(v as Mode)} className="mode-tabs"><TabsList aria-label="场景视角"><TabsTrigger value="overview"><Layers3/>空间总览</TabsTrigger><TabsTrigger value="walk"><Footprints/>进入漫游</TabsTrigger><TabsTrigger value="plan"><Scan/>俯视户型</TabsTrigger></TabsList></Tabs>
   <button className="source-button" onClick={()=>setSource(true)}><FileImage size={17}/><span>尺寸依据</span></button>
  </header>
  <section className="viewport" aria-label="户型漫游工作区"><div className="three-host" ref={host}/>
   {!ready&&!error&&<div className="loading"><span/><b>正在构建你的家</b><p>载入空间、瓷砖与光线…</p></div>}
   {error&&<div className="loading error"><b>暂时无法显示 3D</b><p>{error}</p><button onClick={()=>location.reload()}>重新加载</button></div>}
   <div className="scene-label"><span className="dot"/><span>{mode==='walk'?'室内漫游':mode==='plan'?'正向俯视':'空间总览'}</span><span className="scene-divider"/>{mode==='walk'?current.name:'A6 / 4+1 房 · 2 厅 · 3 卫'}</div>
   <div className="top-tools"><button title="恢复视角" aria-label="恢复视角" onClick={()=>api.current?.reset()}><RotateCcw size={18}/></button><button title="全屏" aria-label="全屏" onClick={fullscreen}><Maximize size={18}/></button></div>
   <aside className="material-card"><div className="card-eyebrow">{mode==='walk'?'当前空间':'基装方案'}<span>01</span></div><h2>{mode==='walk'?current.name:'暖白 · 浅米石纹'}</h2><p className="room-note">{mode==='walk'?current.note:'克制的奶油色，让空间与自然光成为主角。'}</p>
    <div className="heights"><div><b>{mode==='walk'?current.height:'3'}<small>m</small></b><span>{mode==='walk'?'本空间层高':'普通空间层高'}</span></div><div><b>6<small>m</small></b><span>挑空阳台层高</span></div></div>
    <div className="materials"><div><i className="swatch tile"/><span><b>浅米石纹瓷砖</b><small>1200 × 600mm · 细缝</small></span></div><div><i className="swatch paint"/><span><b>奶油白墙面</b><small>哑光乳胶漆</small></span></div><div><i className="swatch plaster"/><span><b>简洁石膏板吊顶</b><small>局部边吊 150mm</small></span></div></div>
    <div className="toggles"><label htmlFor="ceiling">显示吊顶<Switch id="ceiling" checked={ceiling} onCheckedChange={setCeiling}/></label><label htmlFor="cutaway" className={mode==='walk'?'disabled':''}>剖切墙体<Switch id="cutaway" checked={cutaway} onCheckedChange={setCutaway} disabled={mode==='walk'}/></label><label htmlFor="dimensions" className={mode==='walk'?'disabled':''}>空间标注<Switch id="dimensions" checked={dimensions} onCheckedChange={setDimensions} disabled={mode==='walk'}/></label></div>
    <p className="card-footnote">{mode==='walk'?'视点高度 1.65m · 可自由行走':'剖切仅改变可见范围，不改变实际层高。'}</p>
   </aside>
   <aside className={'mini-map '+(!mapOpen?'collapsed':'')}><button className="map-title" onClick={()=>setMapOpen(!mapOpen)}><span>户型导航 <small>点击空间进入</small></span>{mapOpen?<X size={14}/>:<Scan size={17}/>}</button>{mapOpen&&<><svg viewBox="-1 -1.3 18.4 20.6" role="img" aria-label="按户型比例绘制的空间导航，上北下南">
    <text x="16.2" y=".5" className="north">N</text><path d="M16.4 1L16 .2L15.6 1" fill="none" stroke="#626b59" strokeWidth=".12"/>
    {floorRects.map((r,i)=><rect key={i} x={r[0]} y={r[1]} width={r[2]-r[0]} height={r[3]-r[1]} fill="#f3ede2"/>)}
    <rect x="8.6" y="6.6" width="7.8" height="5" fill="#e3e5e0"/><text x="12.5" y="9.2" className="core-label">电梯 / 楼梯</text><rect x="0" y="0" width="4" height="5" fill="none" stroke="#c5c9c0" strokeDasharray=".22 .2" strokeWidth=".06"/><text x="2" y="2.5" className="core-label">挑空上空</text>
    {rooms.map(r=><g key={r.id} role="button" tabIndex={0} aria-label={'进入'+r.name} onClick={()=>go(r.id)} onKeyDown={e=>mapKey(e,r.id)} className={'map-room '+(r.id===roomId?'active':'')}><rect x={r.rect[0]} y={r.rect[1]} width={r.rect[2]-r.rect[0]} height={r.rect[3]-r.rect[1]} fill={r.id===roomId?'#d5dfc5':'transparent'}/><text x={(r.rect[0]+r.rect[2])/2} y={(r.rect[1]+r.rect[3])/2+.15}>{r.name}</text></g>)}
    {walls.flatMap((w,i)=>{const v=w.a[0]===w.b[0];const len=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);let last=0;const segments:React.ReactNode[]=[];for(const [j,o]of [...w.openings??[],{a:len,b:len,kind:'end'}].entries()){if(o.a>last)segments.push(<line key={`${i}-${j}`} x1={w.a[0]+(v?0:last)} y1={w.a[1]+(v?last:0)} x2={w.a[0]+(v?0:o.a)} y2={w.a[1]+(v?o.a:0)} stroke="#717467" strokeWidth=".14"/>);last=o.b;}return segments})}
    <path d="M0 5V17.8H4V16.7" fill="none" stroke="#8a9285" strokeWidth=".08"/>
    {mode==='walk'&&<g transform={`translate(${position.x} ${position.z}) rotate(${-position.yaw*180/Math.PI})`}><path d="M0 -1L-.52 -.2L.52 -.2Z" fill="#65774f" opacity=".3"/><circle r=".24" fill="#50693c" stroke="white" strokeWidth=".1"/></g>}
   </svg><div className="map-scale"><span/>4m<span className="map-caption">上北下南</span></div></>}</aside>
   {mode==='walk'&&<div className="walk-pad" aria-label="移动控制">{[['KeyW',ArrowUp,'前进'],['KeyA',ArrowLeft,'左移'],['KeyS',ArrowDown,'后退'],['KeyD',ArrowRight,'右移']].map(([key,Icon,label])=>{const C=Icon as typeof ArrowUp;return <button key={key as string} className={key==='KeyW'?'forward':''} aria-label={label as string} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);api.current?.move(key as string,true)}} onPointerUp={()=>api.current?.move(key as string,false)} onPointerCancel={()=>api.current?.move(key as string,false)} onLostPointerCapture={()=>api.current?.move(key as string,false)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();api.current?.move(key as string,true)}}} onKeyUp={()=>api.current?.move(key as string,false)} onBlur={()=>api.current?.move(key as string,false)}><C size={20}/></button>})}</div>}
   <div className="controls-hint">{mode==='walk'?<><span>拖动环顾</span><span>W A S D 行走</span><span>点击地面前往</span></>:<><span>拖动旋转</span><span>滚轮缩放</span><span>右键平移</span></>}</div>
  </section>
  <footer className="bottom-bar"><div className="rooms-nav" aria-label="快速进入空间">{rooms.slice(0,10).map(r=><button key={r.id} className={roomId===r.id&&mode==='walk'?'selected':''} onClick={()=>go(r.id)}>{r.name}{r.id==='terrace'&&<small>6m</small>}<ChevronRight size={13}/></button>)}</div><div className="precision-note"><span>图示尺寸建模 · 门窗及未标内墙按比例暂定</span><button onClick={()=>setSource(true)}>查看原图与尺寸 <MoveUpRight size={13}/></button></div></footer>
  <Dialog open={source} onOpenChange={setSource}><DialogContent className="source-dialog"><DialogTitle>户型与尺寸依据</DialogTitle><DialogDescription>以原图标注尺寸控制模型比例；这张房开图未提供全部施工尺寸，不能保证毫米级还原。</DialogDescription><div className="source-scroll"><a href="./floorplan.jpg" target="_blank" rel="noreferrer"><img src="./floorplan.jpg" alt="用户提供的 A6 原始户型图，左结构平面，右装修示意及尺寸链"/></a><div className="dimension-table"><div><b>横向尺寸链</b><p>北：2100 + 1900 + 3000 + 3200 + 3300 + 1700 = 15200mm</p><p>南：4000 + 3200 + 1800 + 4100 + 2100 = 15200mm</p></div><div><b>纵向尺寸链</b><p>西：1400 + 3600 + 7800 + 5000 = 17800mm</p><p>东：1400 + 900 + 2600 + 1700 + 5000 + 1800 + 2700 + 600 = 16700mm</p></div><div><b>层高与吊顶</b><p>普通空间（含长阳台、生活阳台）3m；西南挑空阳台 4×5m、层高 6m。模型以完成地面为 0，顶面位于 3m / 6m，边吊底为 2.85m / 5.85m。</p></div><div><b>仍需实测的部分</b><p>外墙暂按 200mm、内墙暂按 120mm，门高暂按 2350mm；门窗宽度、窗台高、部分隔墙及结构柱位置按图比例估计。左右尺寸链在北部有约 100mm 错位，模型保留各自标注边界。190.65㎡为建筑面积，不作为室内净面积缩放依据。</p><p>要达到严格施工尺寸，需要有完整尺寸的 CAD 或实测图。当前模型适合核对空间关系与基装氛围。</p></div><div><b>本阶段范围</b><p>地面瓷砖、奶油白墙面、吊顶和基本门窗框；不含家具、橱柜、洁具、电视及软装。公共电梯 / 楼梯区域只保留定位轮廓。</p></div></div></div></DialogContent></Dialog>
 </main>
}
