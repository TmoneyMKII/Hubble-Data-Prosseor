import * as THREE from "three";

const VERTEX_SHADER = /* glsl */ `
  varying vec3 skyDirection;
  void main() {
    skyDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 skyDirection;

  float hash(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 direction = normalize(skyDirection);
    float horizon = smoothstep(-0.7, 0.8, direction.y);
    vec3 color = mix(vec3(0.015, 0.03, 0.055), vec3(0.035, 0.075, 0.105), horizon);

    float galacticBand = exp(-pow(abs(direction.y + direction.x * 0.12) * 5.0, 2.0));
    color += vec3(0.025, 0.045, 0.06) * galacticBand;

    vec2 grid = vec2(atan(direction.z, direction.x) / 6.28318 + 0.5, asin(direction.y) / 3.14159 + 0.5) * vec2(420.0, 210.0);
    vec2 cell = floor(grid);
    vec2 local = fract(grid) - 0.5;
    float brightness = hash(cell);
    float star = smoothstep(0.06, 0.0, length(local)) * step(0.994, brightness);
    color += vec3(0.62, 0.78, 0.86) * star * (0.5 + brightness * 1.4);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Procedural deep-space backdrop: gradient, galactic band and point stars. */
export function createSkybox() {
  const skybox = new THREE.Mesh(
    new THREE.SphereGeometry(40, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    }),
  );
  skybox.renderOrder = -2;
  return skybox;
}
