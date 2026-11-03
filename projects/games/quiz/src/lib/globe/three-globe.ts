import {
  Scene,
  PerspectiveCamera,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  BufferGeometry,
  BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Raycaster,
  Vector2,
  Vector3,
  Spherical,
  DoubleSide,
  Color,
} from 'three';
import {
  createGlobeRenderer,
  createGlobeControls,
  disposeGlobeRenderer,
  createGlobeFrameLoop,
} from './three-runtime';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { KnowledgeMap } from '../data/knowledge-data';
import {
  GLOBE_COLORS,
  type GlobeHandle,
  type GlobeLabel,
  type GlobePlace,
  type GlobeView,
} from './globe-port';
import { projectGlobeLabels } from './globe-labels';
import type { LabelCandidate } from './globe-geography';
import { isTap } from './globe-interactions';
import { orbitalRotationSpeed } from './globe-motion';
const MIN_DISTANCE = 1.35,
  MAX_DISTANCE = 6,
  // Framing bounds: close enough to read a microstate, far enough to keep some context.
  FIT_MIN = 1.5,
  FIT_MAX = 3.6,
  // Share of the half field of view the country should cover once framed.
  FIT_FILL = 0.6,
  // Angular jump (radians, ~5°) separating the mainland from detached territories.
  OVERSEAS_GAP = 0.09;
const WHITE = new Color(0xffffff);
function anchorPoint([lon, lat]: readonly [number, number]): Vector3 {
  const l = (lon * Math.PI) / 180,
    b = (lat * Math.PI) / 180;
  return new Vector3(Math.cos(b) * Math.sin(l), Math.sin(b), Math.cos(b) * Math.cos(l));
}
/**
 * Camera distance at which the country fits in the view. The angular radius stops at the
 * first wide gap from the anchor, so overseas parts (French Guiana for France) don't zoom out,
 * and skips the farthest tenth of what remains, so thin island chains (Ryukyu) don't either.
 */
