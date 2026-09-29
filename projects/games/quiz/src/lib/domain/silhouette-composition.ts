import type { Country, Geometry, Position } from './types';
import { correctedSilhouette } from './silhouette';

const approved = new Set(['MUS', 'NOR', 'PLW', 'NLD', 'TUV', 'TON', 'SYC', 'NZL']);
type CompositionCountry = Pick<Country, 'iso3' | 'geometry'>;
export function approvedComposition(country: CompositionCountry): ReviewComposition | null {
  return approved.has(country.iso3) ? reviewComposition(country) : null;
}

type Polygon = readonly (readonly Position[])[];
type Zone = { polygons: Polygon[]; indices: number[]; lon: number; lat: number };
export interface ReviewBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  path: string;
  viewBox?: string;
  indices: number[];
}
export interface ReviewComposition {
  kind: 'compact' | 'main';
  viewBox: string;
  boxes: ReviewBox[];
}

// Positions de revue pour les polygones du corpus épinglé, dans leur ordre source.
// Le nord reste en haut ; les espaces océaniques sont volontairement comprimés.
const compact: Record<string, readonly (readonly [number, number])[]> = {
  MUS: [
    [150, 210],
    [0, 0],
    [430, 185],
  ],
  TUV: [
    [360, 480],
    [240, 360],
    [120, 240],
    [0, 120],
    [170, 90],
    [0, 0],
    [470, 720],
    [430, 600],
    [330, 240],
  ],
  TON: [
    [350, 120],
    [350, 500],
    [175, 480],
    [350, 360],
    [175, 300],
    [350, 240],
    [525, 240],
    [175, 0],
    [0, 540],
    [175, 120],
  ],
};
const mainBounds: Record<string, readonly [number, number, number, number]> = {
  NOR: [0, 35, 57, 72],
  NZL: [165, 185, -53, -28],
  PLW: [133.8, 135, 6.7, 8.3],
  NLD: [0, 10, 49, 55],
  SYC: [55, 56.1, -4.9, -4.1],
};

function box(
  zone: Zone,
  label: string,
  x: number,
  y: number,
  width: number,
  height: number,
): ReviewBox {
  const geometry: Geometry = { type: 'MultiPolygon', coordinates: zone.polygons };
  return {
    x,
    y,
    width,
    height,
    label,
    indices: zone.indices,
    path: correctedSilhouette(geometry).path,
  };
}
function merge(zones: Zone[]): Zone {
  return {
    polygons: zones.flatMap((z) => z.polygons),
    indices: zones.flatMap((z) => z.indices),
    lon: zones.reduce((s, z) => s + z.lon, 0) / zones.length,
    lat: zones.reduce((s, z) => s + z.lat, 0) / zones.length,
  };
}

