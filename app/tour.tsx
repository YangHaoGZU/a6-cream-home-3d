"use client";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Maximize,
  Layers3,
  Footprints,
  Scan,
  FileImage,
  ChevronRight,
  X,
  MoveUpRight,
  SlidersHorizontal,
  Minimize,
  Compass,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { rooms, walls, floorRects, DIMENSIONS } from "@/lib/plan";
import type { Mode, TourApi } from "@/lib/scene";
const Panorama = lazy(() =>
  import("./panorama").catch(() => ({
    default: function PanoramaLoadFailure() {
      return (
        <div className="loading error">
          <b>全景模块暂时未能载入</b>
          <p>请检查网络后刷新重试。</p>
          <button onClick={() => location.reload()}>刷新网页</button>
        </div>
      );
    },
  })),
);

export default function HomeTour() {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<TourApi | null>(null);
  const movementPointers = useRef(new Map<string, number>()),
    showPosition = useRef(true);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [mode, setMode] = useState<Mode>("walk"),
    [ceiling, setCeiling] = useState(true),
    [cutaway, setCutaway] = useState(true),
    [dimensions, setDimensions] = useState(false),
    [furniture, setFurniture] = useState(true),
    [roomId, setRoomId] = useState("living"),
    [source, setSource] = useState(false),
    [mobilePanel, setMobilePanel] = useState<"rooms" | "settings" | "map" | null>(null),
    [isMobile, setIsMobile] = useState(false),
    [immersive, setImmersive] = useState(false),
    [panoramaOpen, setPanoramaOpen] = useState(() => location.hash.startsWith("#panorama/")),
    [mapOpen, setMapOpen] = useState(true),
    [position, setPosition] = useState({ x: 7.15, z: 10.45, yaw: 2.1 });
  const current = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const roomRef = useRef(roomId);
  roomRef.current = roomId;
  useEffect(() => {
    const update = () => setPanoramaOpen(location.hash.startsWith("#panorama/"));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  showPosition.current = (!isMobile && mapOpen) || mobilePanel === "map";
  useEffect(() => {
    const query = window.matchMedia("(max-width:800px), (max-width:1100px) and (pointer:coarse)");
    const update = () => {
      setIsMobile(query.matches);
      if (!query.matches) setMobilePanel(null);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    api.current?.stop();
    movementPointers.current.clear();
  }, [source, mobilePanel, mode]);
  useEffect(() => {
    const clear = () => movementPointers.current.clear();
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    const sync = () => setImmersive(Boolean(document.fullscreenElement));
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !source && !mobilePanel) setImmersive(false);
    };
    document.addEventListener("fullscreenchange", sync);
    window.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      window.removeEventListener("keydown", escape);
    };
  }, [source, mobilePanel]);
  useEffect(() => {
    setReady(false);
    setError("");
    if (panoramaOpen) return;
    let cancelled = false;
    import("@/lib/scene")
      .then(({ createTour }) => {
        if (cancelled || !host.current) return;
        try {
          api.current = createTour(host.current, (x, z, yaw, id) => {
            if (showPosition.current) setPosition({ x, z, yaw });
            setRoomId(id);
          });
          api.current.go(roomRef.current);
          setReady(true);
        } catch (e) {
          setError(
            "此浏览器未能启动 3D 图形。请使用启用硬件加速的 Chrome、Edge 或 Safari，刷新后重试。",
          );
          console.error(e);
        }
      })
      .catch(() => setError("场景加载失败，请刷新网页重试。"));
    return () => {
      cancelled = true;
      api.current?.dispose();
      api.current = null;
    };
  }, [panoramaOpen]);
  useEffect(() => {
    api.current?.setOptions({ mode, ceiling, cutaway, dimensions, furniture });
  }, [mode, ceiling, cutaway, dimensions, furniture, ready]);
  function changeMode(value: Mode) {
    setMode(value);
    setCeiling(value === "walk");
  }
  function go(id: string) {
    setMobilePanel(null);
    api.current?.stop();
    setRoomId(id);
    api.current?.go(id);
    changeMode("walk");
  }
  async function fullscreen() {
    if (immersive) {
      setImmersive(false);
      if (document.fullscreenElement) await document.exitFullscreen?.();
      return;
    }
    setImmersive(true);
    if (document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        /* Safari still gets the expanded in-page view. */
      }
    }
  }
  function mapKey(e: React.KeyboardEvent, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go(id);
    }
  }
  function renderSettings(prefix: string) {
    return (
      <>
        <div className="card-eyebrow">
          {mode === "walk" ? "当前空间" : "全屋方案"}
          <span>20F</span>
        </div>
        <h2>{mode === "walk" ? current.name : "暖白 · 浅米石纹"}</h2>
        <p className="room-note">
          {mode === "walk" ? current.note : "午后日光、细腻瓷砖和柔和暖光，窗外是城市天际线。"}
        </p>
        <div className="heights">
          <div>
            <b>
              {mode === "walk" ? current.height : "3"}
              <small>m</small>
            </b>
            <span>{mode === "walk" ? "本空间层高" : "普通空间层高"}</span>
          </div>
          <div>
            <b>
              6<small>m</small>
            </b>
            <span>挑空阳台层高</span>
          </div>
        </div>
        <div className="materials">
          <div>
            <i className="swatch tile" />
            <span>
              <b>浅米石纹瓷砖</b>
              <small>1200 × 600mm · 细缝</small>
            </span>
          </div>
          <div>
            <i className="swatch paint" />
            <span>
              <b>奶油白墙面</b>
              <small>哑光乳胶漆</small>
            </span>
          </div>
          <div>
            <i className="swatch plaster" />
            <span>
              <b>简洁石膏板吊顶</b>
              <small>局部边吊 150mm</small>
            </span>
          </div>
        </div>
        <div className="toggles">
          <label htmlFor={`furniture-${prefix}`}>
            家具与家电
            <Switch id={`furniture-${prefix}`} checked={furniture} onCheckedChange={setFurniture} />
          </label>
          <label htmlFor={`ceiling-${prefix}`}>
            吊顶与吊灯
            <Switch id={`ceiling-${prefix}`} checked={ceiling} onCheckedChange={setCeiling} />
          </label>
          <label htmlFor={`cutaway-${prefix}`} className={mode === "walk" ? "disabled" : ""}>
            剖切墙体
            <Switch
              id={`cutaway-${prefix}`}
              checked={cutaway}
              onCheckedChange={setCutaway}
              disabled={mode === "walk"}
            />
          </label>
          <label htmlFor={`dimensions-${prefix}`} className={mode === "walk" ? "disabled" : ""}>
            空间标注
            <Switch
              id={`dimensions-${prefix}`}
              checked={dimensions}
              onCheckedChange={setDimensions}
              disabled={mode === "walk"}
            />
          </label>
        </div>
        <p className="card-footnote">
          {mode === "walk"
            ? "20 层 · 午后日光 · 城市景观为示意"
            : "剖切仅改变可见范围，不改变实际层高。"}
        </p>
      </>
    );
  }
  function renderMap() {
    return (
      <svg
        className="floor-map"
        viewBox="-1 -1.3 18.4 20.6"
        role="img"
        aria-label="按户型比例绘制的空间导航，上北下南"
      >
        <text x="16.2" y=".5" className="north">
          N
        </text>
        <path d="M16.4 1L16 .2L15.6 1" fill="none" stroke="#626b59" strokeWidth=".12" />
        {floorRects.map((r, i) => (
          <rect key={i} x={r[0]} y={r[1]} width={r[2] - r[0]} height={r[3] - r[1]} fill="#f3ede2" />
        ))}
        <rect x="8.6" y="6.6" width="7.8" height="5" fill="#e3e5e0" />
        <rect x="11.8" y="9.4" width="4.6" height=".82" fill="#c6c8be" />
        <text x="14.1" y="9.94" className="core-label">
          设备井
        </text>
        {Array.from({ length: 10 }, (_, i) => (
          <path
            key={i}
            d={`M${12.8 + (i * 2.35) / 9} 6.78v1M${12.8 + (i * 2.35) / 9} 8.18v1.06`}
            stroke="#9ea391"
            strokeWidth=".035"
            fill="none"
          />
        ))}
        <rect
          x="0"
          y="0"
          width="4"
          height="5"
          fill="none"
          stroke="#c5c9c0"
          strokeDasharray=".22 .2"
          strokeWidth=".06"
        />
        <text x="2" y="2.5" className="core-label">
          挑空上空
        </text>
        {rooms.map((r) => (
          <g
            key={r.id}
            role="button"
            tabIndex={0}
            aria-label={"进入" + r.name}
            onClick={() => go(r.id)}
            onKeyDown={(e) => mapKey(e, r.id)}
            className={"map-room " + (r.id === roomId ? "active" : "")}
          >
            <rect
              x={r.rect[0]}
              y={r.rect[1]}
              width={r.rect[2] - r.rect[0]}
              height={r.rect[3] - r.rect[1]}
              fill={r.id === roomId ? "#d5dfc5" : "transparent"}
            />
            <text x={(r.rect[0] + r.rect[2]) / 2} y={(r.rect[1] + r.rect[3]) / 2 + 0.15}>
              {r.name}
            </text>
          </g>
        ))}
        {walls.flatMap((w, i) => {
          const v = w.a[0] === w.b[0];
          const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
          let last = 0;
          const segments: React.ReactNode[] = [];
          for (const [j, o] of [...(w.openings ?? []), { a: len, b: len, kind: "end" }].entries()) {
            if (o.a > last)
              segments.push(
                <line
                  key={`${i}-${j}`}
                  x1={w.a[0] + (v ? 0 : last)}
                  y1={w.a[1] + (v ? last : 0)}
                  x2={w.a[0] + (v ? 0 : o.a)}
                  y2={w.a[1] + (v ? o.a : 0)}
                  stroke="#717467"
                  strokeWidth=".14"
                />,
              );
            last = o.b;
          }
          return segments;
        })}
        <path d="M0 5V17.8H4V16.7" fill="none" stroke="#8a9285" strokeWidth=".08" />
        <path
          d="M7.2 13.05H6.35M6.35 13.05A.9 .9 0 0 0 7.2 13.95"
          fill="none"
          stroke="#8b785d"
          strokeWidth=".055"
          pointerEvents="none"
        />
        {mode === "walk" && (
          <g
            transform={`translate(${position.x} ${position.z}) rotate(${(-position.yaw * 180) / Math.PI})`}
          >
            <path d="M0 -1L-.52 -.2L.52 -.2Z" fill="#65774f" opacity=".3" />
            <circle r=".24" fill="#50693c" stroke="white" strokeWidth=".1" />
          </g>
        )}
      </svg>
    );
  }
  return (
    <main
      className={
        "tour-shell" + (immersive ? " immersive" : "") + (panoramaOpen ? " panorama-active" : "")
      }
    >
      <header className="topbar">
        <div className="brand">
          <span className="monogram">
            A<span>6</span>
          </span>
          <div>
            <h1>奶油风 · 全屋漫游</h1>
            <p>20 层 / 190.65㎡ / 午后城市景观</p>
          </div>
        </div>
        <Tabs
          value={panoramaOpen ? "panorama" : mode}
          onValueChange={(v) => {
            setPanoramaOpen(v === "panorama");
            if (v !== "panorama") {
              changeMode(v as Mode);
              if (location.hash.startsWith("#panorama/"))
                history.replaceState(null, "", location.pathname + location.search);
            }
          }}
          className="mode-tabs"
        >
          <TabsList aria-label="场景视角">
            <TabsTrigger value="overview">
              <Layers3 />
              空间总览
            </TabsTrigger>
            <TabsTrigger value="walk">
              <Footprints />
              进入漫游
            </TabsTrigger>
            <TabsTrigger value="plan">
              <Scan />
              俯视户型
            </TabsTrigger>
            <TabsTrigger value="panorama">
              <Compass />
              全景漫游
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          className="source-button"
          aria-label="查看原图与尺寸依据"
          onClick={() => setSource(true)}
        >
          <FileImage size={17} />
          <span>尺寸依据</span>
        </button>
      </header>
      <section className="viewport" aria-label="户型漫游工作区">
        <div className="three-host" ref={host} />
        {!panoramaOpen && !ready && !error && (
          <div className="loading">
            <span />
            <b>正在构建你的家</b>
            <p>载入全屋装修、城市全景与午后光线…</p>
          </div>
        )}
        {!panoramaOpen && error && (
          <div className="loading error">
            <b>暂时无法显示 3D</b>
            <p>{error}</p>
            <button onClick={() => location.reload()}>重新加载</button>
          </div>
        )}
        <div className="scene-label">
          <span className="dot" />
          <span>{mode === "walk" ? "室内漫游" : mode === "plan" ? "正向俯视" : "空间总览"}</span>
          <span className="scene-divider" />
          {mode === "walk" ? current.name : "A6 / 4+1 房 · 2 厅 · 3 卫"}
        </div>
        <div className="top-tools">
          <button title="恢复视角" aria-label="恢复视角" onClick={() => api.current?.reset()}>
            <RotateCcw size={18} />
          </button>
          <button
            title={immersive ? "退出沉浸模式" : isMobile ? "沉浸模式" : "全屏"}
            aria-label={immersive ? "退出沉浸模式" : isMobile ? "沉浸模式" : "全屏"}
            aria-pressed={immersive}
            onClick={fullscreen}
          >
            {immersive ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
        <aside className="material-card">{renderSettings("desktop")}</aside>
        <aside className={"mini-map " + (!mapOpen ? "collapsed" : "")}>
          <button className="map-title" onClick={() => setMapOpen(!mapOpen)}>
            <span>
              户型导航 <small>点击空间进入</small>
            </span>
            {mapOpen ? <X size={14} /> : <Scan size={17} />}
          </button>
          {mapOpen && (
            <>
              {renderMap()}
              <div className="map-scale">
                <span />
                4m<span className="map-caption">上北下南</span>
              </div>
            </>
          )}
        </aside>
        {mode === "walk" && (
          <div className="walk-pad" aria-label="移动控制">
            {[
              ["KeyW", ArrowUp, "前进"],
              ["KeyA", ArrowLeft, "左移"],
              ["KeyS", ArrowDown, "后退"],
              ["KeyD", ArrowRight, "右移"],
            ].map(([key, Icon, label]) => {
              const C = Icon as typeof ArrowUp;
              const direction = key as string;
              const releasePointer = (event: React.PointerEvent<HTMLButtonElement>) => {
                if (movementPointers.current.get(direction) !== event.pointerId) return;
                movementPointers.current.delete(direction);
                api.current?.move(direction, false);
              };
              return (
                <button
                  key={key as string}
                  className={key === "KeyW" ? "forward" : ""}
                  aria-label={label as string}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (movementPointers.current.has(direction)) return;
                    movementPointers.current.set(direction, e.pointerId);
                    e.currentTarget.setPointerCapture(e.pointerId);
                    api.current?.move(key as string, true);
                  }}
                  onPointerUp={releasePointer}
                  onPointerCancel={releasePointer}
                  onLostPointerCapture={releasePointer}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      api.current?.move(key as string, true);
                    }
                  }}
                  onKeyUp={() => api.current?.move(key as string, false)}
                  onBlur={() => {
                    if (!movementPointers.current.has(direction))
                      api.current?.move(direction, false);
                  }}
                >
                  <C size={20} />
                </button>
              );
            })}
          </div>
        )}
        <div className="controls-hint">
          {mode === "walk" ? (
            <>
              <span>拖动环顾</span>
              <span>{isMobile ? "按方向键行走" : "W A S D 行走"}</span>
              <span>{isMobile ? "另一只手环顾" : "点击地面前往"}</span>
            </>
          ) : (
            <>
              <span>{mode === "plan" ? "拖动平移" : "拖动旋转"}</span>
              <span>{isMobile ? "双指缩放" : "滚轮缩放"}</span>
              <span>{isMobile ? "双指平移" : "右键平移"}</span>
            </>
          )}
        </div>
        {panoramaOpen && (
          <Suspense
            fallback={
              <div className="loading">
                <span />
                <b>正在打开全景漫游</b>
              </div>
            }
          >
            <Panorama
              initialRoom={roomId}
              onRoomChange={setRoomId}
              onFullscreen={fullscreen}
              immersive={immersive}
            />
          </Suspense>
        )}
      </section>
      <footer className="bottom-bar">
        <div className="rooms-nav" aria-label="快速进入空间">
          {rooms.map((r) => (
            <button
              key={r.id}
              className={roomId === r.id && mode === "walk" ? "selected" : ""}
              onClick={() => go(r.id)}
            >
              {r.name}
              {r.id === "terrace" && <small>6m</small>}
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
        <div className="precision-note">
          <span>图示尺寸建模 · 门窗及未标内墙按比例暂定</span>
          <button onClick={() => setSource(true)}>
            查看原图与尺寸 <MoveUpRight size={13} />
          </button>
        </div>
      </footer>
      <nav className="mobile-bar" aria-label="手机漫游工具">
        <button className="mobile-room-button" onClick={() => setMobilePanel("rooms")}>
          <Footprints size={19} />
          <span>
            <small>切换空间</small>
            <b>{current.name}</b>
          </span>
          <ChevronRight size={17} />
        </button>
        <button onClick={() => setMobilePanel("map")}>
          <Scan size={20} />
          <span>户型</span>
        </button>
        <button onClick={() => setMobilePanel("settings")}>
          <SlidersHorizontal size={20} />
          <span>设置</span>
        </button>
      </nav>
      <Sheet
        open={mobilePanel !== null}
        onOpenChange={(open) => {
          if (!open) setMobilePanel(null);
        }}
      >
        <SheetContent side="bottom" showCloseButton={false} className="mobile-sheet">
          <SheetHeader>
            <SheetTitle>
              {mobilePanel === "rooms"
                ? "选择空间"
                : mobilePanel === "map"
                  ? "户型导航"
                  : "场景设置"}
            </SheetTitle>
            <SheetDescription>
              {mobilePanel === "rooms"
                ? "点击空间即可进入漫游"
                : mobilePanel === "map"
                  ? "上北下南，点击房间进入"
                  : "显示家具、吊顶或切换剖视效果"}
            </SheetDescription>
          </SheetHeader>
          <SheetClose className="mobile-sheet-close" aria-label="关闭面板">
            <X size={21} />
          </SheetClose>
          <div className="mobile-sheet-scroll">
            {mobilePanel === "rooms" && (
              <div className="mobile-rooms">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    className={room.id === roomId ? "selected" : ""}
                    aria-current={room.id === roomId ? "location" : undefined}
                    onClick={() => go(room.id)}
                  >
                    {room.name}
                    {room.id === "terrace" && <small>6m</small>}
                  </button>
                ))}
              </div>
            )}
            {mobilePanel === "map" && <div className="mobile-map">{renderMap()}</div>}
            {mobilePanel === "settings" && (
              <div className="mobile-settings">
                {renderSettings("mobile")}
                <p className="mobile-instructions">
                  {mode === "walk"
                    ? "按住左下方向键移动，同时用另一只手在画面上滑动环顾。"
                    : "单指旋转或平移，双指缩放与平移。"}
                </p>
                <button
                  className="mobile-source"
                  onClick={() => {
                    setMobilePanel(null);
                    setSource(true);
                  }}
                >
                  查看原图与尺寸依据 <MoveUpRight size={16} />
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={source} onOpenChange={setSource}>
        <DialogContent className="source-dialog">
          <DialogTitle>户型与尺寸依据</DialogTitle>
          <DialogDescription>
            以原图标注尺寸控制模型比例；这张房开图未提供全部施工尺寸，不能保证毫米级还原。
          </DialogDescription>
          <div className="source-scroll">
            <a href="./floorplan.jpg" target="_blank" rel="noreferrer">
              <img
                src="./floorplan.jpg"
                alt="用户提供的 A6 原始户型图，左结构平面，右装修示意及尺寸链"
              />
            </a>
            <div className="dimension-table">
              <div>
                <b>横向尺寸链</b>
                <p>北：2100 + 1900 + 3000 + 3200 + 3300 + 1700 = 15200mm</p>
                <p>南：4000 + 3200 + 1800 + 4100 + 2100 = 15200mm</p>
              </div>
              <div>
                <b>纵向尺寸链</b>
                <p>西：1400 + 3600 + 7800 + 5000 = 17800mm</p>
                <p>东：1400 + 900 + 2600 + 1700 + 5000 + 1800 + 2700 + 600 = 16700mm</p>
              </div>
              <div>
                <b>层高与吊顶</b>
                <p>
                  普通空间（含长阳台、生活阳台）3m；西南挑空阳台 4×5m、层高 6m。模型以完成地面为
                  0，顶面位于 3m / 6m，边吊底为 2.85m / 5.85m。
                </p>
              </div>
              <div>
                <b>仍需实测的部分</b>
                <p>
                  外墙暂按 200mm、内墙暂按 120mm，门高暂按
                  2350mm；门窗宽度、窗台高、部分隔墙及结构柱位置按图比例估计。左右尺寸链在北部有约
                  100mm 错位，模型保留各自标注边界。190.65㎡为建筑面积，不作为室内净面积缩放依据。
                </p>
                <p>
                  要达到严格施工尺寸，需要有完整尺寸的 CAD
                  或实测图。当前模型适合核对空间关系与基装氛围。
                </p>
              </div>
              <div>
                <b>20 层视野与光线</b>
                <p>
                  按下方 19 层、每层 3m 暂估住宅地面距地约 57m，室内视点高 1.65m。 窗外为生成的 360°
                  城市景观示意，未还原实际小区周边；楼体下部立面也为示意。
                  场景采用西南向午后日光和室内暖光，不代表实测日照时刻。
                </p>
              </div>
              <div>
                <b>装修与公共区</b>
                <p>
                  床和衣柜已按房开图调整：左侧两间床头靠西，右侧两间床头靠东，衣柜与衣帽间回到图示位置。主卫从北侧衣帽间进入，保留东侧床头的完整墙面。
                  南次卧保留东向门，长阳台北端保持实墙。已补充电梯轿厢、双跑步梯、设备井和公共走廊，走廊东端封墙，电梯厅一侧的入户门南边新增鞋柜。
                  公共区未标细尺寸按图比例建模，步梯按每层 3m 设置。全部地面保持瓷砖。
                  南次卧西北角至长阳台内侧约 1.9m 缺口已补玻璃，西侧通往挑空阳台的通道保留。
                </p>
              </div>
              <div>
                <b>全景漫游</b>
                <p>
                  18 个空间、24 个观察点，使用同一户型模型渲染 3072×1536
                  全景图，可环顾、缩放和切换点位。全景图中的家具和光线固定；需要自由行走或调整家具、吊顶显示时，请切换“进入漫游”。全景为装修效果示意，并非实拍照片。
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
