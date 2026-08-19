import * as THREE from "three";

/**
 * The Sun, Earth and Moon are painted as an unlit backdrop: they sit behind the
 * telescope with depth testing off, so the rig always reads clearly on top.
 */
export type CelestialBodies = {
  group: THREE.Group;
  sun: THREE.Mesh;
  earth: THREE.Mesh;
  earthClouds: THREE.Mesh;
  moonOrbit: THREE.Group;
};

const backdropMaterial = (map: THREE.Texture, extra: THREE.MeshBasicMaterialParameters = {}) =>
  new THREE.MeshBasicMaterial({ map, depthTest: false, depthWrite: false, ...extra });

export function createCelestialBodies(loadTexture: (url: string) => THREE.Texture): CelestialBodies {
  const group = new THREE.Group();

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 48, 32),
    backdropMaterial(loadTexture("/textures/2k_sun.jpg")),
  );
  sun.renderOrder = -1;
  sun.position.set(-2.75, 0.85, -3.65);
  group.add(sun);

  const sunLight = new THREE.PointLight(0xffd4a0, 4.2, 9);
  sunLight.position.copy(sun.position);
  group.add(sunLight);

  const earthSystem = new THREE.Group();
  earthSystem.position.set(-2.25, -0.25, -4.5);
  group.add(earthSystem);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 64, 48),
    backdropMaterial(loadTexture("/textures/2k_earth_daymap.jpg")),
  );
  earth.renderOrder = -1;
  earthSystem.add(earth);

  const earthClouds = new THREE.Mesh(
    new THREE.SphereGeometry(0.472, 64, 48),
    backdropMaterial(loadTexture("/textures/2k_earth_clouds.jpg"), { transparent: true, opacity: 0.42 }),
  );
  earthClouds.renderOrder = -1;
  earthSystem.add(earthClouds);

  const moonOrbit = new THREE.Group();
  moonOrbit.rotation.z = THREE.MathUtils.degToRad(12);
  earthSystem.add(moonOrbit);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 40, 28),
    backdropMaterial(loadTexture("/textures/2k_moon.jpg")),
  );
  moon.renderOrder = -1;
  moon.position.set(0.78, 0.16, 0);
  moonOrbit.add(moon);

  return { group, sun, earth, earthClouds, moonOrbit };
}