function framingDistance(
  center: Vector3,
  outline: Float32Array | undefined,
  camera: PerspectiveCamera,
): number {
  const angles: number[] = [],
    p = new Vector3();
  for (let i = 0; outline && i < outline.length; i += 3) {
    p.set(outline[i], outline[i + 1], outline[i + 2]).normalize();
    angles.push(Math.acos(Math.max(-1, Math.min(1, p.dot(center)))));
  }
  angles.sort((a, b) => a - b);
  const gap = angles.findIndex((a, i) => i > 0 && a - angles[i - 1] > OVERSEAS_GAP),
    mainland = gap > 0 ? angles.slice(0, gap) : angles;
  const radius = mainland[Math.floor((mainland.length - 1) * 0.9)] ?? 0;
  const halfFov = (camera.fov * Math.PI) / 360,
    halfView = Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect));
  const distance = Math.cos(radius) + Math.sin(radius) / Math.tan(halfView * FIT_FILL);
  return Math.max(FIT_MIN, Math.min(FIT_MAX, distance));
}
export function createGlobe(
  host: HTMLElement,
  map: KnowledgeMap,
  places: readonly GlobePlace[],
  options: {
    onSelect: (iso3: string) => void;
    onLabels: (labels: readonly LabelCandidate[]) => void;
    onUnavailable: () => void;
    label: string;
  },
): GlobeHandle {
  const renderer = createGlobeRenderer(host, { alpha: false });
  renderer.setClearColor(0x122237);
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', options.label);
  canvas.tabIndex = 0;
  const scene = new Scene(),
    camera = new PerspectiveCamera(40, 1, 0.05, 20);
  camera.position.set(0, 2, 3.3);
  camera.lookAt(0, 0, 0);
  // Always interactive, touch included: OrbitControls owns every gesture on the canvas.
  const controls = createGlobeControls(camera, canvas, {
    minDistance: MIN_DISTANCE,
    maxDistance: MAX_DISTANCE,
  });
  const sphereGeometry = new SphereGeometry(0.997, 48, 32),
    seaMaterial = new MeshBasicMaterial({ color: 0x193550 }),
    sea = new Mesh(sphereGeometry, seaMaterial);
  scene.add(sea);
  const meshes = new Map<string, Mesh>();
  const resources: BufferGeometry[] = [];
  const materials: MeshBasicMaterial[] = [];
  const borderMaterial = new LineBasicMaterial({
    color: 0x213448,
    transparent: true,
    opacity: 0.55,
  });
  for (const m of map.countries) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(m.positions, 3));
    geometry.setIndex(new BufferAttribute(m.indices, 1));
    const material = new MeshBasicMaterial({ color: GLOBE_COLORS.none, side: DoubleSide });
    materials.push(material);
    resources.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.userData['iso3'] = m.iso3;
    scene.add(mesh);
    meshes.set(m.iso3, mesh);
    const outline = new BufferGeometry();
    outline.setAttribute(
      'position',
      new BufferAttribute(
        m.outlines.map((v) => v * 1.001),
        3,
      ),
    );
    resources.push(outline);
    scene.add(new LineSegments(outline, borderMaterial));
  }
  // Thick outline of the selected country; plain lines are always 1px in WebGL.
  const selectionGeometry = new LineSegmentsGeometry(),
    selectionMaterial = new LineMaterial({ linewidth: 3, worldUnits: false }),
    selection = new LineSegments2(selectionGeometry, selectionMaterial);
  selection.visible = false;
  scene.add(selection);
  const outlines = new Map(map.countries.map((m) => [m.iso3, m.outlines]));
  let disposed = false;
  const resize = () => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    selectionMaterial.resolution.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const toLocations = (labels: readonly GlobeLabel[]) =>
    labels.map((l) => ({ code: l.code, name: l.name, point: anchorPoint(l.anchor) }));
  const countryLocations = toLocations(places.map((p) => ({ ...p, code: p.iso3 })));
  let locations = countryLocations;
  let view: GlobeView = { tones: new Map(), dimmed: new Set(), selected: null, labels: null };
  const frames = createGlobeFrameLoop(host, () => {
    resize();
    renderer.render(scene, camera);
    options.onLabels(
      projectGlobeLabels(locations, camera, host.clientWidth, host.clientHeight, view.selected),
    );
  });
  const invalidate = frames.invalidate;
  const orbitChanged = () => {
    controls.rotateSpeed = orbitalRotationSpeed(camera.position.length());
    invalidate();
  };
  controls.addEventListener('change', orbitChanged);
  const ray = new Raycaster(),
    pointer = new Vector2();
  let start: readonly [number, number] | null = null;
  const down = (e: PointerEvent) => {
    start = [e.clientX, e.clientY];
  };
  const up = (e: PointerEvent) => {
    if (!start || !isTap(start, [e.clientX, e.clientY])) {
      start = null;
      return;
    }
    start = null;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects([sea, ...meshes.values()], false)[0];
    const code = hit?.object.userData['iso3'];
    if (typeof code === 'string') options.onSelect(code);
  };
  const cancel = () => {
    start = null;
  };
  const loss = (e: Event) => {
    e.preventDefault();
    frames.dispose();
    options.onUnavailable();
  };
  canvas.addEventListener('pointerdown', down, true);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('webglcontextlost', loss);
  const rotate = (h: number, v: number) => {
    const s = new Spherical().setFromVector3(camera.position);
    s.theta += h;
    s.phi = Math.max(0.1, Math.min(Math.PI - 0.1, s.phi + v));
    camera.position.setFromSpherical(s);
    camera.lookAt(0, 0, 0);
    controls.update();
  };
  const zoom = (delta: number) => {
    camera.position.setLength(
      Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, camera.position.length() * Math.exp(delta))),
    );
    controls.update();
  };
  const key = (e: KeyboardEvent) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => rotate(-0.15, 0),
      ArrowRight: () => rotate(0.15, 0),
      ArrowUp: () => rotate(0, -0.15),
      ArrowDown: () => rotate(0, 0.15),
      '+': () => zoom(-0.15),
      '-': () => zoom(0.15),
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  };
  canvas.addEventListener('keydown', key);
  const primary = () =>
    getComputedStyle(host).getPropertyValue('--lp-color-primary').trim() || '#b5482f';
  let outlined: string | null = null;
  const paint = () => {
    for (const [code, mesh] of meshes) {
      const tone = view.tones.get(code) ?? 'none',
        material = mesh.material as MeshBasicMaterial;
      if (tone === 'highlight') material.color.set(primary());
      else material.color.setHex(GLOBE_COLORS[tone]);
      material.opacity = view.dimmed.has(code) ? 0.25 : 1;
      material.transparent = material.opacity < 1;
      material.onBeforeCompile = (shader) => {
        if (tone === 'insufficient')
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            '#include <color_fragment>\nif(mod((gl_FragCoord.x+gl_FragCoord.y)/6.0,2.0)>1.0) diffuseColor.rgb*=0.48;',
          );
      };
      material.customProgramCacheKey = () => (tone === 'insufficient' ? 'striped' : 'plain');
      material.needsUpdate = true;
    }
    const shape = view.selected ? outlines.get(view.selected) : undefined;
    selection.visible = !!shape;
    if (shape && outlined !== view.selected) {
      selectionGeometry.setPositions(shape.map((v) => v * 1.002));
      selection.computeLineDistances();
      outlined = view.selected;
    }
    // Lighter than the fill so the edge still reads on a highlighted country.
    selectionMaterial.color.set(primary()).lerp(WHITE, 0.45);
    invalidate();
  };
  // The highlight follows the theme's primary color.
  const theme = new MutationObserver(paint);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class', 'style'],
  });
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', paint);
  resize();
  orbitChanged();
  return {
    update(next) {
      if (next.labels !== view.labels)
        locations = next.labels ? toLocations(next.labels) : countryLocations;
      view = next;
      paint();
    },
    centerOn(iso3, { zoom = false } = {}) {
      const place = places.find((p) => p.iso3 === iso3);
      if (!place) return;
      const center = anchorPoint(place.anchor);
      const distance = zoom
        ? framingDistance(center, outlines.get(iso3), camera)
        : Math.max(2.2, Math.min(FIT_MAX, camera.position.length()));
      camera.position.copy(center).setLength(distance);
      camera.up.set(0, 1, 0);
      controls.target.set(0, 0, 0);
      controls.update();
      orbitChanged();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      frames.dispose();
      theme.disconnect();
      media.removeEventListener('change', paint);
      controls.removeEventListener('change', orbitChanged);
      controls.dispose();
      canvas.removeEventListener('pointerdown', down, true);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('webglcontextlost', loss);
      canvas.removeEventListener('keydown', key);
      for (const g of resources) g.dispose();
      for (const m of materials) m.dispose();
      sphereGeometry.dispose();
      seaMaterial.dispose();
      borderMaterial.dispose();
      selectionGeometry.dispose();
      selectionMaterial.dispose();
      disposeGlobeRenderer(renderer);
    },
  };
}
