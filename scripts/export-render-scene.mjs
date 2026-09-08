import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = createRequire(
  path.resolve(process.argv[2] ?? path.join(root, "../render-runtime/package.json")),
);
const { createCanvas } = runtime("@napi-rs/canvas");
globalThis.document = { createElement: () => createCanvas(1, 1) };
const source = fs.readFileSync(path.join(root, "lib/scene.ts"), "utf8");
const start = source.indexOf("  const wallMat ="),
  end = source.indexOf("  const lowerFacade =");
if (start < 0 || end < start) throw new Error("Architecture extraction markers have changed");
// Execute the production mesh construction unchanged, before WebGL-only view code.
const contents = `import * as THREE from 'three';
import {rooms,floorRects,walls,coreObstacles} from './lib/plan';import {floorTileCells} from './lib/floor-tiles';
import {buildFurnishings} from './lib/furnishings';import {buildCore} from './lib/core';
import {createTileMaterial} from './lib/atmosphere';import {panoramaPoints} from './lib/panorama-data';
const renderer={capabilities:{getMaxAnisotropy:()=>8}};const scene=new THREE.Scene();
${source.slice(start, end)}
floors.name='architecture-floors';wallGroup.name='architecture-walls';ceilingGroup.name='architecture-ceilings';
export {scene,panoramaPoints,rooms};`;
const result = await build({
  stdin: { contents, resolveDir: root, loader: "ts" },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { scene, panoramaPoints, rooms } = await import(
  "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
);
const output = path.resolve(root, "../render-data");
fs.mkdirSync(output, { recursive: true });
const geometries = {},
  materials = {},
  textures = {},
  objects = [];
function saveTexture(texture) {
  if (!texture?.image?.toBuffer) return null;
  const id = texture.source.uuid;
  if (!textures[id]) {
    const file = `texture-${Object.keys(textures).length}.png`;
    fs.writeFileSync(path.join(output, file), texture.image.toBuffer("image/png"));
    textures[id] = file;
  }
  return { file: textures[id], repeat: texture.repeat.toArray(), offset: texture.offset.toArray() };
}
function material(m) {
  if (materials[m.uuid]) return m.uuid;
  materials[m.uuid] = {
    name: m.name,
    color: m.color?.toArray(),
    roughness: m.roughness ?? 0.6,
    metalness: m.metalness ?? 0,
    opacity: m.opacity,
    glass: m.transparent && m.opacity < 0.5,
    emissive: m.emissive?.toArray(),
    emissiveIntensity: m.emissiveIntensity ?? 0,
    clearcoat: m.clearcoat ?? 0,
    sheen: m.sheen ?? 0,
    map: saveTexture(m.map),
    bumpMap: saveTexture(m.bumpMap),
    bumpScale: m.bumpScale ?? 0,
  };
  return m.uuid;
}
scene.updateMatrixWorld(true);
scene.traverse((mesh) => {
  if (!mesh.isMesh) return;
  const g = mesh.geometry;
  if (!geometries[g.uuid])
    geometries[g.uuid] = {
      type: g.type,
      position: Array.from(g.attributes.position.array),
      normal: g.attributes.normal ? Array.from(g.attributes.normal.array) : null,
      uv: g.attributes.uv ? Array.from(g.attributes.uv.array) : null,
      index: g.index ? Array.from(g.index.array) : null,
    };
  const names = [];
  let parent = mesh;
  while (parent) {
    if (parent.name) names.unshift(parent.name);
    parent = parent.parent;
  }
  objects.push({
    name: names.join("/") || "detail",
    geometry: g.uuid,
    material: material(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material),
    matrix: mesh.matrixWorld.toArray(),
  });
});
const fingerprint = createHash("sha256");
for (const f of [
  "scene.ts",
  "plan.ts",
  "furnishings.ts",
  "furniture-layout.ts",
  "core.ts",
  "panorama-data.ts",
  "floor-tiles.ts",
])
  fingerprint.update(fs.readFileSync(path.join(root, "lib", f)));
fingerprint.update(fs.readFileSync(path.join(root, "scripts/render-panoramas.py")));
fingerprint.update(fs.readFileSync(path.join(root, "render-assets/cream-stone-base.png")));
fs.writeFileSync(
  path.join(output, "scene.json"),
  JSON.stringify({
    geometries,
    materials,
    objects,
    points: panoramaPoints,
    rooms,
    sourceHash: fingerprint.digest("hex"),
  }),
);
console.log(
  `Exported ${objects.length} model meshes, ${Object.keys(geometries).length} geometries and ${panoramaPoints.length} cameras to ${output}`,
);
