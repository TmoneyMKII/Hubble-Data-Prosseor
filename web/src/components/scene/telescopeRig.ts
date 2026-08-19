import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { SearchMode } from "@/lib/types";

const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
const ORBIT_RADIUS = 0.22;
const MODEL_SIZE = 1.55;

export type TelescopeRig = {
  orbit: THREE.Group;
  telescope: THREE.Group;
  targetMarker: THREE.Mesh;
};

/** Orbit ring plus the telescope group the GLB model is parented to. */
export function createTelescopeRig(): TelescopeRig {
  const orbit = new THREE.Group();
  orbit.rotation.z = THREE.MathUtils.degToRad(8);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(ORBIT_RADIUS - 0.006, ORBIT_RADIUS + 0.006, 96),
    new THREE.MeshBasicMaterial({
      color: 0x789a9a,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.renderOrder = -1;
  orbit.add(ring);

  const telescope = new THREE.Group();
  telescope.position.set(ORBIT_RADIUS, 0, 0);
  orbit.add(telescope);

  const targetMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xe06b45 }),
  );
  targetMarker.position.set(0, 0.95, 0);
  telescope.add(targetMarker);

  return { orbit, telescope, targetMarker };
}

/**
 * Loads `HST_3D.glb`, recentres it on its own bounding box and scales it to a
 * fixed size so any future model swap keeps the same framing.
 */
export function loadTelescopeModel(telescope: THREE.Group, isDisposed: () => boolean) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  loader.load("/3d/HST_3D.glb", (gltf) => {
    if (isDisposed()) return;

    const model = gltf.scene;
    const wrapper = new THREE.Group();
    wrapper.add(model);
    wrapper.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(wrapper);
    const size = bounds.getSize(new THREE.Vector3());
    model.position.sub(bounds.getCenter(new THREE.Vector3()));
    wrapper.scale.setScalar(MODEL_SIZE / Math.max(size.x, size.y, size.z));
    wrapper.updateMatrixWorld(true);

    const normalized = new THREE.Box3().setFromObject(wrapper);
    wrapper.position.sub(normalized.getCenter(new THREE.Vector3()));

    telescope.add(wrapper);
  });

  return dracoLoader;
}

/**
 * Turns whatever is in the search box into a pointing vector. Coordinate mode
 * reads `RA, DEC` directly; object mode derives a stable pseudo-pointing from
 * the name so the same target always aims the same way.
 */
export function pointingFor(target: string, mode: SearchMode) {
  const [first, second] = target.split(",").map((value) => Number(value.trim()));
  const seed = [...target].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const useCoordinates = mode === "coordinates";
  return {
    ra: useCoordinates && Number.isFinite(first) ? first : seed % 360,
    dec: useCoordinates && Number.isFinite(second) ? second : (seed % 120) - 60,
  };
}
