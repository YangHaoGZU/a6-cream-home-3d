import assert from "node:assert/strict";
import { build } from "esbuild";
import * as THREE from "three";
import fs from "node:fs/promises";
import sharp from "sharp";
const result = await build({
  stdin: {
    contents:
      "export * from './lib/panorama-data';export * from './lib/plan';export * from './lib/floor-tiles';export * from './lib/furniture-layout';export * from './lib/panorama-fov';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const {
  panoramaPoints,
  panoramaUrl,
  hotspotDirection,
  rooms,
  walls,
  floorRects,
  contains,
  floorTileCells,
  coreObstacles,
  furnishingObstacles,
  fixtureObstacles,
  panoramaDefaultFov,
  panoramaFovBounds,
} = await import(
  "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
);
assert.equal(new Set(panoramaPoints.map((p) => p.id)).size, panoramaPoints.length);
const manifest = JSON.parse(await fs.readFile("public/panoramas/manifest.json", "utf8"));
assert.equal(manifest.length, panoramaPoints.length, "panorama manifest count");
for (const p of panoramaPoints) {
  const item = manifest.find((m) => m.id === p.id);
  assert.ok(item, p.id + " missing asset metadata");
  assert.ok(panoramaUrl(p.id).endsWith("?v=" + item.revision), p.id + " cache revision mismatch");
  for (const preview of [false, true]) {
    const filename = `public/panoramas/${p.id}${preview ? "-preview" : ""}.jpg`;
    const info = await sharp(filename).metadata();
    assert.equal(info.format, "jpeg", p.id + " invalid JPEG");
    assert.equal(info.width, preview ? 768 : item.width);
    assert.equal(info.height, preview ? 384 : item.height);
    assert.equal(info.width, info.height * 2, p.id + " invalid projection ratio");
    assert.equal((await fs.stat(filename)).size, preview ? item.previewBytes : item.bytes);
  }
}
for (const r of rooms)
  assert.ok(
    panoramaPoints.some((p) => p.room === r.id),
    r.id + " missing panorama",
  );
const renderReport = JSON.parse(await fs.readFile('lib/generated/render-report.json','utf8'));
for (const p of panoramaPoints) {
  assert.ok(
    floorRects.some((r) => contains(r, ...p.position)),
    p.id + " outside floor",
  );
  const rendered = renderReport.find(r=>r.id===p.id);
  assert.ok(rendered && rendered.nearSurfaceCheck==='pass',p.id+' Blender surface check');
  assert.deepEqual(p.position,rendered.position,p.id+' camera/model mismatch');
  assert.equal(p.textureYaw ?? 0,rendered.textureYaw ?? 0,p.id+' texture heading mismatch');
  assert.ok(p.links.length > 0, p.id + " isolated");
  for (const id of p.links)
    assert.ok(id !== p.id && panoramaPoints.some((q) => q.id === id), p.id + " invalid link " + id);
  const seen = new Set([p.id]),
    queue = [p.id];
  for (const id of queue)
    for (const next of panoramaPoints.find((q) => q.id === id).links)
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  assert.equal(seen.size, panoramaPoints.length, p.id + " cannot reach all viewpoints");
}
// Verify the viewer UV convention; this cannot certify the contents of AI images.
const sphere = new THREE.SphereGeometry(10, 64, 40);
sphere.scale(-1, 1, 1);
sphere.rotateY(-Math.PI / 2);
const mesh = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial());
mesh.updateMatrixWorld();
for (const [direction, u] of [
  [new THREE.Vector3(0, 0, -1), 0.5],
  [new THREE.Vector3(1, 0, 0), 0.75],
  [new THREE.Vector3(-1, 0, 0), 0.25],
]) {
  const hit = new THREE.Raycaster(new THREE.Vector3(), direction).intersectObject(mesh)[0];
  assert.ok(hit, "no inward sphere hit");
  assert.ok(Math.abs(hit.uv.x - u) < 1e-6, "panorama compass/mapping mismatch");
}
const north = hotspotDirection({ position: [0, 0] }, { position: [0, -1] });
mesh.rotation.y = Math.PI;
mesh.updateMatrixWorld();
const southCenter = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0,0,1)).intersectObject(mesh)[0];
assert.ok(Math.abs(southCenter.uv.x - .5)<1e-6, 'Rotated panorama must keep global south aligned');
assert.equal(Math.abs(north.yaw), 0);
const east = hotspotDirection({ position: [0, 0] }, { position: [1, 0] });
assert.ok(Math.abs(east.yaw + Math.PI / 2) < 1e-8);
for (const aspect of [.45, .75, 1, 16/9, 2.7]) {
  const vertical = panoramaDefaultFov(aspect);
  const horizontal = 2 * Math.atan(Math.tan(vertical * Math.PI / 360) * aspect) * 180 / Math.PI;
  const [minimum, maximum] = panoramaFovBounds(aspect);
  assert.ok(vertical <= 75 && horizontal <= 90.000001, 'Default panorama view is excessively wide');
  assert.ok(minimum < vertical && maximum > vertical, 'Zoom must work in both directions');
}
console.log('PASS: '+panoramaPoints.length+' panorama assets, Blender cameras, links and sphere UV/FOV.');