/** Composition complète ; seules les versions approuvées sont servies par approvedComposition. */
export function reviewComposition(country: CompositionCountry): ReviewComposition | null {
  if (!country.geometry || (!compact[country.iso3] && !mainBounds[country.iso3])) return null;
  const polygons =
    country.geometry.type === 'Polygon'
      ? [country.geometry.coordinates]
      : country.geometry.coordinates;
  const zones: Zone[] = polygons.map((polygon, index) => {
    const xs = polygon[0].map((p) => p[0]);
    const ys = polygon[0].map((p) => p[1]);
    return {
      polygons: [polygon],
      indices: [index + 1],
      lon: (Math.min(...xs) + Math.max(...xs)) / 2,
      lat: (Math.min(...ys) + Math.max(...ys)) / 2,
    };
  });
  const positions = compact[country.iso3];
  if (positions) {
    if (positions.length !== zones.length)
      throw new Error(`Composition à revoir : ${country.iso3}`);
    return {
      kind: 'compact',
      viewBox: `0 0 ${country.iso3 === 'TON' ? 700 : 640} ${Math.max(...positions.map((p) => p[1])) + 125}`,
      boxes: zones.map((zone, i) =>
        box(zone, `Zone ${i + 1}`, positions[i][0], positions[i][1], 165, 115),
      ),
    };
  }
  const [west, east, south, north] = mainBounds[country.iso3];
  const isMain = (z: Zone) => {
    // La fenêtre néo-zélandaise franchit l'antéméridien : les îles à l'est
    // de 180° appartiennent aussi à l'ensemble principal élargi.
    const lon = country.iso3 === 'NZL' && z.lon < 0 ? z.lon + 360 : z.lon;
    return lon >= west && lon <= east && z.lat >= south && z.lat <= north;
  };
  const primary = zones.filter(isMain);
  if (!primary.length) throw new Error(`Zone principale absente : ${country.iso3}`);
  const remaining = zones.filter((z) => !isMain(z));
  const groups: Zone[][] = [];
  // Le Svalbard reste un ensemble ; les autres îlots proches sont regroupés.
  for (const zone of remaining) {
    const group = groups.find((g) =>
      g.some(
        (other) =>
          (country.iso3 === 'NOR' && zone.lat > 73 && other.lat > 73) ||
          Math.hypot(zone.lon - other.lon, zone.lat - other.lat) < 1,
      ),
    );
    if (group) group.push(zone);
    else groups.push([zone]);
  }
  groups.sort((a, b) => merge(b).lat - merge(a).lat);
  if (country.iso3 === 'NZL' || country.iso3 === 'SYC') {
    const center = box(merge(primary), 'Zone principale', 185, 150, 430, 440);
    {
      // Ajuste le cadre aux contours, sans étirer ni couper les îles du groupe principal.
      const points = [...center.path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)];
      const xs = points.map((p) => +p[1]);
      const ys = points.map((p) => +p[2]);
      center.viewBox = `${Math.min(...xs) - 8} ${Math.min(...ys) - 8} ${Math.max(...xs) - Math.min(...xs) + 16} ${Math.max(...ys) - Math.min(...ys) + 16}`;
    }
    if (country.iso3 === 'SYC') {
      Object.assign(center, { x: 0, y: 0, width: 530, height: 560 });
      const boxes = groups.map((group, i) => {
        const right = i < 4;
        return box(
          merge(group),
          `Encadré ${i + 1}`,
          right ? 545 : ((i - 4) % 3) * 270,
          right ? i * 145 : 590 + Math.floor((i - 4) / 3) * 145,
          250,
          135,
        );
      });
      return {
        kind: 'main',
        viewBox: `0 0 800 ${Math.max(735, ...boxes.map((b) => b.y + b.height + 10))}`,
        boxes: [center, ...boxes],
      };
    }
    if (country.iso3 === 'NZL' && groups.length === 2) {
      Object.assign(center, { x: 0, y: 0, width: 430, height: 560 });
      return {
        kind: 'main',
        viewBox: '0 0 630 570',
        boxes: [
          center,
          ...groups.map((group, i) =>
            box(merge(group), `Encadré ${i + 1}`, 445, 140 + i * 145, 175, 130),
          ),
        ],
      };
    }
    // Couronne de boîtes autour du cadre central, sans chevauchement.
    const fallbackSlots = [
      [200, 0],
      [400, 0],
      [0, 150],
      [625, 150],
      [0, 310],
      [625, 310],
      [0, 470],
      [625, 470],
      [0, 630],
      [200, 630],
      [400, 630],
      [625, 630],
    ];
    const slots =
      groups.length === 7 || groups.length === 8
        ? [
            ...(groups.length === 7
              ? [[310, 0]]
              : [
                  [200, 0],
                  [400, 0],
                ]),
            [0, 180],
            [625, 180],
            [0, 400],
            [625, 400],
            [200, 630],
            [425, 630],
          ]
        : fallbackSlots;
    if (groups.length > slots.length) throw new Error(`Trop d'encadrés : ${country.iso3}`);
    // Répartit les groupes du nord au sud sur toute la couronne.
    const boxes = groups.map((group, i) => {
      const index =
        groups.length === 1 ? 0 : Math.round((i * (slots.length - 1)) / (groups.length - 1));
      const [x, y] = slots[index];
      return box(merge(group), `Encadré ${i + 1}`, x, y, 175, 130);
    });
    return { kind: 'main', viewBox: '0 0 800 770', boxes: [center, ...boxes] };
  }
  const height = Math.max(520, groups.length * 145);
  return {
    kind: 'main',
    viewBox: `0 0 800 ${height}`,
    boxes: [
      box(merge(primary), 'Zone principale', 0, 0, 530, 520),
      ...groups.map((group, i) => box(merge(group), `Encadré ${i + 1}`, 545, i * 145, 250, 135)),
    ],
  };
}
