import { WebGLRenderer, type PerspectiveCamera } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
/** Shared mobile policy. View-specific geometry and accessibility belong to callers. */
export function createGlobeRenderer(host: HTMLElement, options: { alpha: boolean }): WebGLRenderer {
  const renderer = new WebGLRenderer({
    alpha: options.alpha,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  host.prepend(renderer.domElement);
  return renderer;
}
export function createGlobeControls(
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  options: { minDistance: number; maxDistance: number; wheelZoom?: boolean },
): OrbitControls {
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.enableZoom = options.wheelZoom ?? true;
  controls.minDistance = options.minDistance;
  controls.maxDistance = options.maxDistance;
  return controls;
}
const released = new WeakSet<WebGLRenderer>();
export function disposeGlobeRenderer(renderer: WebGLRenderer): void {
  if (released.has(renderer)) return;
  released.add(renderer);
  renderer.dispose();
  if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
  renderer.domElement.remove();
}
/** On-demand frames only: no autorotation, no idle RAF, no work in hidden surfaces. */
export function createGlobeFrameLoop(
  host: HTMLElement,
  draw: () => void,
): { invalidate: () => void; dispose: () => void } {
  let disposed = false,
    visible = true,
    frame = 0;
  const render = () => {
    frame = 0;
    if (!disposed && visible && !document.hidden) draw();
  };
  const invalidate = () => {
    if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
  };
  const resize = new ResizeObserver(invalidate);
  resize.observe(host);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) invalidate();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  intersection.observe(host);
  document.addEventListener('visibilitychange', invalidate);
  return {
    invalidate,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', invalidate);
    },
  };
}
