import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  Maximize,
  Minimize,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { panoramaPoints, pointForRoom, panoramaUrl, hotspotDirection } from "@/lib/panorama-data";
import { createPanoramaViewer, type PanoramaViewer } from "@/lib/panorama-viewer";
import { rooms } from "@/lib/plan";
export default function Panorama({
  initialRoom,
  onRoomChange,
  onFullscreen,
  immersive,
}: {
  initialRoom: string;
  onRoomChange: (room: string) => void;
  onFullscreen: () => void;
  immersive: boolean;
}) {
  const [pointId, setPointId] = useState(
      () =>
        panoramaPoints.find((p) => location.hash === "#panorama/" + p.id)?.id ??
        pointForRoom(initialRoom).id,
    ),
    [status, setStatus] = useState<"loading" | "preview" | "preview-only" | "hd" | "error">(
      "loading",
    ),
    [railOpen, setRailOpen] = useState(false),
    [roomFilter, setRoomFilter] = useState("all"),
    [retry, setRetry] = useState(0);
  const host = useRef<HTMLDivElement>(null),
    viewer = useRef<PanoramaViewer | null>(null),
    hotspots = useRef(new Map<string, HTMLButtonElement>()),
    pointRef = useRef(panoramaPoints[0]);
  const [ready, setReady] = useState(false);
  const point = panoramaPoints.find((p) => p.id === pointId)!;
  pointRef.current = point;
  const pointIndex = panoramaPoints.findIndex((p) => p.id === pointId),
    room = rooms.find((r) => r.id === point.room)!;
  const callback = useRef(onRoomChange);
  callback.current = onRoomChange;
  useEffect(() => {
    const update = () => {
      const match = panoramaPoints.find((p) => location.hash === "#panorama/" + p.id);
      if (match) setPointId(match.id);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    try {
      viewer.current = createPanoramaViewer(host.current!, () => {
        const from = pointRef.current;
        const placed: { x: number; y: number; width: number }[] = [];
        for (const [id, button] of hotspots.current) {
          const to = panoramaPoints.find((p) => p.id === id)!;
          const direction = hotspotDirection(from, to);
          const p = viewer.current?.project(direction.yaw, direction.pitch);
          const width = button.offsetWidth || 170;
          const visible =
            p?.visible &&
            p.x > width / 2 + 8 &&
            p.x < host.current!.clientWidth - width / 2 - 8 &&
            !placed.some(
              (q) => Math.abs(q.x - p.x) < (q.width + width) / 2 + 8 && Math.abs(q.y - p.y) < 52,
            );
          button.style.display = visible ? "flex" : "none";
          if (visible && p) placed.push({ x: p.x, y: p.y, width });
          if (p) button.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
        }
      }, {
        pick: (x, y) => {
          for (const [id, button] of hotspots.current) {
            if (button.style.display === "none") continue;
            const rect = button.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return id;
          }
          return null;
        },
        select: (id) => { setPointId(id); setRailOpen(false); },
      });
      setReady(true);
    } catch {
      setStatus("error");
    }
    return () => {
      viewer.current?.dispose();
      viewer.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setStatus("loading");
    history.replaceState(null, "", location.pathname + location.search + "#panorama/" + point.id);
    callback.current(point.room);
    viewer
      .current!.load(point, () => {
        if (!cancelled) setStatus("preview");
      })
      .then((quality) => {
        if (!cancelled) setStatus(quality === "preview" ? "preview-only" : quality);
      })
      .catch((error) => {
        if (!cancelled && error.name !== "AbortError") setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [pointId, ready, retry]);
  useEffect(() => {
    viewer.current?.refresh();
  }, [status, pointId]);
  const go = (id: string) => {
    setPointId(id);
    setRailOpen(false);
  };
  const shown = panoramaPoints.filter((p) => roomFilter === "all" || p.room === roomFilter);
  return (
    <div className="panorama-tour" aria-label="高清全景漫游">
      <div className="panorama-canvas" ref={host} />
      <div className="panorama-heading">
        <span className="pano-badge">
          <Compass size={14} />
          360° 全景
        </span>
        <h2>{point.name}</h2>
        <p>
          {room.height}m 层高 ·{" "}
          {status === "hd"
            ? "高清已载入"
            : status === "preview-only"
              ? "当前为预览画质"
              : status === "preview"
                ? "正在载入高清…"
                : status === "error"
                  ? "载入失败"
                  : "正在载入…"}
        </p>
      </div>
      <div className="panorama-tools">
        <button onClick={() => viewer.current?.zoom(-8)} aria-label="放大全景" title="放大">
          <Plus size={19} />
        </button>
        <button onClick={() => viewer.current?.zoom(8)} aria-label="缩小全景" title="缩小">
          <Minus size={19} />
        </button>
        <button onClick={() => viewer.current?.reset()} aria-label="恢复全景视角" title="恢复视角">
          <RotateCcw size={18} />
        </button>
        <button
          onClick={onFullscreen}
          aria-label={immersive ? "退出沉浸模式" : "沉浸模式"}
          title={immersive ? "退出沉浸模式" : "沉浸模式"}
        >
          {immersive ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
      {(status === "preview" || status === "preview-only" || status === "hd") && (
        <div className="panorama-hotspots" aria-label="周边点位">
          {point.links.map((id) => {
            const target = panoramaPoints.find((p) => p.id === id)!;
            return (
              <button
                key={pointId + id}
                ref={(el) => {
                  if (el) hotspots.current.set(id, el);
                  else hotspots.current.delete(id);
                }}
                style={{ display: "none" }}
                onClick={(event) => { if (event.detail === 0) go(id); }}
                aria-label={"前往" + target.name}
              >
                <ArrowUpRight size={19} />
                <span>{target.name}</span>
              </button>
            );
          })}
        </div>
      )}
      {status === "loading" && (
        <div className="pano-loading" role="status">
          <span />
          <p>正在进入{point.name}…</p>
        </div>
      )}
      {status === "error" && (
        <div className="pano-error" role="alert">
          <b>这个点位暂时未能载入</b>
          <p>请检查网络后重试，或选择其他房间。</p>
          <button
            onClick={() => {
              if (viewer.current) setRetry((v) => v + 1);
              else location.reload();
            }}
          >
            重新载入
          </button>
        </div>
      )}
      <div className="pano-footer">
        {status === "preview-only" && (
          <button className="pano-retry" onClick={() => setRetry((v) => v + 1)}>
            重新载入高清图片
          </button>
        )}
        <div className="pano-neighbours">
          <span>前往</span>
          {point.links.map((id) => (
            <button key={id} onClick={() => go(id)}>
              {panoramaPoints.find((p) => p.id === id)!.name}
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
        <div className="pano-navigation">
          <button
            className="pano-step"
            aria-label="上一个全景点位"
            onClick={() =>
              go(
                panoramaPoints[(pointIndex - 1 + panoramaPoints.length) % panoramaPoints.length].id,
              )
            }
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="pano-location"
            aria-expanded={railOpen}
            aria-controls="panorama-points"
            onClick={() => setRailOpen(!railOpen)}
          >
            <MapPin size={18} />
            <span>
              <small>
                选择空间 · {pointIndex + 1}/{panoramaPoints.length}
              </small>
              <b>{point.name}</b>
            </span>
            <ChevronDown size={18} className={railOpen ? "opened" : ""} />
          </button>
          <button
            className="pano-step"
            aria-label="下一个全景点位"
            onClick={() => go(panoramaPoints[(pointIndex + 1) % panoramaPoints.length].id)}
          >
            <ChevronRight size={20} />
          </button>
          <p>拖动环顾 · 双指或滚轮缩放</p>
        </div>
      </div>
      {railOpen && (
        <div
          className="pano-selector"
          id="panorama-points"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setRailOpen(false);
            }
          }}
        >
          <div className="pano-selector-heading">
            <h3>选择全景点位</h3>
            <button aria-label="关闭点位选择" onClick={() => setRailOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="pano-filters" aria-label="按房间筛选">
            {[{ id: "all", name: "全部" }, ...rooms].map((r) => (
              <button
                key={r.id}
                aria-pressed={roomFilter === r.id}
                onClick={() => setRoomFilter(r.id)}
              >
                {r.name}
              </button>
            ))}
          </div>
          <div className="pano-thumbnails">
            {shown.map((p) => (
              <button
                key={p.id}
                aria-current={pointId === p.id ? "location" : undefined}
                onClick={() => go(p.id)}
              >
                <img src={panoramaUrl(p.id, true)} alt="" loading="lazy" />
                <span>{p.name}</span>
                {p.id === pointId && <small>当前点位</small>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
