import assert from "node:assert/strict";
import * as THREE from "three";
import { fittedCameraDistance, LookPointer } from "../lib/navigation.ts";

// Project the entire apartment, 6m terrace and public core into realistic
// phone viewport sizes after the navigation bars and safe areas are removed.
const viewports = [
  [296, 430],
  [351, 540],
  [369, 580],
  [404, 650],
  [716, 270],
  [828, 260],
  [744, 790],
  [1280, 650],
];
let projections = 0;
for (const [width, height] of viewports) {
  for (const mode of ["plan", "overview"]) {
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.05, 500);
    const target = new THREE.Vector3(8.2, 0, 8.9);
    const distance = fittedCameraDistance(mode, camera.aspect, camera.fov);
    if (mode === "plan") camera.position.set(8.2, distance, 8.901);
    else
      camera.position
        .copy(target)
        .add(new THREE.Vector3(19.4, 23, 22.1).normalize().multiplyScalar(distance));
    camera.lookAt(target);
    camera.updateMatrixWorld();
    for (const x of [-0.15, 16.55])
      for (const y of [0, 6.15])
        for (const z of [-0.15, 17.95]) {
          const point = new THREE.Vector3(x, y, z).project(camera);
          assert.ok(
            Math.abs(point.x) < 0.96 && Math.abs(point.y) < 0.96 && Math.abs(point.z) < 1,
            `${mode} ${width}×${height}: corner clipped (${point.toArray()})`,
          );
          projections++;
        }
  }
}

const pointer = new LookPointer();
assert.equal(pointer.begin(7), true);
assert.equal(pointer.begin(12), false, "second finger must not steal the active view");
assert.equal(pointer.owns(7), true);
assert.equal(pointer.owns(12), false);
assert.equal(pointer.end(12), false, "releasing another finger must not stop looking");
assert.equal(pointer.owns(7), true);
assert.equal(pointer.end(7), true);
assert.equal(pointer.begin(12), true);
pointer.reset(); // Switching rooms, opening a modal or backgrounding the page.
assert.equal(pointer.owns(12), false);
assert.equal(pointer.begin(21), true);
assert.equal(pointer.end(12), false, "a stale cancel must not cancel a newer gesture");
assert.equal(pointer.owns(21), true);
assert.equal(pointer.end(21), true);
assert.equal(pointer.end(21), false);
console.log(
  `Mobile navigation passed: ${viewports.length} viewports, ${projections} projected corners, multi-touch ownership/reset.`,
);
