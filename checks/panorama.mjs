import assert from "node:assert/strict";
import { build } from "esbuild";
import * as THREE from "three";
const result = await build({
  stdin: {
    contents:
      "export * from './lib/panorama-data';export * from './lib/plan';export * from './lib/floor-tiles';export * from './lib/furniture-layout';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const {
  panoramaPoints,
  hotspotDirection,
  rooms,
  walls,
  floorRects,
  contains,
  floorTileCells,
  coreObstacles,
  furnishingObstacles,
  fixtureObstacles,
} = await import(
  "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
);
assert.equal(new Set(panoramaPoints.map((p) => p.id)).size, panoramaPoints.length);
for (const r of rooms)
  assert.ok(
    panoramaPoints.some((p) => p.room === r.id),
    r.id + " missing panorama",
  );
const obstacles = [...coreObstacles, ...furnishingObstacles, ...fixtureObstacles];
for (const w of walls) {
  const vertical = w.a[0] === w.b[0],
    length = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  let last = 0;
  const add = (s, e) => {
    if (e <= s) return;
    const t = (w.thickness ?? (w.external ? 0.2 : 0.12)) / 2;
    obstacles.push(
      vertical
        ? [w.a[0] - t, w.a[1] + s, w.a[0] + t, w.a[1] + e]
        : [w.a[0] + s, w.a[1] - t, w.a[0] + e, w.a[1] + t],
    );
  };
  for (const o of w.openings ?? []) {
    add(last, o.a);
    if (o.kind === "window") add(o.a, o.b);
    last = o.b;
  }
  add(last, length);
}
for (const p of panoramaPoints) {
  assert.ok(
    floorRects.some((r) => contains(r, ...p.position)),
    p.id + " outside floor",
  );
  assert.ok(
    !obstacles.some(
      (r) =>
        p.position[0] > r[0] - 0.16 &&
        p.position[0] < r[2] + 0.16 &&
        p.position[1] > r[1] - 0.16 &&
        p.position[1] < r[3] + 0.16,
    ),
    p.id + " intersects model",
  );
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
// Verify the displayed sphere's UV direction against Cycles' north-centred projection.
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
assert.equal(Math.abs(north.yaw), 0);
const east = hotspotDirection({ position: [0, 0] }, { position: [1, 0] });
assert.ok(Math.abs(east.yaw + Math.PI / 2) < 1e-8);
const cells = floorTileCells(),
  area = (r) => (r[2] - r[0]) * (r[3] - r[1]);
for (let i = 0; i < cells.length; i++)
  for (let j = i + 1; j < cells.length; j++) {
    const a = cells[i].rect,
      b = cells[j].rect;
    assert.ok(
      a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1],
      "coplanar floor overlap",
    );
  }
assert.ok(
  Math.abs(
    cells.reduce((n, c) => n + area(c.rect), 0) -
      (floorRects.reduce((n, r) => n + area(r), 0) - 2.56),
  ) < 1e-7,
  "floor union area changed",
);
console.log(
  `PASS: ${panoramaPoints.length} unobstructed cameras, ${rooms.length} spaces, all points reachable, compass/UV alignment, ${cells.length} non-overlapping floor cells.`,
);
