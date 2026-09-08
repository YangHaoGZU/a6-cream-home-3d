import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  rooms,
  floorRects,
  walls,
  contains,
  roomAt,
  coreObstacles,
  floorElevation,
  type Rect,
} from "./plan";
import { buildFurnishings } from "./furnishings";
import { buildCore } from "./core";
import { fittedCameraDistance, LookPointer } from "./navigation";
import { RESIDENCE, buildLowerFacade, buildPostProcessing, createTileMaterial } from "./atmosphere";
export type Mode = "overview" | "walk" | "plan";
export type TourOptions = {
  mode: Mode;
  ceiling: boolean;
  cutaway: boolean;
  dimensions: boolean;
  furniture: boolean;
};
export type TourApi = {
  setOptions: (o: TourOptions) => void;
  go: (id: string) => void;
  reset: () => void;
  move: (direction: string, pressed: boolean) => void;
  stop: () => void;
  dispose: () => void;
};
export function createTour(
  host: HTMLElement,
  onPosition: (x: number, z: number, yaw: number, id: string) => void,
): TourApi {
  const scene = new THREE.Scene();
  const studioBackground = new THREE.Color("#e6e9e6");
  scene.background = studioBackground;
  const camera = new THREE.PerspectiveCamera(46, 1, 0.05, 1200);
  const touchDevice = window.matchMedia("(pointer:coarse)").matches;
  camera.rotation.order = "YXZ";
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, touchDevice ? 1.25 : 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.localClippingEnabled = true;
  host.appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    "aria-label",
    "三维户型。漫游时拖动环顾，使用屏幕方向键或 W A S D 行走；总览时双指缩放和平移。",
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 48;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  const environment = pmrem.fromScene(envScene, 0.03);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.25;
  envScene.dispose();
  pmrem.dispose();
  const skyLight = new THREE.HemisphereLight(0xe6efff, 0xc6ad8d, 1.2);
  scene.add(skyLight);
  const sun = new THREE.DirectionalLight(0xffe8c4, 3.5);
  sun.position.set(-22, 23, 28);
  sun.target.position.set(7, 0, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(touchDevice ? 2048 : 4096, touchDevice ? 2048 : 4096);
  Object.assign(sun.shadow.camera, {
    left: -16,
    right: 16,
    top: 16,
    bottom: -16,
    near: 0.5,
    far: 70,
  });
  sun.shadow.bias = -0.00007;
  sun.shadow.normalBias = 0.008;
  sun.shadow.radius = 3;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  scene.add(sun, sun.target);
  const wallMat = new THREE.MeshStandardMaterial({ color: "#f4ecdf", roughness: 0.88 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: "#ddd0b8", roughness: 0.72 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#e7ddca", roughness: 0.63 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: "#fff9ee", roughness: 0.92 });
  const frameMat = new THREE.MeshStandardMaterial({
    color: "#817b6d",
    roughness: 0.43,
    metalness: 0.55,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#e6f1ee",
    roughness: 0.065,
    metalness: 0,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: "#62665e",
    metalness: 0.45,
    roughness: 0.53,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: "#fff2c9",
    emissive: "#ffe2a0",
    emissiveIntensity: 2,
  });
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const floors = new THREE.Group();
  const wallGroup = new THREE.Group();
  const ceilingGroup = new THREE.Group();
  const dimGroup = new THREE.Group();
  const caps = new THREE.Group();
  scene.add(floors, wallGroup, ceilingGroup, dimGroup, caps);
  const collisions: Rect[] = [];
  const solidParts: { x: number; z: number; w: number; d: number; b: number; t: number }[] = [];
  const trackedMaterials = new Set<THREE.Material>();
  const claddingMaterials: THREE.Material[] = [];
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    parent: THREE.Object3D = scene,
    shadow = true,
  ) {
    if (w <= 0 || h <= 0 || d <= 0) return;
    const mesh = new THREE.Mesh(boxGeometry, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    trackedMaterials.add(mat);
    return mesh;
  }
  function tileMaterial(w: number, d: number, outdoor = false) {
    return createTileMaterial(w, d, Math.min(8, renderer.capabilities.getMaxAnisotropy()), outdoor);
  }
  for (const r of floorRects) {
    const [x, z, x2, z2] = r;
    box((x + x2) / 2, -0.126, (z + z2) / 2, x2 - x, 0.22, z2 - z, stoneMat, floors);
    const material = tileMaterial(x2 - x, z2 - z);
    box((x + x2) / 2, -0.008, (z + z2) / 2, x2 - x, 0.016, z2 - z, material, floors, false);
  }
  // Dedicated anti-slip tile faces, continuous same cream family.
  for (const r of rooms.filter((r) => r.outdoor)) {
    const [x, z, x2, z2] = r.rect;
    box(
      (x + x2) / 2,
      -0.0055,
      (z + z2) / 2,
      x2 - x,
      0.012,
      z2 - z,
      tileMaterial(x2 - x, z2 - z, true),
      floors,
      false,
    );
  }
  for (const wall of walls) {
    const [ax, az] = wall.a,
      [bx, bz] = wall.b;
    const vertical = ax === bx;
    const length = Math.hypot(bx - ax, bz - az),
      height = wall.height ?? 3,
      th = wall.thickness ?? (wall.external ? 0.2 : 0.12);
    const openings = [...(wall.openings ?? [])].sort((a, b) => a.a - b.a);
    function part(
      start: number,
      end: number,
      bottom: number,
      top: number,
      mat: THREE.Material = wallMat,
    ) {
      if (end - start < 0.001 || top - bottom < 0.001) return;
      const mid = (start + end) / 2;
      const x = vertical ? ax : ax + mid,
        z = vertical ? az + mid : az;
      const w = vertical ? th : end - start,
        d = vertical ? end - start : th;
      box(x, (bottom + top) / 2, z, w, top - bottom, d, mat, wallGroup);
      if (bottom < 1.9 && top > 0.25) collisions.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
      solidParts.push({ x, z, w, d, b: bottom, t: top });
      if (bottom === 0) {
        box(x, 0.044, z, w + 0.014, 0.088, d + 0.014, trimMat, wallGroup, false);
      }
      for (const bathroom of rooms.filter((r) => r.id.startsWith("bath"))) {
        const r = bathroom.rect;
        let from: number, to: number, offset: number;
        if (vertical) {
          if (Math.abs(ax - r[0]) < 0.01) offset = th / 2 + 0.01;
          else if (Math.abs(ax - r[2]) < 0.01) offset = -th / 2 - 0.01;
          else continue;
          from = Math.max(az + start, r[1]);
          to = Math.min(az + end, r[3]);
        } else {
          if (Math.abs(az - r[1]) < 0.01) offset = th / 2 + 0.01;
          else if (Math.abs(az - r[3]) < 0.01) offset = -th / 2 - 0.01;
          else continue;
          from = Math.max(ax + start, r[0]);
          to = Math.min(ax + end, r[2]);
        }
        const hi = Math.min(top, 2.85);
        if (to - from > 0.015 && hi > bottom) {
          const finish = tileMaterial(to - from, hi - bottom);
          finish.roughness = 0.43;
          claddingMaterials.push(finish);
          box(
            vertical ? ax + offset : (from + to) / 2,
            (hi + bottom) / 2,
            vertical ? (from + to) / 2 : az + offset,
            vertical ? 0.016 : to - from,
            hi - bottom,
            vertical ? to - from : 0.016,
            finish,
            wallGroup,
            false,
          );
        }
      }
    }
    let cursor = 0;
    for (const opening of openings) {
      part(cursor, opening.a, 0, height);
      part(opening.a, opening.b, 0, opening.bottom);
      part(opening.a, opening.b, opening.top, height);
      const a = opening.a,
        b = opening.b,
        lo = opening.bottom,
        hi = opening.top;
      const frame = (s: number, e: number, l: number, h: number) => {
        const mid = (s + e) / 2;
        box(
          vertical ? ax : ax + mid,
          (l + h) / 2,
          vertical ? az + mid : az,
          vertical ? th + 0.02 : e - s,
          h - l,
          vertical ? e - s : th + 0.02,
          opening.kind === "door" ? trimMat : frameMat,
          wallGroup,
        );
      };
      frame(a, a + 0.045, lo, hi);
      frame(b - 0.045, b, lo, hi);
      frame(a, b, hi - 0.045, hi);
      if (opening.kind === "window") {
        frame(a, b, lo, lo + 0.04);
        const subdivisions = Math.max(1, Math.ceil((b - a) / 1.25));
        for (let i = 1; i < subdivisions; i++) {
          const p = a + ((b - a) * i) / subdivisions;
          frame(p - 0.018, p + 0.018, lo, hi);
        }
        const mid = (a + b) / 2;
        box(
          vertical ? ax : ax + mid,
          (lo + hi) / 2,
          vertical ? az + mid : az,
          vertical ? 0.015 : b - a,
          hi - lo,
          vertical ? b - a : 0.015,
          glassMat,
          wallGroup,
          false,
        );
        if (lo < 1.9)
          collisions.push(
            vertical
              ? [ax - 0.06, az + a, ax + 0.06, az + b]
              : [ax + a, az - 0.06, ax + b, az + 0.06],
          );
      }
      cursor = b;
    }
    part(cursor, length, 0, height);
  }
  // Balcony guardrails / genuine six-metre terrace columns; no mezzanine floor.
  function rail(ax: number, az: number, bx: number, bz: number) {
    const vertical = ax === bx,
      length = Math.hypot(bx - ax, bz - az);
    box(
      (ax + bx) / 2,
      0.1,
      (az + bz) / 2,
      vertical ? 0.14 : length,
      0.2,
      vertical ? length : 0.14,
      stoneMat,
    );
    box(
      (ax + bx) / 2,
      1.15,
      (az + bz) / 2,
      vertical ? 0.05 : length,
      0.045,
      vertical ? length : 0.05,
      railMat,
    );
    for (let t = 0; t <= length; t += 0.13)
      box(
        vertical ? ax : ax + t,
        0.65,
        vertical ? az + t : az,
        0.018,
        1,
        0.018,
        railMat,
        scene,
        false,
      );
    collisions.push([
      Math.min(ax, bx) - 0.1,
      Math.min(az, bz) - 0.1,
      Math.max(ax, bx) + 0.1,
      Math.max(az, bz) + 0.1,
    ]);
  }
  rail(0, 5, 0, 17.8);
  rail(0, 17.8, 4, 17.8);
  rail(4, 16.7, 4, 17.8);
  for (const [x, z, h] of [
    [0, 5, 3],
    [0, 12.8, 6],
    [0, 17.8, 6],
    [4, 17.8, 6],
  ]) {
    box(x, h / 2, z, 0.32, h, 0.32, wallMat);
    collisions.push([x - 0.16, z - 0.16, x + 0.16, z + 0.16]);
  }
  const core = buildCore();
  scene.add(core.group);
  ceilingGroup.add(core.ceiling);
  collisions.push(...coreObstacles);
  // Exact structural heights: ceiling surface at 3m / 6m; shallow perimeter soffit at 2.85m / 5.85m.
  const ceilingRects: Rect[] = [
    [4, 0, 7, 1.4],
    [4, 1.4, 7, 5],
    [7, 1.4, 10.2, 5],
    [10.2, 1.4, 13.5, 6.6],
    [13.5, 2.3, 15.2, 6.6],
    [8.6, 5, 10.2, 6.6],
    [2.1, 5, 8.6, 11.6],
    [2.1, 11.6, 9, 12.8],
    [0, 5, 2.1, 12.8],
    [4, 12.8, 7.2, 16.7],
    [7.2, 12.8, 9, 16.7],
    [9, 11.6, 13.1, 16.7],
    [13.1, 11.6, 15.2, 16.7],
    [0, 12.8, 4, 17.8],
    [8.6, 8.95, 11.8, 11.6],
    [11.8, 10.22, 16.4, 11.6],
    [8.6, 6.6, 10.85, 8.95],
    [10.85, 6.6, 11.8, 8.95],
  ];
  for (const r of ceilingRects) {
    const [x, z, x2, z2] = r,
      w = x2 - x,
      d = z2 - z,
      h = x === 0 && z === 12.8 ? 6 : 3;
    box((x + x2) / 2, h + 0.07, (z + z2) / 2, w, 0.14, d, ceilingMat, ceilingGroup);
    const inset = 0.26;
    box((x + x2) / 2, h - 0.075, z + inset / 2, w, 0.15, inset, ceilingMat, ceilingGroup);
    box((x + x2) / 2, h - 0.075, z2 - inset / 2, w, 0.15, inset, ceilingMat, ceilingGroup);
    box(x + inset / 2, h - 0.075, (z + z2) / 2, inset, 0.15, d, ceilingMat, ceilingGroup);
    box(x2 - inset / 2, h - 0.075, (z + z2) / 2, inset, 0.15, d, ceilingMat, ceilingGroup);
    if (w > 2 && d > 2) {
      box((x + x2) / 2, h - 0.105, z + 0.265, w - 0.54, 0.015, 0.025, glowMat, ceilingGroup, false);
      box(
        (x + x2) / 2,
        h - 0.105,
        z2 - 0.265,
        w - 0.54,
        0.015,
        0.025,
        glowMat,
        ceilingGroup,
        false,
      );
      for (const xx of [x + 0.55, x2 - 0.55])
        for (const zz of [z + 0.55, z2 - 0.55]) {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.014, 16), glowMat);
          disc.position.set(xx, h - 0.16, zz);
          ceilingGroup.add(disc);
        }
    }
  }
  const fitted = buildFurnishings();
  scene.add(fitted.group, fitted.ceilingFixtures);
  const lowerFacade = buildLowerFacade();
  scene.add(lowerFacade);
  // The studio plinth is only visible in diagram views. In walkthrough the home is elevated.
  const studioGround = box(
    7.6,
    -0.47,
    8.9,
    200,
    0.08,
    200,
    new THREE.MeshStandardMaterial({ color: "#e0e3dd", roughness: 1 }),
    scene,
    false,
  )!;
  const roomLights = new Map<string, THREE.SpotLight>();
  for (const room of rooms.filter((r) => !r.outdoor)) {
    const [x, z, x2, z2] = room.rect,
      cx = (x + x2) / 2,
      cz = (z + z2) / 2;
    const light = new THREE.SpotLight(0xffddb0, 32, 6.5, Math.PI * 0.39, 0.75, 2);
    light.position.set(cx, room.id === "stairs" ? 5.76 : room.id === "lift" ? 2.4 : 2.76, cz);
    light.target.position.set(cx, 0, cz);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.0002;
    light.shadow.normalBias = 0.015;
    light.shadow.autoUpdate = false;
    light.visible = false;
    roomLights.set(room.id, light);
    scene.add(light, light.target);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.016, 16), glowMat);
    lens.position.set(cx, room.id === "stairs" ? 5.836 : 2.836, cz);
    ceilingGroup.add(lens);
  }
  let panorama: THREE.Texture | null = null,
    cityEnvironment: THREE.WebGLRenderTarget | null = null,
    disposed = false;
  new THREE.TextureLoader().load(
    RESIDENCE.panorama,
    (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      panorama = texture;
      const generator = new THREE.PMREMGenerator(renderer);
      cityEnvironment = generator.fromEquirectangular(texture);
      generator.dispose();
      applyOptions();
    },
    undefined,
    () => console.warn("城市全景暂未载入，保留天空与室内漫游。"),
  );
  const post = buildPostProcessing(renderer, scene, camera, touchDevice);
  function updateRoomLight(id: string) {
    for (const [key, light] of roomLights) {
      const visible = options.mode === "walk" && options.ceiling && key === id;
      if (visible && !light.visible) light.shadow.needsUpdate = true;
      light.visible = visible;
    }
  }
  const dimensionMat = new THREE.LineBasicMaterial({ color: "#7e6d54", depthTest: false });
  function line(points: number[][]) {
    const g = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    );
    const l = new THREE.Line(g, dimensionMat);
    l.renderOrder = 4;
    dimGroup.add(l);
  }
  function label(text: string, x: number, y: number, z: number, scale = 1.5) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(255,253,246,.96)";
    ctx.beginPath();
    ctx.roundRect(4, 4, 504, 120, 20);
    ctx.fill();
    ctx.fillStyle = "#514637";
    ctx.font = "500 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 66);
    const texture = new THREE.CanvasTexture(c);
    const m = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const s = new THREE.Sprite(m);
    s.position.set(x, y, z);
    s.scale.set(scale, scale / 4, 1);
    s.renderOrder = 6;
    dimGroup.add(s);
  }
  function dimX(a: number, b: number, z: number, text: string) {
    line([
      [a, 0.06, z],
      [b, 0.06, z],
    ]);
    for (const x of [a, b])
      line([
        [x, 0.06, z - 0.13],
        [x, 0.06, z + 0.13],
      ]);
    label(text, (a + b) / 2, 0.12, z, 0.95);
  }
  let offset = 0;
  for (const len of [4, 3.2, 1.8, 4.1, 2.1]) {
    dimX(offset, offset + len, 18.65, (len * 1000).toFixed(0));
    offset += len;
  }
  dimX(0, 15.2, -1.1, "15 200 mm");
  line([
    [-0.9, 0.08, 0],
    [-0.9, 0.08, 17.8],
  ]);
  label("17 800 mm", -0.9, 0.2, 8.9, 2);
  line([
    [-0.5, 0, 17.8],
    [-0.5, 6, 17.8],
  ]);
  label("6 000 mm", -0.5, 4.4, 17.8, 1.8);
  label("3 000 mm", -0.2, 3.15, 8, 1.6);
  for (const r of rooms.filter((r) => !r.id.startsWith("bath") && r.id !== "entry"))
    label(r.name, r.position[0], 0.15, r.position[1], 1.35);
  label("北 ↑", 7.6, 0.1, -2, 1.2);
  label("挑空 · 无楼板", 2, 0.1, 2.5, 2);
  label("公共电梯 / 楼梯", 12.7, 0.11, 9.1, 2.5);
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.2);
  for (const p of solidParts)
    if (p.b < 1.2 && p.t > 1.2) box(p.x, 1.198, p.z, p.w, 0.008, p.d, trimMat, caps, false);
  let options: TourOptions = {
    mode: "overview",
    ceiling: false,
    cutaway: true,
    dimensions: false,
    furniture: true,
  };
  let selected = "living",
    yaw = Math.PI,
    pitch = 0,
    drag = false,
    downX = 0,
    downY = 0,
    lastX = 0,
    lastY = 0,
    moved = 0,
    frame = 0,
    prevTime = 0,
    lastReport = 0;
  const pressed = new Set<string>();
  const lookPointer = new LookPointer();
  function applyOptions() {
    const walk = options.mode === "walk";
    controls.enabled = !walk;
    ceilingGroup.visible = options.ceiling;
    fitted.group.visible = options.furniture;
    fitted.ceilingFixtures.visible = options.ceiling && options.furniture;
    dimGroup.visible = options.dimensions && !walk;
    const cut = options.cutaway && !walk;
    for (const mat of [wallMat, trimMat, frameMat, glassMat, ...claddingMaterials]) {
      mat.clippingPlanes = cut ? [clipPlane] : [];
      mat.needsUpdate = true;
    }
    caps.visible = cut;
    renderer.toneMappingExposure = walk ? 1.12 : 1.05;
    controls.enableRotate = options.mode !== "plan";
    controls.touches.ONE = options.mode === "plan" ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    lowerFacade.visible = walk;
    studioGround.visible = !walk;
    scene.background = walk ? (panorama ?? new THREE.Color("#c6d9e8")) : studioBackground;
    scene.backgroundIntensity = 0.8;
    scene.backgroundRotation.y = -Math.PI * 0.25;
    scene.environment = walk && cityEnvironment ? cityEnvironment.texture : environment.texture;
    scene.environmentRotation.y = walk ? -Math.PI * 0.25 : 0;
    scene.environmentIntensity = walk ? 0.5 : 0.3;
    skyLight.intensity = walk ? 1.15 : 1.8;
    post.setWalk(walk);
    sun.shadow.needsUpdate = true;
    for (const light of roomLights.values()) light.shadow.needsUpdate = true;
    updateRoomLight(roomAt(camera.position.x, camera.position.z)?.id ?? selected);
  }
  function setWalk(id: string) {
    const room = rooms.find((r) => r.id === id) ?? rooms[0];
    selected = id;
    yaw = room.yaw;
    pitch = 0;
    camera.position.set(
      room.position[0],
      1.65 + floorElevation(...room.position),
      room.position[1],
    );
    camera.rotation.set(pitch, yaw, 0);
    camera.fov = camera.aspect < 0.8 ? 78 : 65;
    camera.updateProjectionMatrix();
    updateRoomLight(id);
    onPosition(camera.position.x, camera.position.z, yaw, id);
  }
  function view(mode: Mode) {
    if (mode === "walk") {
      setWalk(selected);
      return;
    }
    camera.fov = 46;
    camera.updateProjectionMatrix();
    controls.target.set(8.2, 0, 8.9);
    const distance = fittedCameraDistance(mode, camera.aspect, camera.fov);
    controls.maxDistance = Math.max(48, distance * 1.5);
    if (mode === "plan") camera.position.set(8.2, distance, 8.901);
    else
      camera.position
        .copy(controls.target)
        .add(new THREE.Vector3(19.4, 23, 22.1).normalize().multiplyScalar(distance));
    controls.update();
  }
  function canWalk(x: number, z: number) {
    const radius = 0.16;
    if (!floorRects.some((r) => contains(r, x, z))) return false;
    const hits = (r: Rect) =>
      x > r[0] - radius && x < r[2] + radius && z > r[1] - radius && z < r[3] + radius;
    return !collisions.some(hits) && (!options.furniture || !fitted.obstacles.some(hits));
  }
  function advance(dx: number, dz: number) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.07));
    for (let i = 0; i < steps; i++) {
      const reachable = (x: number, z: number) =>
        canWalk(x, z) &&
        Math.abs(floorElevation(x, z) - floorElevation(camera.position.x, camera.position.z)) < 0.2;
      if (reachable(camera.position.x + dx / steps, camera.position.z))
        camera.position.x += dx / steps;
      if (reachable(camera.position.x, camera.position.z + dz / steps))
        camera.position.z += dz / steps;
    }
  }
  function down(e: PointerEvent) {
    if (options.mode !== "walk" || e.button > 0) return;
    if (!lookPointer.begin(e.pointerId)) {
      moved = Infinity;
      return;
    }
    renderer.domElement.focus({ preventScroll: true });
    drag = true;
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
    moved = 0;
    renderer.domElement.setPointerCapture(e.pointerId);
  }
  function motion(e: PointerEvent) {
    if (!drag || options.mode !== "walk" || !lookPointer.owns(e.pointerId)) return;
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    yaw -= dx * 0.004;
    pitch = THREE.MathUtils.clamp(pitch - dy * 0.003, -1.25, 1.25);
    camera.rotation.set(pitch, yaw, 0);
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function up(e: PointerEvent) {
    if (!drag || !lookPointer.end(e.pointerId)) return;
    drag = false;
    if (moved < (e.pointerType === "touch" ? 10 : 6) && options.mode === "walk" && !pressed.size) {
      const rect = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((downX - rect.left) / rect.width) * 2 - 1,
          (-(downY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects([...floors.children, ...core.surfaces], false)[0];
      if (hit && hit.distance < 12) {
        advance(hit.point.x - camera.position.x, hit.point.z - camera.position.z);
      }
    }
    if (renderer.domElement.hasPointerCapture(e.pointerId))
      renderer.domElement.releasePointerCapture(e.pointerId);
  }
  function keyboard(e: KeyboardEvent) {
    if (
      options.mode !== "walk" ||
      (e.target instanceof HTMLElement && e.target.closest('button,input,[role="dialog"]'))
    )
      return;
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ShiftLeft",
      ].includes(e.code)
    ) {
      e.preventDefault();
      pressed.add(e.code);
    }
  }
  const release = (e: KeyboardEvent) => pressed.delete(e.code);
  const blur = () => {
    pressed.clear();
    drag = false;
    lookPointer.reset();
  };
  const cancelLook = (e: PointerEvent) => {
    if (lookPointer.end(e.pointerId)) drag = false;
  };
  const visibility = () => {
    if (document.hidden) blur();
  };
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointermove", motion);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointercancel", cancelLook);
  renderer.domElement.addEventListener("lostpointercapture", cancelLook);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("keydown", keyboard);
  window.addEventListener("keyup", release);
  window.addEventListener("blur", blur);
  let lastWidth = 0,
    lastPortrait = false;
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (width && height) {
      renderer.setSize(width, height);
      post.resize(width, height);
      camera.aspect = width / height;
      if (options.mode === "walk") camera.fov = camera.aspect < 0.8 ? 78 : 65;
      camera.updateProjectionMatrix();
      const portrait = width < height;
      if (
        options.mode !== "walk" &&
        (lastWidth === 0 ||
          portrait !== lastPortrait ||
          Math.abs(width - lastWidth) > lastWidth * 0.25)
      )
        view(options.mode);
      lastWidth = width;
      lastPortrait = portrait;
    }
  });
  resize.observe(host);
  function animate(time: number) {
    const dt = Math.min((time - prevTime) / 1000, 0.05);
    prevTime = time;
    if (document.hidden) {
      frame = requestAnimationFrame(animate);
      return;
    }
    if (options.mode === "walk") {
      let f =
        Number(pressed.has("KeyW") || pressed.has("ArrowUp")) -
        Number(pressed.has("KeyS") || pressed.has("ArrowDown"));
      let r = Number(pressed.has("KeyD")) - Number(pressed.has("KeyA"));
      const normal = Math.hypot(f, r) || 1;
      f /= normal;
      r /= normal;
      const speed = (pressed.has("ShiftLeft") ? 3 : 1.7) * dt;
      advance(
        (-Math.sin(yaw) * f + Math.cos(yaw) * r) * speed,
        (-Math.cos(yaw) * f - Math.sin(yaw) * r) * speed,
      );
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        1.65 + floorElevation(camera.position.x, camera.position.z),
        1 - Math.exp(-14 * dt),
      );
      if (pressed.has("ArrowLeft")) yaw += dt * 1.4;
      if (pressed.has("ArrowRight")) yaw -= dt * 1.4;
      camera.rotation.set(pitch, yaw, 0);
      if (time - lastReport > 150) {
        const room = roomAt(camera.position.x, camera.position.z);
        updateRoomLight(room?.id ?? selected);
        onPosition(camera.position.x, camera.position.z, yaw, room?.id ?? selected);
        lastReport = time;
      }
    } else controls.update();
    post.render();
    frame = requestAnimationFrame(animate);
  }
  view("overview");
  applyOptions();
  frame = requestAnimationFrame(animate);
  return {
    setOptions(o) {
      const changed = options.mode !== o.mode,
        restoreFurniture = !options.furniture && o.furniture;
      options = o;
      blur();
      applyOptions();
      if (changed) view(o.mode);
      else if (
        restoreFurniture &&
        o.mode === "walk" &&
        !canWalk(camera.position.x, camera.position.z)
      )
        setWalk(roomAt(camera.position.x, camera.position.z)?.id ?? selected);
    },
    go(id) {
      blur();
      selected = id;
      if (options.mode === "walk") setWalk(id);
      else {
        const r = rooms.find((r) => r.id === id)!;
        controls.target.set(r.position[0], 0, r.position[1]);
        camera.position.set(r.position[0] + 8, 12, r.position[1] + 10);
        controls.update();
      }
    },
    reset() {
      blur();
      view(options.mode);
    },
    move(direction, active) {
      if (active) pressed.add(direction);
      else pressed.delete(direction);
    },
    stop: blur,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      window.removeEventListener("keydown", keyboard);
      window.removeEventListener("keyup", release);
      window.removeEventListener("blur", blur);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", motion);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", cancelLook);
      renderer.domElement.removeEventListener("lostpointercapture", cancelLook);
      document.removeEventListener("visibilitychange", visibility);
      const geometries = new Set<THREE.BufferGeometry>(),
        textures = new Set<THREE.Texture>();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Sprite) {
          if ("geometry" in obj) geometries.add(obj.geometry);
          for (const m of Array.isArray(obj.material) ? obj.material : [obj.material])
            trackedMaterials.add(m);
        }
      });
      for (const g of geometries) g.dispose();
      for (const m of trackedMaterials) {
        for (const value of Object.values(m))
          if (value instanceof THREE.Texture) textures.add(value);
        m.dispose();
      }
      for (const texture of textures) texture.dispose();
      sun.shadow.dispose();
      for (const light of roomLights.values()) light.shadow.dispose();
      post.dispose();
      panorama?.dispose();
      cityEnvironment?.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
