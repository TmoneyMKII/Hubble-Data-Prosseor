"use client";

import dynamic from "next/dynamic";

/**
 * Three.js, the GLB and the planet textures are the heaviest thing on the page
 * and only the observatory view needs them, so the scene is code-split out of
 * the initial bundle and never server-rendered.
 */
export const LazyHubbleScene = dynamic(
  () => import("@/components/scene/HubbleScene").then((module) => module.HubbleScene),
  {
    ssr: false,
    loading: () => (
      <div className="scene scene--loading">
        <span className="scene__hint">Loading observatory…</span>
      </div>
    ),
  },
);
