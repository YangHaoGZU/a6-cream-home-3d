import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { floorRects } from "./plan";

export const RESIDENCE = { floor: 20, elevation: 57, panorama: "./city-panorama.png" } as const;

// Keep architectural coordinates at finished floor = 0. Only the exterior moves down.
export function buildLowerFacade() {
  const group = new THREE.Group();
  group.name = "20层以下楼体";
  group.userData.excludeFromAO = true;
  const geometry = new THREE.BoxGeometry();
  const plaster = new THREE.MeshStandardMaterial({ color: "#c7c3b9", roughness: 0.85 });
  const stone = new THREE.MeshStandardMaterial({ color: "#d7d2c6", roughness: 0.72 });
  const glazing = new THREE.MeshStandardMaterial({
    color: "#7d9197",
    metalness: 0.35,
    roughness: 0.22,
  });
  const batches = new Map<THREE.Material, THREE.Matrix4[]>();
  const add = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
  ) => {
    const transforms = batches.get(material) ?? [];
    transforms.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion(),
        new THREE.Vector3(w, h, d),
      ),
    );
    batches.set(material, transforms);
  };
  for (const [x, z, x2, z2] of floorRects) {
    add(
      (x + x2) / 2,
      -(RESIDENCE.elevation + 0.25) / 2,
      (z + z2) / 2,
      x2 - x,
      RESIDENCE.elevation - 0.25,
      z2 - z,
      plaster,
    );
  }
  // Recessed facade bands provide a true downward depth cue from the balconies.
  for (let floor = 1; floor < RESIDENCE.floor; floor++) {
    const y = -floor * 3;
    add(-0.018, y + 1.38, 11.4, 0.025, 1.95, 12.8, glazing);
    add(-0.045, y + 0.15, 11.4, 0.12, 0.24, 12.8, stone);
    add(2, y + 1.38, 17.817, 4, 1.95, 0.025, glazing);
    add(2, y + 0.15, 17.85, 4, 0.24, 0.12, stone);
    for (let z = 5; z < 17.9; z += 1.6) add(-0.038, y + 1.38, z, 0.08, 2.5, 0.16, stone);
    for (let x = 0; x <= 4; x += 1) add(x, y + 1.38, 17.837, 0.12, 2.5, 0.06, stone);
  }
  for (const [material, transforms] of batches) {
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    transforms.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

// Glass must not behave like an opaque wall in the normal/depth pass.
export class InteriorAO extends GTAOPass {
  private hiddenObjects: THREE.Object3D[] = [];
  _overrideVisibility() {
    this.scene.traverse((object) => {
      const transparent =
        object instanceof THREE.Mesh &&
        (Array.isArray(object.material) ? object.material : [object.material]).some(
          (m) => m.transparent,
        );
      if (
        object.visible &&
        (transparent ||
          object instanceof THREE.Line ||
          object instanceof THREE.Sprite ||
          object.userData.excludeFromAO)
      ) {
        object.visible = false;
        this.hiddenObjects.push(object);
      }
    });
  }
  _restoreVisibility() {
    for (const object of this.hiddenObjects) object.visible = true;
    this.hiddenObjects.length = 0;
  }
  dispose() {
    this._restoreVisibility();
    // These two materials are not released by the current upstream dispose method.
    this.gtaoMaterial.dispose();
    this.blendMaterial.dispose();
    super.dispose();
  }
}

export function buildPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  const render = new RenderPass(scene, camera),
    ao = new InteriorAO(scene, camera, 1, 1),
    output = new OutputPass();
  ao.updateGtaoMaterial({
    radius: 0.38,
    thickness: 0.35,
    distanceExponent: 1.5,
    distanceFallOff: 0.8,
    samples: 12,
  });
  ao.updatePdMaterial({ radius: 5, samples: 8 });
  ao.blendIntensity = 0.52;
  composer.addPass(render);
  composer.addPass(ao);
  composer.addPass(output);
  return {
    setWalk(walk: boolean) {
      ao.enabled = walk;
    },
    resize(width: number, height: number) {
      // The AO pass runs below display resolution; the color pass retains antialiasing.
      composer.setSize(width, height);
      ao.setSize(Math.max(1, Math.floor(width * 0.8)), Math.max(1, Math.floor(height * 0.8)));
    },
    render() {
      composer.render();
    },
    dispose() {
      render.dispose();
      ao.dispose();
      output.dispose();
      composer.dispose();
    },
  };
}

const tileSources = new Map<
  boolean,
  [THREE.CanvasTexture, THREE.CanvasTexture, THREE.CanvasTexture]
>();

export function createTileMaterial(w: number, d: number, anisotropy: number, outdoor = false) {
  const source = tileSources.get(outdoor) ?? buildTileSources(outdoor);
  const texture = (index: number) => {
    const t = source[index].clone();
    t.repeat.set(w / 1.2, d / 0.6);
    t.anisotropy = anisotropy;
    return t;
  };
  return new THREE.MeshPhysicalMaterial({
    map: texture(0),
    bumpMap: texture(1),
    bumpScale: 0.0012,
    roughnessMap: texture(2),
    roughness: outdoor ? 0.95 : 0.48,
    metalness: 0,
    clearcoat: outdoor ? 0 : 0.25,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.65,
  });
}

function buildTileSources(outdoor: boolean) {
  const size = 512,
    color = document.createElement("canvas"),
    relief = document.createElement("canvas"),
    rough = document.createElement("canvas");
  for (const c of [color, relief, rough]) c.width = c.height = size;
  const c = color.getContext("2d")!,
    b = relief.getContext("2d")!,
    r = rough.getContext("2d")!;
  c.fillStyle = outdoor ? "#d8cdbb" : "#e8dfcf";
  c.fillRect(0, 0, size, size);
  b.fillStyle = "#c0c0c0";
  b.fillRect(0, 0, size, size);
  r.fillStyle = outdoor ? "#dbdbdb" : "#aaaaaa";
  r.fillRect(0, 0, size, size);
  let seed = 4827;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 16000; i++) {
    const x = random() * size,
      y = random() * size;
    c.fillStyle = i % 2 ? "rgba(155,139,112,.04)" : "rgba(255,255,246,.1)";
    c.fillRect(x, y, random() * 4 + 1, 2);
    r.fillStyle = i % 2 ? "#adadad" : "#a7a7a7";
    r.fillRect(x, y, 2, 2);
  }
  // Very faint irregular mineral veins, not a repeated wood-grain pattern.
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(-20, random() * size);
    for (let x = 0; x <= size; x += 64) c.lineTo(x, random() * 70 + i * 85);
    c.strokeStyle = "rgba(158,144,117,.07)";
    c.lineWidth = 1 + random() * 2;
    c.stroke();
  }
  c.fillStyle = "#bdb6a9";
  c.fillRect(0, 0, size, 1.7);
  c.fillRect(0, 0, 1.7, size);
  b.fillStyle = "#444444";
  b.fillRect(0, 0, size, 1.7);
  b.fillRect(0, 0, 1.7, size);
  r.fillStyle = "#eeeeee";
  r.fillRect(0, 0, size, 2);
  r.fillRect(0, 0, 2, size);
  const texture = (canvas: HTMLCanvasElement, srgb = false) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const sources: [THREE.CanvasTexture, THREE.CanvasTexture, THREE.CanvasTexture] = [
    texture(color, true),
    texture(relief),
    texture(rough),
  ];
  tileSources.set(outdoor, sources);
  return sources;
}
