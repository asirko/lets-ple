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
} from 'three';
import {
  createGlobeRenderer,
  createGlobeControls,
  disposeGlobeRenderer,
  createGlobeFrameLoop,
} from './three-runtime';
import type { KnowledgeMap, KnowledgeCountry } from '../data/knowledge-data';
import type { KnowledgeLevel } from '../domain/knowledge-stats/knowledge-level';
import { GLOBE_COLORS, type GlobeHandle } from './globe-port';
import { isTap } from './globe-interactions';
export function createGlobe(
  host: HTMLElement,
  map: KnowledgeMap,
  countries: readonly KnowledgeCountry[],
  options: {
    onSelect: (iso3: string) => void;
    onUnavailable: () => void;
    reducedMotion: boolean;
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
    camera = new PerspectiveCamera(40, 1, 0.1, 20);
  camera.position.set(0, 2, 3.3);
  camera.lookAt(0, 0, 0);
  const controls = createGlobeControls(camera, canvas, {
    minDistance: 1.7,
    maxDistance: 6,
    wheelZoom: false,
  });
  canvas.style.touchAction = 'pan-y';
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
  const markerGeometry = new SphereGeometry(0.017, 12, 8),
    markerMaterial = new MeshBasicMaterial({ color: 0xffffff }),
    marker = new Mesh(markerGeometry, markerMaterial);
  marker.visible = false;
  scene.add(marker);
  let disposed = false,
    engaged = false;
  const resize = () => {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const frames = createGlobeFrameLoop(host, () => {
    resize();
    renderer.render(scene, camera);
  });
  const invalidate = frames.invalidate;
  controls.addEventListener('change', invalidate);
  const ray = new Raycaster(),
    pointer = new Vector2();
  let start: readonly [number, number] | null = null;
  const down = (e: PointerEvent) => {
    start = [e.clientX, e.clientY];
    controls.enabled = e.pointerType === 'mouse' || engaged;
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
    invalidate();
  };
  const zoom = (delta: number) => {
    const length = Math.max(1.7, Math.min(6, camera.position.length() * Math.exp(delta)));
    camera.position.setLength(length);
    controls.update();
    invalidate();
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
  resize();
  invalidate();
  return {
    update(levels, selectedIso3, continent) {
      for (const [code, mesh] of meshes) {
        const level = levels.get(code) ?? 'none',
          material = mesh.material as MeshBasicMaterial;
        material.color.setHex(GLOBE_COLORS[level]);
        const country = countries.find((c) => c.iso3 === code);
        material.opacity = continent && country?.continent !== continent ? 0.25 : 1;
        material.transparent = material.opacity < 1;
        material.onBeforeCompile = (shader) => {
          if (level === 'insufficient')
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <color_fragment>',
              '#include <color_fragment>\nif(mod((gl_FragCoord.x+gl_FragCoord.y)/6.0,2.0)>1.0) diffuseColor.rgb*=0.48;',
            );
        };
        material.customProgramCacheKey = () => (level === 'insufficient' ? 'striped' : 'plain');
        material.needsUpdate = true;
      }
      const country = countries.find((c) => c.iso3 === selectedIso3);
      marker.visible = !!country;
      if (country) {
        const lon = (country.anchor[0] * Math.PI) / 180,
          lat = (country.anchor[1] * Math.PI) / 180;
        marker.position
          .set(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon))
          .multiplyScalar(1.025);
        camera.position.copy(marker.position).setLength(Math.max(2.2, camera.position.length()));
        camera.lookAt(0, 0, 0);
        controls.update();
      }
      invalidate();
    },
    rotate,
    zoom,
    reset() {
      camera.position.set(0, 2, 3.3);
      controls.target.set(0, 0, 0);
      controls.update();
      invalidate();
    },
    setEngaged(value) {
      engaged = value;
      controls.enableZoom = value;
      controls.enabled = true;
      canvas.style.touchAction = value ? 'none' : 'pan-y';
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      frames.dispose();
      controls.removeEventListener('change', invalidate);
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
      markerGeometry.dispose();
      markerMaterial.dispose();
      disposeGlobeRenderer(renderer);
    },
  };
}
