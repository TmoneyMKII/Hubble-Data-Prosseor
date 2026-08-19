"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createCelestialBodies } from "@/components/scene/celestialBodies";
import { createSkybox } from "@/components/scene/skybox";
import { createTelescopeRig, loadTelescopeModel, pointingFor } from "@/components/scene/telescopeRig";
import type { SearchMode } from "@/lib/types";

type HubbleSceneProps = {
  target: string;
  mode: SearchMode;
};

/** Orbiting Hubble viewport, built once on mount and torn down on unmount. */
export function HubbleScene({ target, mode }: HubbleSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointingRef = useRef({ target, mode });

  // The animation loop reads the live target from this ref, so retyping a query
  // steers the telescope without tearing down and rebuilding the whole scene.
  useEffect(() => {
    pointingRef.current = { target, mode };
  }, [target, mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0f1a18");

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(4.6, 2.9, 5.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 3.5;
    controls.maxDistance = 9;
    controls.target.set(0, 0, 0);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    scene.add(new THREE.HemisphereLight(0xc5ddd3, 0x16201e, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffe1bd, 3);
    keyLight.position.set(4, 5, 3);
    scene.add(keyLight);
    scene.add(createSkybox());

    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (url: string) => {
      const texture = textureLoader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const bodies = createCelestialBodies(loadTexture);
    scene.add(bodies.group);

    const rig = createTelescopeRig();
    scene.add(rig.orbit);

    let disposed = false;
    const dracoLoader = loadTelescopeModel(rig.telescope, () => disposed);

    let frameId = 0;
    let lastTime = performance.now();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const { target: activeTarget, mode: activeMode } = pointingRef.current;
      rig.targetMarker.visible = Boolean(activeTarget.trim());

      const { ra, dec } = pointingFor(activeTarget, activeMode);
      rig.telescope.rotation.y = THREE.MathUtils.damp(rig.telescope.rotation.y, THREE.MathUtils.degToRad(ra), 3.2, delta);
      rig.telescope.rotation.z = THREE.MathUtils.damp(rig.telescope.rotation.z, THREE.MathUtils.degToRad(-dec), 3.2, delta);
      rig.telescope.rotation.x = THREE.MathUtils.damp(rig.telescope.rotation.x, Math.sin(now * 0.00035) * 0.035, 1.5, delta);

      bodies.sun.rotation.y += delta * 0.035;
      bodies.earth.rotation.y += delta * 0.22;
      bodies.earthClouds.rotation.y += delta * 0.27;
      bodies.moonOrbit.rotation.y += delta * 0.18;
      rig.orbit.rotation.y += delta * 0.1;

      controls.update(delta);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      dracoLoader.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
    };
  }, []);

  const trimmed = target.trim();

  return (
    <div className="scene">
      <canvas ref={canvasRef} />
      <div className="scene__readout">
        <span className="kicker">Pointing vector</span>
        <strong>{trimmed || "Awaiting target"}</strong>
        <small>{mode === "coordinates" ? "RA / DEC reference" : "Resolved target reference"}</small>
      </div>
      <span className="scene__crosshair" aria-hidden="true">+</span>
      <span className="scene__hint">Drag to orbit</span>
    </div>
  );
}
