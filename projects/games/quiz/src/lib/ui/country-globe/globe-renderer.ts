import { orbitalRotationSpeed } from './globe-motion';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Country } from '../../domain/types';
import {
  countryAnchor,
  placeLabels,
  polygons,
  spherePoint,
  unwrapRing,
  type LabelCandidate,
} from './globe-geography';
export interface GlobeRenderer {
  recenter(): void;
  dispose(): void;
}
export function createGlobe(
  host: HTMLElement,
  country: Country,
  countries: readonly Country[],
  onLabels: (labels: readonly LabelCandidate[]) => void,
  onFailure: () => void,
): GlobeRenderer {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'quiz-globe-canvas';
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 20);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.minDistance = 1.35;
  controls.maxDistance = 5.5;
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    controls.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    throw new Error('Canvas unavailable');
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const geometry = new THREE.SphereGeometry(1, 96, 64);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const earth = new THREE.Mesh(geometry, material);
  scene.add(earth);
  const anchor = countryAnchor(country.geometry!);
  const direction = new THREE.Vector3(...spherePoint(anchor));
  const markerGeometry = new THREE.SphereGeometry(0.012, 12, 8);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.position.copy(direction).multiplyScalar(1.012);
  scene.add(marker);
  const locations = countries
    .filter((c) => c.geometry)
    .map((c) => ({
      country: c,
      point: new THREE.Vector3(...spherePoint(countryAnchor(c.geometry!))),
    }));
  let disposed = false,
    frame = 0;
  const color = (token: string, fallback: string) =>
    getComputedStyle(host).getPropertyValue(token).trim() || fallback;
  function paint() {
    if (!ctx) return;
    ctx.fillStyle = color('--quiz-globe-ocean', '#e5edf0');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const c of countries) {
      if (!c.geometry) continue;
      ctx.fillStyle =
        c.iso3 === country.iso3
          ? color('--lp-color-primary', '#b5482f')
          : color('--quiz-globe-land', '#b4c2bc');
      ctx.strokeStyle =
        c.iso3 === country.iso3
          ? color('--lp-color-primary-contrast', '#ffffff')
          : color('--quiz-globe-border', '#526760');
      ctx.lineWidth = c.iso3 === country.iso3 ? 1.7 : 0.6;
      for (const polygon of polygons(c.geometry)) {
        const outer = unwrapRing(polygon[0]);
        const reference = outer[0][0];
        for (const shift of [-360, 0, 360]) {
          ctx.beginPath();
          for (const ring of polygon) {
            const points = unwrapRing(ring);
            const align = 360 * Math.round((reference - points[0][0]) / 360);
            points.forEach(([lon, lat], i) => {
              const x = ((lon + align + shift + 180) / 360) * canvas.width,
                y = ((90 - lat) / 180) * canvas.height;
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            });
            ctx.closePath();
          }
          ctx.fill('evenodd');
          ctx.stroke();
        }
      }
    }
    texture.needsUpdate = true;
    markerMaterial.color.set(color('--lp-color-primary-contrast', '#ffffff'));
    schedule();
  }
  function render() {
    frame = 0;
    if (disposed) return;
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    renderer.render(scene, camera);
    const labels: LabelCandidate[] = [];
    for (const { country: c, point } of locations) {
      if (point.dot(camera.position) <= 1.01) continue;
      const projected = point.clone().project(camera);
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z > 1) continue;
      const width = Math.min(w - 8, c.name.length * 7 + 12);
      labels.push({
        code: c.iso3,
        name: c.name,
        x: ((projected.x + 1) * w) / 2,
        y: ((1 - projected.y) * h) / 2,
        width,
        height: 22,
        priority: c.iso3 === country.iso3 ? 10000 : 0,
      });
    }
    onLabels(placeLabels(labels, w, h));
  }
  function orbitChanged() {
    controls.rotateSpeed = orbitalRotationSpeed(camera.position.distanceTo(controls.target));
    schedule();
  }
  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(render);
  }
  function recenter() {
    camera.position.copy(direction).multiplyScalar(3.6);
    camera.up.set(0, 1, 0);
    controls.target.set(0, 0, 0);
    controls.update();
    schedule();
  }
  function lost(event: Event) {
    event.preventDefault();
    onFailure();
  }
  renderer.domElement.addEventListener('webglcontextlost', lost);
  controls.addEventListener('change', orbitChanged);
  const resize = new ResizeObserver(schedule);
  resize.observe(host);
  const theme = new MutationObserver(paint);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class', 'style'],
  });
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', paint);
  paint();
  recenter();
  return {
    recenter,
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      theme.disconnect();
      media.removeEventListener('change', paint);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      controls.removeEventListener('change', orbitChanged);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
