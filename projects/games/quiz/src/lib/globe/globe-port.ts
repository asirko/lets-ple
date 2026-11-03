import type { KnowledgeLevel } from '../domain/knowledge-stats/knowledge-level';
/** A country the globe can name and center on; anchor is [longitude, latitude] in degrees. */
export interface GlobePlace {
  iso3: string;
  name: string;
  anchor: readonly [number, number];
}
/**
 * Fill of a country: a knowledge level, `land` for a plain country (`--lp-globe-land`) or
 * `highlight` for the searched one (`--lp-globe-highlight`).
 */
export type GlobeTone = KnowledgeLevel | 'land' | 'highlight';
/** A name drawn on the globe; `code` is a country ISO3 or the key of a group of countries. */
export interface GlobeLabel {
  code: string;
  name: string;
  anchor: readonly [number, number];
}
export interface GlobeView {
  tones: ReadonlyMap<string, GlobeTone>;
  dimmed: ReadonlySet<string>;
  selected: string | null;
  /** Names to draw instead of the countries' own, e.g. one per continent. */
  labels: readonly GlobeLabel[] | null;
}
/** `zoom` frames the whole country instead of keeping the current distance. */
export interface CenterOptions {
  zoom?: boolean;
}
export interface GlobeHandle {
  update(view: GlobeView): void;
  centerOn(iso3: string, options?: CenterOptions): void;
  dispose(): void;
}
