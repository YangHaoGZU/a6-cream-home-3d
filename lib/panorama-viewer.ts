import * as THREE from "three";
import { panoramaUrl, type PanoramaPoint } from "./panorama-data";
export type PanoramaViewer = ReturnType<typeof createPanoramaViewer>;
export function createPanoramaViewer(host: HTMLElement, onDraw: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "360度全景。拖动环顾、双指或滚轮缩放，方向键环顾。");
  host.appendChild(canvas);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 30);
  camera.rotation.order = "YXZ";
  // Center of each source panorama is north; its right quarter is east.
  const geometry = new THREE.SphereGeometry(10, 64, 40);
  geometry.scale(-1, 1, 1);
  geometry.rotateY(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  scene.add(new THREE.Mesh(geometry, material));
  scene.background = new THREE.Color("#e8e2d7");
  let yaw = 0,
    pitch = 0,
    startYaw = 0,
    frame = 0,
    disposed = false,
    abort: AbortController | null = null;
  let currentTexture: THREE.Texture | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  const draw = () => {
    frame = 0;
    if (disposed) return;
    camera.rotation.set(pitch, yaw, 0);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    onDraw();
  };
  const invalidate = () => {
    if (!disposed && !frame) frame = requestAnimationFrame(draw);
  };
  const changeFov = (fov: number) => {
    camera.fov = THREE.MathUtils.clamp(fov, 40, 100);
    camera.updateProjectionMatrix();
    invalidate();
  };
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    invalidate();
  });
  resize.observe(host);
  function down(event: PointerEvent) {
    if (event.button > 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
  }
  function motion(event: PointerEvent) {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    if (pointers.size === 1) {
      yaw -= (event.clientX - previous.x) * 0.004;
      pitch = THREE.MathUtils.clamp(
        pitch - (event.clientY - previous.y) * 0.003,
        -Math.PI * 0.48,
        Math.PI * 0.48,
      );
    } else if (pointers.size === 2) {
      const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)![1];
      const old = Math.hypot(previous.x - other.x, previous.y - other.y),
        next = Math.hypot(event.clientX - other.x, event.clientY - other.y);
      if (old > 8 && next > 8) changeFov((camera.fov * old) / next);
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    invalidate();
  }
  function up(event: PointerEvent) {
    pointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  function wheel(event: WheelEvent) {
    event.preventDefault();
    changeFov(camera.fov + event.deltaY * 0.035);
  }
  function keyboard(event: KeyboardEvent) {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft") yaw += 0.09;
    if (event.key === "ArrowRight") yaw -= 0.09;
    if (event.key === "ArrowUp") pitch = Math.min(pitch + 0.07, Math.PI * 0.48);
    if (event.key === "ArrowDown") pitch = Math.max(pitch - 0.07, -Math.PI * 0.48);
    if (event.key === "+" || event.key === "=") changeFov(camera.fov - 5);
    if (event.key === "-") changeFov(camera.fov + 5);
    invalidate();
  }
  const blur = () => pointers.clear();
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", motion);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("lostpointercapture", up);
  canvas.addEventListener("wheel", wheel, { passive: false });
  canvas.addEventListener("keydown", keyboard);
  window.addEventListener("blur", blur);
  function releaseTexture(texture: THREE.Texture | null) {
    if (!texture) return;
    texture.dispose();
    (texture.image as ImageBitmap)?.close?.();
  }
  async function texture(url: string, signal: AbortSignal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("全景图片暂时无法载入");
    const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: "flipY" });
    if (disposed || signal.aborted) {
      bitmap.close();
      throw new DOMException("Aborted", "AbortError");
    }
    const result = new THREE.Texture(bitmap);
    result.colorSpace = THREE.SRGBColorSpace;
    result.flipY = false;
    result.generateMipmaps = false;
    result.minFilter = THREE.LinearFilter;
    result.needsUpdate = true;
    return result;
  }
  const apply = (next: THREE.Texture) => {
    const old = currentTexture;
    currentTexture = next;
    material.map = next;
    material.needsUpdate = true;
    releaseTexture(old);
    invalidate();
  };
  return {
    refresh: invalidate,
    async load(point: PanoramaPoint, onPreview: () => void) {
      abort?.abort();
      abort = new AbortController();
      const signal = abort.signal;
      pointers.clear();
      startYaw = yaw = point.yaw;
      pitch = 0;
      changeFov(camera.aspect < 0.8 ? 84 : 75);
      // Keep a neutral canvas until this location's preview arrives; never label the previous room as the new one.
      material.map = null;
      material.needsUpdate = true;
      releaseTexture(currentTexture);
      currentTexture = null;
      invalidate();
      let previewReady = false;
      try {
        apply(await texture(panoramaUrl(point.id, true), signal));
        previewReady = true;
        onPreview();
      } catch (error) {
        if (signal.aborted || disposed) throw error;
      }
      try {
        apply(await texture(panoramaUrl(point.id), signal));
        return "hd" as const;
      } catch (error) {
        if (signal.aborted || disposed || !previewReady) throw error;
        return "preview" as const;
      }
    },
    reset() {
      yaw = startYaw;
      pitch = 0;
      changeFov(camera.aspect < 0.8 ? 84 : 75);
    },
    zoom(delta: number) {
      changeFov(camera.fov + delta);
    },
    project(targetYaw: number, targetPitch: number) {
      const v = new THREE.Vector3(
        -Math.sin(targetYaw) * Math.cos(targetPitch),
        Math.sin(targetPitch),
        -Math.cos(targetYaw) * Math.cos(targetPitch),
      )
        .multiplyScalar(8)
        .project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
        y: (-0.5 * v.y + 0.5) * canvas.clientHeight,
        visible: v.z > -1 && v.z < 1 && Math.abs(v.x) < 0.89 && Math.abs(v.y) < 0.82,
      };
    },
    dispose() {
      disposed = true;
      abort?.abort();
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("blur", blur);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", motion);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("keydown", keyboard);
      releaseTexture(currentTexture);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
