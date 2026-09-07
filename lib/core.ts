import * as THREE from "three";

export function buildCore() {
  const group = new THREE.Group(),
    ceiling = new THREE.Group();
  group.name = "电梯、步梯与公共走廊";
  ceiling.name = "公共区域顶面";
  const surfaces: THREE.Mesh[] = [];
  const materials = {
    cream: new THREE.MeshStandardMaterial({ color: "#eae2d3", roughness: 0.75 }),
    stone: new THREE.MeshStandardMaterial({ color: "#d5cfbf", roughness: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: "#9daba9", metalness: 0.8, roughness: 0.3 }),
    brass: new THREE.MeshStandardMaterial({ color: "#a38f6b", metalness: 0.65, roughness: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: "#242e2e", roughness: 0.38 }),
    glow: new THREE.MeshStandardMaterial({
      color: "#fff3d1",
      emissive: "#ffe2af",
      emissiveIntensity: 1.1,
    }),
    white: new THREE.MeshStandardMaterial({ color: "#fcf8ee", roughness: 0.85 }),
  };
  const geo = new THREE.BoxGeometry();
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    parent: THREE.Group = group,
  ) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.castShadow = mat !== materials.glow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function rail(a: [number, number, number], b: [number, number, number]) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      direction = to.clone().sub(from);
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.023, 0.023, direction.length(), 12),
      materials.steel,
    );
    m.position.copy(from.add(to).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    m.castShadow = true;
    group.add(m);
  }
  function sign(text: string, x: number, y: number, z: number, w: number, h: number, angle = 0) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#273230";
    c.fillRect(0, 0, 512, 128);
    c.fillStyle = "#f8e8bd";
    c.font = "500 58px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 256, 66);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = angle;
    group.add(mesh);
  }
  // Door shown open into the apartment; clear 1.3m entrance connects both sides.
  box(7.95, 1.17, 10.325, 1.18, 2.31, 0.055, materials.cream);
  box(7.95, 1.18, 10.361, 1.02, 2.12, 0.016, materials.white);
  box(7.47, 1.04, 10.39, 0.16, 0.028, 0.032, materials.brass);
  for (const y of [0.35, 1.15, 1.95]) rail([8.53, y - 0.035, 10.325], [8.53, y + 0.035, 10.325]);
  sign("A6 · 20F", 8.715, 2.55, 9.65, 0.72, 0.18, Math.PI / 2);

  // Recessed lift car and open telescopic landing doors.
  box(9.72, 0.022, 7.85, 1.96, 0.04, 1.98, materials.stone);
  box(9.72, 1.24, 6.755, 2.05, 2.48, 0.035, materials.steel);
  box(8.72, 1.24, 7.78, 0.035, 2.48, 2.05, materials.steel);
  box(10.735, 1.24, 7.78, 0.035, 2.48, 2.05, materials.steel);
  box(9.72, 2.53, 7.8, 2.03, 0.06, 2.12, materials.white, ceiling);
  box(9.72, 2.494, 7.8, 1.5, 0.013, 1.42, materials.glow, ceiling);
  for (const x of [8.96, 10.34]) box(x, 1.2, 9.055, 0.065, 2.4, 0.055, materials.steel);
  box(9.65, 2.39, 9.055, 1.445, 0.1, 0.055, materials.steel);
  for (const x of [8.82, 10.48]) box(x, 1.16, 8.955, 0.24, 2.28, 0.045, materials.steel);
  box(9.65, 0.013, 9.005, 1.4, 0.024, 0.2, materials.steel);
  for (const z of [8.96, 9.02, 9.08]) box(9.65, 0.028, z, 1.32, 0.006, 0.007, materials.dark);
  rail([8.77, 0.91, 7.09], [8.77, 0.91, 8.62]);
  rail([8.86, 0.91, 6.79], [10.61, 0.91, 6.79]);
  box(10.705, 1.22, 8.02, 0.03, 0.96, 0.27, materials.dark);
  for (let i = 0; i < 8; i++) {
    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.027, 0.027, 0.014, 16),
      i === 6 ? materials.glow : materials.steel,
    );
    button.rotation.z = Math.PI / 2;
    button.position.set(10.68, 0.9 + Math.floor(i / 2) * 0.125, 7.96 + (i % 2) * 0.115);
    group.add(button);
  }
  sign("20  ↑", 9.65, 2.61, 9.061, 0.5, 0.16);
  sign("20", 10.671, 1.58, 8.02, 0.2, 0.12, -Math.PI / 2);
  box(10.58, 1.28, 9.065, 0.105, 0.31, 0.035, materials.dark);
  for (const y of [1.22, 1.34]) box(10.58, y, 9.088, 0.03, 0.03, 0.008, materials.glow);

  // Three equipment cupboards face the corridor; the far end is a full wall.
  for (const [index, label] of ["水井", "风井", "电井"].entries()) {
    const x = 12.56 + index * 1.5;
    box(x, 1.47, 9.84, 1.46, 2.94, 0.72, materials.cream);
    box(x, 1.38, 10.218, 1.32, 2.63, 0.026, materials.stone);
    box(x + 0.51, 1.2, 10.247, 0.017, 0.19, 0.026, materials.steel);
    for (let i = 0; i < 5; i++) box(x, 0.33 + i * 0.055, 10.24, 1.0, 0.018, 0.014, materials.dark);
    sign(label, x, 2.43, 10.242, 0.36, 0.14);
  }
  sign("20F", 16.29, 1.85, 10.9, 0.6, 0.2, -Math.PI / 2);

  // Nine 166.7mm risers per flight, 261mm treads; second flight returns west.
  const run = 2.35 / 9,
    rise = 1.5 / 9;
  for (let i = 0; i < 9; i++) {
    const x = 12.8 + (i + 0.5) * run,
      up = (i + 1) * rise,
      back = 3 - i * rise;
    surfaces.push(box(x, up / 2, 8.715, run, up, 1.07, materials.stone));
    surfaces.push(box(x, back - 0.09, 7.275, run, 0.18, 1.01, materials.stone));
    box(12.8 + i * run + 0.018, up + 0.003, 8.715, 0.035, 0.007, 1.04, materials.brass);
    box(12.8 + (i + 1) * run - 0.018, back + 0.003, 7.275, 0.035, 0.007, 0.98, materials.brass);
    const xx = 12.8 + (i + 0.5) * run;
    rail([xx, up, 8.145], [xx, up + 0.95, 8.145]);
    rail([xx, back, 7.81], [xx, back + 0.95, 7.81]);
  }
  surfaces.push(box(15.71, 1.41, 8.01, 1.12, 0.18, 2.48, materials.stone));
  surfaces.push(box(12.355, 2.91, 7.275, 0.89, 0.18, 1.01, materials.stone));
  rail([12.8, 1.02, 8.145], [15.15, 2.52, 8.145]);
  rail([12.8, 3.95, 7.81], [15.15, 2.45, 7.81]);
  rail([12.8, 1.02, 9.28], [15.15, 2.52, 9.28]);
  rail([12.8, 3.95, 6.735], [15.15, 2.45, 6.735]);
  rail([11.94, 3.96, 7.81], [12.78, 3.96, 7.81]);
  for (const x of [11.94, 12.36, 12.78]) rail([x, 3, 7.81], [x, 3.96, 7.81]);
  sign("20F · 步梯", 11.7, 2.55, 8.65, 0.9, 0.19, -Math.PI / 2);
  sign("21F", 11.9, 4.5, 7.24, 0.5, 0.18, Math.PI / 2);
  box(14.1, 6.06, 8, 4.6, 0.12, 2.8, materials.white, ceiling);
  for (const x of [12.35, 15.65]) box(x, 5.99, 8, 0.5, 0.02, 0.15, materials.glow, ceiling);
  return { group, ceiling, surfaces };
}
