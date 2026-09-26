import type { Country, Geometry } from '../domain/types';

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}
function geometry(value: unknown): value is Geometry {
  if (!record(value)) return false;
  const coordinates = value['coordinates'];
  const ring = (v: unknown) =>
    Array.isArray(v) &&
    v.length >= 4 &&
    v.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite));
  const polygon = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every(ring);
  return value['type'] === 'Polygon'
    ? polygon(coordinates)
    : value['type'] === 'MultiPolygon' &&
        Array.isArray(coordinates) &&
        coordinates.length > 0 &&
        coordinates.every(polygon);
}

export function parseGeography(value: unknown): readonly Country[] {
  if (!Array.isArray(value) || value.length < 10) throw new Error('Incomplete geography corpus');
  const valid = value.every(
    (c: unknown) =>
      record(c) &&
      typeof c['iso3'] === 'string' &&
      /^[A-Z]{3}$/.test(c['iso3']) &&
      typeof c['iso2'] === 'string' &&
      /^[A-Z]{2}$/.test(c['iso2']) &&
      typeof c['name'] === 'string' &&
      c['name'].length > 0 &&
      strings(c['aliases']) &&
      strings(c['capitals']) &&
      strings(c['borders']) &&
      typeof c['continent'] === 'string' &&
      typeof c['subregion'] === 'string' &&
      typeof c['flagEligible'] === 'boolean' &&
      typeof c['capitalEligible'] === 'boolean' &&
      typeof c['flag'] === 'string' &&
      /^content\/geography\/flags\/[a-f0-9]{20}\.svg$/.test(c['flag']) &&
      record(c['capitalAliases']) &&
      Object.values(c['capitalAliases']).every(strings) &&
      (c['geometry'] === undefined || geometry(c['geometry'])),
  );
  if (!valid) throw new Error('Invalid geography corpus');
  const countries = value as Country[];
  const codes = new Set(countries.map((c) => c.iso3));
  if (
    codes.size !== countries.length ||
    countries.some((c) => c.borders.some((code) => !codes.has(code)))
  )
    throw new Error('Invalid country references');
  return countries;
}

export async function loadGeography(signal: AbortSignal): Promise<readonly Country[]> {
  const response = await fetch('content/geography/countries.json', { signal });
  if (!response.ok) throw new Error('Geography unavailable');
  return parseGeography(await response.json());
}
