import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  furnishings,
  furnishingObstacles,
  fixtureObstacles,
  type Furnishing,
} from "./furniture-layout";
import type { Rect } from "./plan";

export function buildFurnishings() {
  const group = new THREE.Group(),
    ceilingFixtures = new THREE.Group();
  group.name = "奶油风家具与家电";
  ceilingFixtures.name = "吊灯";
  const fabricCanvas = document.createElement("canvas");
  fabricCanvas.width = fabricCanvas.height = 128;
  const ctx = fabricCanvas.getContext("2d")!;
  ctx.fillStyle = "#f1ebdd";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i++) {
    ctx.fillStyle = i % 3 ? "#d6cbb72b" : "#ffffff4d";
    ctx.fillRect(i, 0, 1, 128);
    ctx.fillRect(0, i, 128, 1);
  }
  const weave = new THREE.CanvasTexture(fabricCanvas);
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.repeat.set(6, 6);
  weave.colorSpace = THREE.SRGBColorSpace;
  const mat = (color: string, roughness = 0.6, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const weaveRelief = weave.clone();
  weaveRelief.colorSpace = THREE.NoColorSpace;
  const cream = mat("#f2e7d4"),
    white = mat("#faf5e9"),
    taupe = mat("#b9a991"),
    stone = new THREE.MeshPhysicalMaterial({
      color: "#dacbb2",
      roughness: 0.3,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
    }),
    ceramic = new THREE.MeshPhysicalMaterial({
      color: "#fffaf0",
      roughness: 0.17,
      clearcoat: 0.7,
      clearcoatRoughness: 0.1,
    }),
    linen = new THREE.MeshPhysicalMaterial({
      map: weave,
      bumpMap: weaveRelief,
      bumpScale: 0.001,
      color: "#f9f0dd",
      roughness: 0.94,
      sheen: 0.5,
      sheenColor: "#efe6d4",
      sheenRoughness: 0.85,
    }),
    sand = new THREE.MeshPhysicalMaterial({
      map: weave,
      bumpMap: weaveRelief,
      bumpScale: 0.001,
      color: "#c4b39a",
      roughness: 0.97,
      sheen: 0.4,
      sheenColor: "#d9c9b1",
      sheenRoughness: 0.9,
    }),
    brass = mat("#b8a17a", 0.27, 0.7),
    steel = mat("#a5aaa7", 0.25, 0.85),
    dark = mat("#252c2a", 0.26, 0.2),
    screen = mat("#111b20", 0.1, 0.25),
    oak = mat("#a8997d", 0.68),
    green = mat("#657658", 0.85),
    leafLight = mat("#8a9872", 0.8),
    soil = mat("#514a3d", 1);
  const mirror = new THREE.MeshStandardMaterial({
    color: "#d2dcdb",
    metalness: 1,
    roughness: 0.045,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#dae8e1",
    transparent: true,
    opacity: 0.19,
    roughness: 0.07,
    metalness: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const light = new THREE.MeshStandardMaterial({
    color: "#fff3d8",
    emissive: "#ffe1a3",
    emissiveIntensity: 1.25,
    roughness: 0.6,
  });
  const geometries = new Map<string, THREE.BufferGeometry>();
  function put(
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = material !== glass && material !== light;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function rounded(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material = cream,
    r = 0.04,
  ) {
    const radius = Math.min(r, w * 0.45, h * 0.45, d * 0.45),
      key = `r${w},${h},${d},${radius}`;
    let geo = geometries.get(key);
    if (!geo) {
      geo = new RoundedBoxGeometry(w, h, d, 2, radius);
      geometries.set(key, geo);
    }
    return put(parent, geo, m, x, y, z);
  }
  function cyl(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    m: THREE.Material = brass,
    rBottom = r,
    segments = 24,
  ) {
    const key = `c${r},${rBottom},${h},${segments}`;
    let geo = geometries.get(key);
    if (!geo) {
      geo = new THREE.CylinderGeometry(r, rBottom, h, segments);
      geometries.set(key, geo);
    }
    return put(parent, geo, m, x, y, z);
  }
  function orb(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
  ) {
    let geo = geometries.get("sphere");
    if (!geo) {
      geo = new THREE.SphereGeometry(1, 16, 12);
      geometries.set("sphere", geo);
    }
    const o = put(parent, geo, m, x, y, z);
    o.scale.set(w / 2, h / 2, d / 2);
    return o;
  }
  function ring(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    t: number,
    m: THREE.Material,
    flat = false,
  ) {
    const o = put(parent, new THREE.TorusGeometry(r, t, 8, 32), m, x, y, z);
    if (flat) o.rotation.x = Math.PI / 2;
    return o;
  }
  function tube(
    parent: THREE.Object3D,
    points: number[][],
    radius: number,
    m: THREE.Material = brass,
  ) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    );
    return put(parent, new THREE.TubeGeometry(curve, 16, radius, 8, false), m, 0, 0, 0);
  }
  function bowl(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    m: THREE.Material = ceramic,
  ) {
    const profile = [
      [0, 0],
      [0.29, 0],
      [0.43, 0.12],
      [0.5, 0.95],
      [0.47, 1],
      [0.435, 0.96],
      [0.375, 0.27],
      [0.28, 0.19],
      [0, 0.19],
    ].map(([r, a]) => new THREE.Vector2(r, a * h));
    const o = put(parent, new THREE.LatheGeometry(profile, 40), m, x, y, z);
    o.scale.set(w, 1, d);
    return o;
  }
  function faucet(parent: THREE.Object3D, x: number, y: number, z: number) {
    cyl(parent, x, y + 0.04, z, 0.025, 0.08, steel);
    tube(
      parent,
      [
        [x, y, z],
        [x, y + 0.22, z],
        [x, y + 0.27, z + 0.055],
        [x, y + 0.24, z + 0.16],
      ],
      0.013,
      steel,
    );
    rounded(parent, x + 0.065, y + 0.07, z, 0.09, 0.018, 0.035, steel, 0.008);
  }
  function book(parent: THREE.Object3D, x: number, y: number, z: number) {
    rounded(parent, x, y, z, 0.26, 0.025, 0.19, taupe, 0.004);
    rounded(parent, x + 0.02, y + 0.029, z, 0.24, 0.025, 0.18, white, 0.004);
  }
  function vase(parent: THREE.Object3D, x: number, y: number, z: number, small = false) {
    const s = small ? 0.55 : 1;
    const o = put(
      parent,
      new THREE.LatheGeometry(
        [
          [0, 0],
          [0.08, 0],
          [0.12, 0.08],
          [0.11, 0.18],
          [0.055, 0.25],
          [0.05, 0.32],
          [0.04, 0.32],
          [0.035, 0.23],
        ].map(([r, h]) => new THREE.Vector2(r * s, h * s)),
        24,
      ),
      taupe,
      x,
      y,
      z,
    );
    for (let i = 0; i < 3; i++) {
      const a = i * 2.3;
      const xx = x + Math.cos(a) * 0.12 * s,
        zz = z + Math.sin(a) * 0.12 * s;
      tube(
        parent,
        [
          [x, y + 0.25 * s, z],
          [xx, y + 0.55 * s, zz],
          [xx + 0.03, y + 0.65 * s, zz],
        ],
        0.004,
        green,
      );
      for (let j = 0; j < 3; j++) {
        const leaf = orb(
          parent,
          xx + 0.025 * j * s,
          y + (0.43 + 0.08 * j) * s,
          zz,
          0.11 * s,
          0.04 * s,
          0.055 * s,
          green,
        );
        leaf.rotation.z = 0.5 + j * 0.6;
      }
    }
    return o;
  }
  function lamp(parent: THREE.Object3D, x: number, y: number, z: number) {
    cyl(parent, x, y + 0.012, z, 0.085, 0.024, brass);
    cyl(parent, x, y + 0.16, z, 0.016, 0.3, brass);
    const shade = cyl(parent, x, y + 0.3, z, 0.16, 0.14, light, 0.19);
    return shade;
  }
  function bed(root: THREE.Group, f: Furnishing) {
    const { w, d } = f;
    for (const x of [-w * 0.37, w * 0.37])
      for (const z of [-d * 0.34, d * 0.34]) cyl(root, x, 0.09, z, 0.035, 0.18, oak);
    rounded(root, 0, 0.23, 0, w, 0.28, d, taupe, 0.09);
    rounded(root, 0, 0.43, 0, w - 0.015, 0.22, d - 0.035, white, 0.1);
    rounded(root, 0, 0.56, 0.17, w - 0.025, 0.16, d - 0.43, linen, 0.09);
    rounded(root, 0, 0.65, -d / 2 + 0.34, w * 0.43, 0.14, 0.42, white, 0.07).position.x = -w * 0.24;
    rounded(root, w * 0.24, 0.65, -d / 2 + 0.34, w * 0.43, 0.14, 0.42, white, 0.07);
    rounded(root, 0, 0.65, d / 2 - 0.4, w - 0.045, 0.035, 0.58, sand, 0.015);
    rounded(root, 0, 0.72, -d / 2 + 0.015, w + 0.12, 1.23, 0.11, linen, 0.055);
    for (let i = 0; i < 5; i++)
      rounded(root, (i - 2) * (w / 5), 0.75, -d / 2 + 0.078, w / 5 - 0.006, 1.1, 0.04, linen, 0.02);
  }
  function sofa(root: THREE.Group, f: Furnishing) {
    const { w, d } = f;
    const outdoor = f.variant === "outdoor";
    const upholstery = outdoor ? sand : linen;
    for (const x of [-w * 0.4, w * 0.4])
      for (const z of [-d * 0.3, d * 0.3]) cyl(root, x, 0.09, z, 0.035, 0.17, brass);
    rounded(root, 0, 0.29, 0, w, 0.32, d, upholstery, 0.12);
    rounded(root, 0, 0.68, -d / 2 + 0.12, w, 0.52, 0.23, upholstery, 0.1);
    for (const x of [-w / 2 + 0.12, w / 2 - 0.12])
      rounded(root, x, 0.58, 0.02, 0.25, 0.38, d - 0.07, upholstery, 0.115);
    const seats = w > 2.5 ? 3 : 2;
    for (let i = 0; i < seats; i++) {
      const sw = (w - 0.5) / seats;
      rounded(
        root,
        -(w - 0.5) / 2 + sw * (i + 0.5),
        0.48,
        0.06,
        sw - 0.02,
        0.18,
        d - 0.3,
        linen,
        0.075,
      );
      const cushion = rounded(
        root,
        -(w - 0.5) / 2 + sw * (i + 0.5),
        0.7,
        -0.19,
        sw - 0.05,
        0.39,
        0.15,
        linen,
        0.07,
      );
      cushion.rotation.x = 0.12;
    }
    const pillow = rounded(root, -w / 2 + 0.4, 0.73, 0.03, 0.4, 0.38, 0.14, sand, 0.09);
    pillow.rotation.set(-0.15, 0.1, 0.22);
    const pillow2 = rounded(root, w / 2 - 0.44, 0.72, 0.02, 0.4, 0.38, 0.14, white, 0.08);
    pillow2.rotation.z = -0.2;
  }
  function chair(root: THREE.Group, f: Furnishing, arm = false) {
    const { w, d } = f;
    for (const x of [-w * 0.34, w * 0.34])
      for (const z of [-d * 0.31, d * 0.31]) {
        const leg = cyl(root, x, 0.22, z, 0.019, 0.43, oak);
        leg.rotation.z = x > 0 ? -0.06 : 0.06;
      }
    rounded(root, 0, 0.46, 0.015, w, 0.14, d - 0.055, linen, 0.055);
    rounded(root, 0, 0.73, -d / 2 + 0.055, w, 0.48, 0.13, linen, 0.065);
    if (arm)
      for (const x of [-w / 2 + 0.065, w / 2 - 0.065])
        rounded(root, x, 0.65, 0.025, 0.13, 0.21, d - 0.08, sand, 0.06);
  }
  function table(root: THREE.Group, f: Furnishing, dining = false) {
    const h = dining ? 0.75 : 0.37;
    const top = cyl(root, 0, h - 0.03, 0, 0.5, 0.055, stone, 0.5, 48);
    top.scale.set(f.w, 1, f.d);
    if (dining) {
      for (const x of [-f.w * 0.27, f.w * 0.27]) {
        const base = cyl(root, x, (h - 0.06) / 2, 0, 0.19, h - 0.06, cream);
        base.scale.z = 0.85;
        for (let i = 0; i < 18; i++) {
          const a = (i * Math.PI) / 9;
          cyl(
            root,
            x + Math.sin(a) * 0.19,
            (h - 0.06) / 2,
            Math.cos(a) * 0.158,
            0.009,
            h - 0.08,
            taupe,
            undefined,
            8,
          );
        }
      }
    } else {
      const base = cyl(root, 0, 0.16, 0, 0.27, 0.3, taupe);
      base.scale.x = f.w * 0.68;
      base.scale.z = f.d * 0.65;
    }
    if (dining) {
      vase(root, 0, h, 0);
      for (const x of [-f.w * 0.28, f.w * 0.28])
        for (const z of [-f.d * 0.28, f.d * 0.28]) {
          const plate = cyl(root, x, h + 0.009, z, 0.115, 0.012, ceramic);
          ring(root, x, h + 0.017, z, 0.085, 0.002, taupe, true);
        }
    } else {
      book(root, -f.w * 0.17, h + 0.015, 0);
      vase(root, f.w * 0.24, h, 0, true);
    }
  }
  function cabinet(root: THREE.Group, f: Furnishing, h: number) {
    const n = Math.max(2, Math.round(f.w / 0.55));
    rounded(root, 0, h / 2, 0, f.w, h, f.d, cream, 0.012);
    rounded(root, 0, 0.035, 0.015, f.w - 0.09, 0.07, f.d - 0.05, taupe, 0.01);
    for (let i = 0; i < n; i++) {
      const x = -f.w / 2 + ((i + 0.5) * f.w) / n;
      rounded(
        root,
        x,
        h / 2 + 0.035,
        f.d / 2 + 0.008,
        f.w / n - 0.009,
        h - 0.095,
        0.024,
        cream,
        0.009,
      );
      rounded(
        root,
        x + (f.w / n) * 0.31,
        h * 0.52,
        f.d / 2 + 0.03,
        0.012,
        Math.min(0.24, h * 0.25),
        0.021,
        brass,
        0.006,
      );
    }
  }
  function nightstand(root: THREE.Group, f: Furnishing) {
    rounded(root, 0, 0.26, 0, f.w, 0.47, f.d, cream, 0.055);
    rounded(root, 0, 0.36, f.d / 2 + 0.004, f.w - 0.05, 0.17, 0.015, taupe, 0.009);
    rounded(root, 0, 0.16, f.d / 2 + 0.004, f.w - 0.05, 0.17, 0.015, cream, 0.009);
    lamp(root, 0, 0.5, 0);
  }
  function desk(root: THREE.Group, f: Furnishing) {
    rounded(root, 0, 0.75, 0, f.w, 0.055, f.d, stone, 0.025);
    for (const x of [-f.w * 0.4, f.w * 0.4])
      rounded(root, x, 0.37, 0, 0.045, 0.74, f.d * 0.82, brass, 0.012);
    rounded(root, 0, 0.66, 0.025, f.w - 0.09, 0.14, f.d - 0.05, cream, 0.015);
    rounded(root, 0, 0.65, f.d / 2, 0.18, 0.014, 0.025, brass, 0.004);
    if (f.variant === "vanity") {
      const o = orb(root, 0, 1.2, -f.d / 2, 0.57, 0.7, 0.035, mirror);
      ring(root, 0, 1.2, -f.d / 2 - 0.01, 0.29, 0.014, brass).scale.y = 1.2;
      vase(root, f.w * 0.32, 0.79, 0, true);
    } else {
      const laptop = new THREE.Group();
      root.add(laptop);
      rounded(laptop, 0, 0.79, 0, 0.35, 0.018, 0.24, steel, 0.008);
      rounded(laptop, 0, 0.91, -0.11, 0.35, 0.23, 0.014, dark, 0.008);
      rounded(laptop, 0, 0.91, -0.1, 0.31, 0.19, 0.004, screen, 0.004);
      book(root, -f.w * 0.33, 0.79, 0);
    }
  }
  function television(root: THREE.Group, f: Furnishing) {
    rounded(root, 0, 1.27, -0.055, f.w, 2.52, 0.08, cream, 0.025);
    rounded(root, 0, 0.32, 0.045, f.w, 0.28, 0.3, stone, 0.04);
    rounded(root, 0, 1.45, 0.013, 1.99, 1.14, 0.055, dark, 0.025);
    rounded(root, 0, 1.455, 0.047, 1.93, 1.08, 0.005, screen, 0.01);
    rounded(root, 0, 0.57, 0.14, 0.84, 0.06, 0.06, dark, 0.02);
    vase(root, -f.w * 0.4, 0.48, 0.07);
    lamp(root, f.w * 0.4, 0.48, 0.05);
  }
  function ac(root: THREE.Group, f: Furnishing) {
    rounded(root, 0, 0.01, 0, f.w, 0.29, 0.18, white, 0.035);
    rounded(root, 0, -0.075, 0.098, f.w - 0.12, 0.055, 0.012, dark, 0.008);
    for (let i = 0; i < 3; i++)
      rounded(root, 0, -0.091 + i * 0.015, 0.108, f.w - 0.15, 0.006, 0.022, cream, 0.002);
    orb(root, f.w * 0.35, 0, 0.102, 0.022, 0.012, 0.01, light);
  }
  function plant(root: THREE.Group, f: Furnishing) {
    const h = f.h ?? 1.2;
    const potH = h > 0.9 ? 0.36 : 0.25;
    const pot = cyl(root, 0, potH / 2, 0, f.w * 0.43, potH, taupe, f.w * 0.31);
    cyl(root, 0, potH + 0.006, 0, f.w * 0.38, 0.012, soil);
    const stem = h - potH;
    for (let b = 0; b < 5; b++) {
      const a = b * 2.4,
        tipX = Math.cos(a) * f.w * 0.65,
        tipZ = Math.sin(a) * f.w * 0.65,
        tipY = potH + stem * (0.55 + b * 0.1);
      tube(
        root,
        [
          [0, potH, 0],
          [tipX * 0.3, potH + stem * 0.4, tipZ * 0.3],
          [tipX, tipY, tipZ],
        ],
        0.009,
        oak,
      );
      for (let i = 0; i < 8; i++) {
        const t = i / 7,
          ang = a + i * 2.1;
        const x = tipX * (0.3 + 0.7 * t) + Math.sin(ang) * f.w * 0.15,
          z = tipZ * (0.3 + 0.7 * t) + Math.cos(ang) * f.w * 0.15,
          y = potH + stem * (0.3 + 0.6 * t) + 0.03 * b;
        const leaf = orb(root, x, y, z, f.w * 0.28, 0.022, f.w * 0.13, i % 3 ? green : leafLight);
        leaf.rotation.set(0.3 + Math.sin(ang) * 0.5, ang, Math.cos(ang) * 0.6);
      }
    }
  }
  function mug(root: THREE.Group, x: number, y: number, z: number) {
    cyl(root, x, y + 0.055, z, 0.04, 0.1, ceramic);
    ring(root, x + 0.046, y + 0.055, z, 0.026, 0.006, ceramic);
    cyl(root, x, y + 0.108, z, 0.032, 0.003, taupe);
  }
  function coffeeMachine(root: THREE.Group, x: number, y: number, z: number) {
    rounded(root, x, y + 0.19, z, 0.27, 0.37, 0.3, dark, 0.025);
    rounded(root, x, y + 0.2, z + 0.16, 0.22, 0.27, 0.03, steel, 0.01);
    rounded(root, x, y + 0.08, z + 0.17, 0.2, 0.018, 0.13, dark, 0.004);
    cyl(root, x, y + 0.35, z + 0.172, 0.022, 0.01, steel).rotation.x = Math.PI / 2;
    rounded(root, x, y + 0.24, z + 0.19, 0.07, 0.035, 0.07, dark, 0.007);
    mug(root, x, y + 0.09, z + 0.18);
  }
  function kitchen(root: THREE.Group, f: Furnishing) {
    cabinet(root, f, 0.86);
    const sw = 0.68,
      sx = 0.2,
      d = f.d;
    rounded(
      root,
      0,
      f.variant === "hob" ? 1.23 : 0.967,
      -d / 2 - 0.012,
      f.w,
      f.variant === "hob" ? 0.65 : 0.11,
      0.025,
      stone,
      0.004,
    );
    if (f.variant === "sink") {
      const left = sx - sw / 2 + f.w / 2,
        right = f.w / 2 - sx - sw / 2;
      rounded(root, -f.w / 2 + left / 2, 0.89, 0, left, 0.05, d, stone, 0.006);
      rounded(root, sx + sw / 2 + right / 2, 0.89, 0, right, 0.05, d, stone, 0.006);
      rounded(root, sx, 0.89, -d / 2 + 0.055, sw, 0.05, 0.11, stone, 0.006);
      rounded(root, sx, 0.89, d / 2 - 0.055, sw, 0.05, 0.11, stone, 0.006);
      rounded(root, sx, 0.74, 0, sw - 0.01, 0.03, d - 0.19, steel, 0.035);
      rounded(root, sx - sw / 2 + 0.015, 0.81, 0, 0.027, 0.16, d - 0.19, steel, 0.007);
      rounded(root, sx + sw / 2 - 0.015, 0.81, 0, 0.027, 0.16, d - 0.19, steel, 0.007);
      for (const z of [-d / 2 + 0.11, d / 2 - 0.11])
        rounded(root, sx, 0.81, z, sw, 0.16, 0.025, steel, 0.008);
      faucet(root, sx, 0.915, -d / 2 + 0.07);
      const dishX = -f.w / 2 + 0.33;
      rounded(root, dishX, 0.47, d / 2 + 0.029, 0.55, 0.69, 0.025, white, 0.015);
      rounded(root, dishX, 0.77, d / 2 + 0.048, 0.53, 0.08, 0.018, steel, 0.004);
      rounded(root, dishX, 0.73, d / 2 + 0.073, 0.36, 0.018, 0.022, brass, 0.006);
      for (let i = 0; i < 4; i++)
        orb(root, dishX + 0.08 + i * 0.035, 0.78, d / 2 + 0.062, 0.012, 0.012, 0.005, dark);
      const kettleX = f.w / 2 - 0.3;
      cyl(root, kettleX, 1.02, 0, 0.085, 0.2, white, 0.1);
      cyl(root, kettleX, 1.125, 0, 0.06, 0.018, brass);
      tube(
        root,
        [
          [kettleX + 0.06, 1.1, 0],
          [kettleX + 0.13, 1.07, 0],
          [kettleX + 0.13, 0.98, 0],
          [kettleX + 0.07, 0.97, 0],
        ],
        0.015,
        dark,
      );
    } else {
      rounded(root, 0, 0.89, 0, f.w, 0.05, d, stone, 0.008);
      rounded(root, 0.18, 0.925, 0, 0.66, 0.025, 0.47, dark, 0.012);
      for (const x of [-0.03, 0.39])
        for (const z of [-0.115, 0.115]) {
          ring(root, x, 0.947, z, 0.073, 0.008, dark, true);
          ring(root, x, 0.95, z, 0.052, 0.006, steel, true);
          for (let i = 0; i < 2; i++) {
            const grate = rounded(root, x, 0.959, z, 0.17, 0.016, 0.013, dark, 0.002);
            grate.rotation.y = (i * Math.PI) / 2;
          }
        }
      const ovenX = 0.18;
      rounded(root, ovenX, 0.45, d / 2 + 0.022, 0.56, 0.57, 0.032, steel, 0.014);
      rounded(root, ovenX, 0.43, d / 2 + 0.043, 0.48, 0.39, 0.017, screen, 0.01);
      rounded(root, ovenX, 0.68, d / 2 + 0.06, 0.43, 0.025, 0.033, brass, 0.006);
      for (const x of [ovenX - 0.17, ovenX + 0.17])
        cyl(root, x, 0.69, d / 2 + 0.065, 0.023, 0.02, dark).rotation.x = Math.PI / 2;
      for (const x of [-f.w / 2 + 0.32, f.w / 2 - 0.32]) {
        rounded(root, x, 2.15, -d / 2 + 0.18, 0.58, 1.07, 0.34, cream, 0.015);
        rounded(root, x, 2.15, -d / 2 + 0.357, 0.558, 1.04, 0.025, cream, 0.008);
        rounded(root, x, 1.78, -d / 2 + 0.382, 0.16, 0.012, 0.024, brass, 0.005);
      }
      rounded(root, 0.18, 1.66, -0.06, 0.72, 0.085, 0.47, steel, 0.014);
      rounded(root, 0.18, 2.12, -0.18, 0.33, 0.88, 0.22, cream, 0.015);
      rounded(root, 0.18, 1.61, 0.06, 0.55, 0.014, 0.18, dark, 0.004);
      for (const x of [-0.04, 0.4]) orb(root, x, 1.608, 0.1, 0.025, 0.01, 0.025, light);
      cyl(root, -0.03, 1.027, -0.115, 0.071, 0.13, steel);
      cyl(root, -0.03, 1.102, -0.115, 0.08, 0.015, steel);
      orb(root, -0.03, 1.12, -0.115, 0.036, 0.025, 0.036, dark);
    }
  }
  function fridge(root: THREE.Group, f: Furnishing) {
    rounded(root, 0, 1.04, 0, f.w, 2.08, f.d, cream, 0.035);
    const front = f.d / 2 + 0.015;
    for (const x of [-f.w / 4, f.w / 4]) {
      rounded(root, x, 1.21, front, f.w / 2 - 0.009, 1.61, 0.026, steel, 0.018);
      rounded(root, x < 0 ? -0.032 : 0.032, 1.18, front + 0.026, 0.019, 0.55, 0.028, brass, 0.008);
    }
    rounded(root, 0, 0.21, front, f.w - 0.022, 0.38, 0.027, cream, 0.018);
    rounded(root, 0.14, 1.48, front + 0.017, 0.14, 0.18, 0.012, dark, 0.008);
    for (let i = 0; i < 3; i++)
      rounded(root, 0.14, 1.52 - i * 0.035, front + 0.025, 0.075, 0.006, 0.005, light, 0.002);
  }
  function laundry(root: THREE.Group, f: Furnishing) {
    for (let i = 0; i < 2; i++) {
      const y = i * 0.89;
      rounded(root, 0, y + 0.43, 0, 0.66, 0.86, 0.62, white, 0.023);
      rounded(root, 0, y + 0.68, 0.319, 0.6, 0.17, 0.02, cream, 0.006);
      ring(root, 0, y + 0.36, 0.337, 0.205, 0.018, steel);
      const port = cyl(root, 0, y + 0.36, 0.332, 0.185, 0.025, screen);
      port.rotation.x = Math.PI / 2;
      ring(root, 0, y + 0.36, 0.355, 0.153, 0.008, dark);
      const dial = cyl(root, 0.2, y + 0.705, 0.35, 0.039, 0.025, steel);
      dial.rotation.x = Math.PI / 2;
      rounded(root, -0.12, y + 0.705, 0.339, 0.22, 0.06, 0.01, dark, 0.005);
      for (let n = 0; n < 3; n++)
        rounded(root, -0.15 + n * 0.04, y + 0.71, 0.347, 0.025, 0.008, 0.005, light, 0.002);
    }
    rounded(root, 0, 1.82, 0, 0.66, 0.07, 0.62, cream, 0.008);
    for (let i = 0; i < 3; i++)
      rounded(root, -0.1, 1.87 + i * 0.065, 0.02, 0.38, 0.06, 0.32, linen, 0.025);
  }
  function vanity(root: THREE.Group, f: Furnishing) {
    rounded(root, 0, 0.53, 0, f.w, 0.49, f.d, cream, 0.02);
    for (const y of [0.43, 0.65]) {
      rounded(root, 0, y, f.d / 2 + 0.012, f.w - 0.024, 0.205, 0.025, cream, 0.01);
      rounded(root, 0, y + 0.07, f.d / 2 + 0.032, f.w * 0.45, 0.012, 0.025, brass, 0.006);
    }
    rounded(root, 0, 0.81, 0, f.w + 0.025, 0.045, f.d + 0.02, stone, 0.012);
    bowl(root, 0, 0.83, 0.03, Math.min(0.58, f.w * 0.78), f.d * 0.76, 0.12);
    faucet(root, 0, 0.85, -f.d / 2 + 0.04);
    if (f.room !== "utility") {
      rounded(root, 0, 1.47, -f.d / 2 + 0.035, f.w * 0.83, 0.91, 0.04, brass, 0.1);
      rounded(root, 0, 1.47, -f.d / 2 + 0.063, f.w * 0.78, 0.86, 0.012, mirror, 0.09);
      rounded(root, 0, 1.96, -f.d / 2 + 0.065, f.w * 0.7, 0.025, 0.045, light, 0.01);
      cyl(root, f.w * 0.38, 0.91, 0.03, 0.027, 0.15, taupe);
      rounded(root, f.w * 0.38, 0.998, 0.03, 0.04, 0.015, 0.045, brass, 0.005);
      tube(
        root,
        [
          [-f.w * 0.33, 0.64, f.d / 2 + 0.06],
          [-f.w * 0.33, 0.57, f.d / 2 + 0.09],
          [f.w * 0.33, 0.57, f.d / 2 + 0.09],
          [f.w * 0.33, 0.64, f.d / 2 + 0.06],
        ],
        0.009,
        brass,
      );
      rounded(root, -f.w * 0.22, 0.44, f.d / 2 + 0.105, 0.19, 0.3, 0.022, linen, 0.007);
    }
  }
  function toilet(root: THREE.Group, f: Furnishing) {
    const body = put(
      root,
      new THREE.LatheGeometry(
        [
          [0, 0],
          [0.16, 0],
          [0.18, 0.06],
          [0.17, 0.24],
          [0.22, 0.37],
          [0.235, 0.43],
          [0.2, 0.46],
          [0, 0.46],
        ].map(([r, h]) => new THREE.Vector2(r, h)),
        32,
      ),
      ceramic,
      0,
      0,
      0.06,
    );
    body.scale.set(f.w / 0.47, 1, (f.d / 0.47) * 0.83);
    rounded(root, 0, 0.495, 0.035, f.w, 0.065, f.d * 0.88, white, 0.03);
    rounded(root, 0, 0.51, -f.d * 0.32, f.w * 0.84, 0.26, 0.17, ceramic, 0.065);
    rounded(root, 0, 0.654, -f.d * 0.33, 0.085, 0.012, 0.045, steel, 0.006);
    rounded(root, f.w * 0.47, 0.48, 0.09, 0.018, 0.055, 0.18, steel, 0.008);
  }
  function shower(root: THREE.Group, f: Furnishing) {
    rounded(root, 0, 0.018, 0, f.w, 0.035, f.d, stone, 0.008);
    rounded(root, 0, 0.039, -f.d / 2 + 0.075, f.w * 0.64, 0.005, 0.043, steel, 0.006);
    for (let i = 0; i < 10; i++)
      rounded(
        root,
        -f.w * 0.28 + i * f.w * 0.062,
        0.043,
        -f.d / 2 + 0.075,
        0.013,
        0.002,
        0.03,
        dark,
        0.001,
      );
    const back = -f.d / 2 + 0.07;
    tube(
      root,
      [
        [f.w * 0.2, 1.02, back],
        [f.w * 0.2, 2.12, back],
        [f.w * 0.2, 2.17, back + 0.29],
      ],
      0.012,
      steel,
    );
    const rain = cyl(root, f.w * 0.2, 2.16, back + 0.29, 0.105, 0.024, steel);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      orb(
        root,
        f.w * 0.2 + Math.cos(a) * 0.075,
        2.143,
        back + 0.29 + Math.sin(a) * 0.075,
        0.006,
        0.005,
        0.006,
        dark,
      );
    }
    rounded(root, f.w * 0.2, 1.04, back, 0.24, 0.045, 0.07, steel, 0.016);
    tube(
      root,
      [
        [f.w * 0.2, 1.02, back],
        [f.w * 0.04, 0.55, back + 0.06],
        [-f.w * 0.15, 0.88, back + 0.035],
        [-f.w * 0.15, 1.42, back],
      ],
      0.006,
      steel,
    );
    rounded(root, -f.w * 0.15, 1.49, back, 0.035, 0.17, 0.025, steel, 0.013);
    rounded(root, -f.w * 0.29, 1.12, f.d / 2, f.w * 0.42, 2.18, 0.012, glass, 0.002);
    for (const x of [-f.w / 2, -f.w * 0.08])
      rounded(root, x, 1.12, f.d / 2, 0.014, 2.22, 0.018, brass, 0.003);
    rounded(root, -f.w * 0.29, 2.235, f.d / 2, f.w * 0.42, 0.018, 0.02, brass, 0.003);
    rounded(root, -f.w * 0.3, 1.2, back, 0.2, 0.035, 0.14, stone, 0.006);
    for (let i = 0; i < 2; i++) {
      cyl(root, -f.w * 0.35 + i * 0.09, 1.31, back + 0.025, 0.027, 0.17, i ? cream : taupe);
      rounded(root, -f.w * 0.35 + i * 0.09, 1.407, back + 0.025, 0.027, 0.018, 0.027, brass, 0.004);
    }
  }
  function tub(root: THREE.Group, f: Furnishing) {
    bowl(root, 0, 0.035, 0, f.w, f.d, 0.55);
    cyl(root, f.w * 0.36, 0.57, -f.d * 0.25, 0.02, 0.78, steel);
    tube(
      root,
      [
        [f.w * 0.36, 0.72, -f.d * 0.25],
        [f.w * 0.36, 0.81, -f.d * 0.25],
        [f.w * 0.26, 0.8, -f.d * 0.18],
      ],
      0.012,
      steel,
    );
    rounded(root, -f.w * 0.32, 0.58, 0, 0.18, 0.025, f.d * 0.96, oak, 0.006);
    mug(root, -f.w * 0.32, 0.596, 0);
  }
  function sideboard(root: THREE.Group, f: Furnishing) {
    cabinet(root, f, 0.89);
    rounded(root, 0, 0.918, 0, f.w + 0.03, 0.045, f.d + 0.025, stone, 0.015);
    coffeeMachine(root, f.w * 0.27, 0.945, 0);
    vase(root, -f.w * 0.27, 0.945, 0);
  }
  function entry(root: THREE.Group, f: Furnishing) {
    cabinet(root, { ...f, w: f.w * 0.42 }, 2.7);
    root.children.forEach((o) => (o.position.x -= f.w * 0.29));
    rounded(root, f.w * 0.22, 0.43, 0, f.w * 0.53, 0.12, f.d, linen, 0.045);
    rounded(root, f.w * 0.22, 1.51, -f.d / 2 + 0.03, f.w * 0.48, 1.65, 0.045, mirror, 0.08);
    rounded(root, f.w * 0.22, 0.12, -0.025, f.w * 0.52, 0.24, f.d - 0.07, cream, 0.015);
  }
  for (const f of furnishings) {
    const root = new THREE.Group();
    root.name = f.id;
    root.position.set(f.x, f.y ?? 0, f.z);
    root.rotation.y = f.yaw ?? 0;
    (f.kind === "pendant" ? ceilingFixtures : group).add(root);
    switch (f.kind) {
      case "bed":
        bed(root, f);
        break;
      case "sofa":
        sofa(root, f);
        break;
      case "chair":
        chair(root, f);
        break;
      case "armchair":
        chair(root, f, true);
        break;
      case "coffee":
        table(root, f);
        break;
      case "diningtable":
        table(root, f, true);
        break;
      case "wardrobe":
        cabinet(root, f, 2.7);
        break;
      case "nightstand":
        nightstand(root, f);
        break;
      case "desk":
        desk(root, f);
        break;
      case "tvwall":
        television(root, f);
        break;
      case "ac":
        ac(root, f);
        break;
      case "plant":
        plant(root, f);
        break;
      case "kitchenrun":
        kitchen(root, f);
        break;
      case "fridge":
        fridge(root, f);
        break;
      case "laundry":
        laundry(root, f);
        break;
      case "vanity":
        vanity(root, f);
        break;
      case "toilet":
        toilet(root, f);
        break;
      case "shower":
        shower(root, f);
        break;
      case "tub":
        tub(root, f);
        break;
      case "sideboard":
        sideboard(root, f);
        break;
      case "entrycabinet":
        entry(root, f);
        break;
      case "floorlamp":
        cyl(root, 0, 0.02, 0, 0.16, 0.04, brass);
        cyl(root, 0, 0.76, 0, 0.012, 1.5, brass);
        cyl(root, 0, 1.42, 0, 0.22, 0.26, linen, 0.3);
        cyl(root, 0, 1.283, 0, 0.24, 0.013, light);
        break;
      case "console":
        rounded(root, 0, 0.86, 0, f.w, 0.06, f.d, stone, 0.025);
        for (const x of [-f.w * 0.39, f.w * 0.39])
          rounded(root, x, 0.42, 0, 0.035, 0.84, f.d * 0.65, brass, 0.01);
        vase(root, 0, 0.9, 0);
        rounded(root, 0, 1.48, -f.d / 2, f.w * 0.7, 0.75, 0.035, mirror, 0.09);
        break;
      case "pendant":
        for (const x of [-0.33, 0.33]) {
          cyl(root, x, 0.32, 0, 0.005, 0.64, brass);
          orb(root, x, -0.04, 0, 0.52, 0.25, 0.46, light);
        }
        rounded(root, 0, 0.69, 0, 0.83, 0.025, 0.11, brass, 0.008);
        break;
    }
  }
  // East-facing south-bedroom door, shown open inward along the north side of the room.
  const door = new THREE.Group();
  door.name = "南次卧东向内开门";
  group.add(door);
  rounded(door, 6.755, 1.17, 13.05, 0.85, 2.29, 0.04, cream, 0.012);
  rounded(door, 6.75, 1.17, 13.024, 0.68, 2.1, 0.015, white, 0.01);
  for (const y of [0.36, 1.16, 1.95]) cyl(door, 7.17, y, 13.05, 0.01, 0.09, brass);
  rounded(door, 6.43, 1.03, 13.086, 0.13, 0.022, 0.022, brass, 0.008);
  function curtain(x: number, z: number, width: number, angle: number) {
    const root = new THREE.Group();
    root.position.set(x, 1.43, z);
    root.rotation.y = angle;
    group.add(root);
    const geometry = new THREE.PlaneGeometry(width, 2.79, 28, 16),
      position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const xx = position.getX(i),
        yy = position.getY(i);
      position.setZ(i, Math.sin((xx / width) * Math.PI * 12) * 0.033);
      if (yy < -0.9) position.setY(i, yy + Math.cos(xx * 32) * 0.012);
    }
    geometry.computeVertexNormals();
    const cloth = linen.clone();
    cloth.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geometry, cloth);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
    cyl(root, 0, 1.4, 0, 0.013, width + 0.04, brass).rotation.z = Math.PI / 2;
  }
  for (const z of [5.45, 7.22, 9.57, 12.32]) curtain(2.25, z, 0.44, Math.PI / 2);
  for (const [x, z] of [
    [7.3, 1.61],
    [9.91, 1.61],
    [10.45, 1.61],
    [13.21, 1.61],
    [4.26, 16.49],
    [6.95, 16.49],
    [9.28, 16.49],
    [12.85, 16.49],
  ])
    curtain(x, z, 0.35, 0);
  const towelHooks = [
    [15.07, 4.69, Math.PI / 2],
    [8.86, 16.28, Math.PI / 2],
    [13.22, 16.18, -Math.PI / 2],
  ];
  for (const [x, z, angle] of towelHooks) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    root.rotation.y = angle;
    group.add(root);
    rounded(root, 0, 1.3, 0, 0.4, 0.018, 0.02, brass, 0.006);
    rounded(root, 0, 1.08, 0.025, 0.27, 0.43, 0.024, linen, 0.01);
  }
  return {
    group,
    ceilingFixtures,
    obstacles: [...furnishingObstacles, ...fixtureObstacles] as Rect[],
  };
}
