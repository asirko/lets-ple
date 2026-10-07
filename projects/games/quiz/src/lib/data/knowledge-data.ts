export interface KnowledgeCountry {
  iso3: string;
  name: string;
  continent: string;
  anchor: readonly [number, number];
}
export interface CountryMesh {
  iso3: string;
  positions: Float32Array;
  indices: Uint16Array;
  outlines: Float32Array;
}
export interface KnowledgeMap {
  version: 1;
  countries: readonly CountryMesh[];
}
async function json(file: string, signal: AbortSignal): Promise<unknown> {
  const r = await fetch('content/geography/knowledge/' + file, { signal });
  if (!r.ok) throw new Error('Knowledge data unavailable');
  return r.json();
}
export async function loadKnowledgeCountries(
  signal: AbortSignal,
): Promise<readonly KnowledgeCountry[]> {
  const v = await json('countries.json', signal);
  if (
    !Array.isArray(v) ||
    v.length !== 195 ||
    v.some(
      (c) =>
        !c ||
        !/^([A-Z]{3})$/.test(c.iso3) ||
        typeof c.name !== 'string' ||
        typeof c.continent !== 'string' ||
        !Array.isArray(c.anchor) ||
        c.anchor.length !== 2 ||
        !c.anchor.every(Number.isFinite),
    ) ||
    new Set(v.map((c) => c.iso3)).size !== 195
  )
    throw new Error('Invalid knowledge catalog');
  return v;
}
export async function loadCorpusVersion(signal: AbortSignal): Promise<string> {
  const v = (await json('manifest.json', signal)) as { corpusVersion?: unknown };
  if (typeof v?.corpusVersion !== 'string' || !/^[a-f0-9]{64}$/.test(v.corpusVersion))
    throw new Error('Invalid corpus version');
  return v.corpusVersion;
}
function shorts(s: string, signed: boolean): number[] {
  if (typeof s !== 'string' || s.length > 2000000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s))
    throw new Error('Invalid mesh buffer');
  const b = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  if (b.length % 2) throw new Error('Invalid buffer');
  const d = new DataView(b.buffer);
  return Array.from({ length: b.length / 2 }, (_, i) =>
    signed ? d.getInt16(i * 2, true) / 32767 : d.getUint16(i * 2, true),
  );
}
export async function loadKnowledgeMap(signal: AbortSignal): Promise<KnowledgeMap> {
  const value = (await json('map.json', signal)) as {
    version?: number;
    countries?: { iso3: string; positions: string; indices: string; outlines: string }[];
  };
  if (value?.version !== 1 || !Array.isArray(value.countries) || value.countries.length !== 195)
    throw new Error('Invalid mesh');
  let vertices = 0;
  const countries = value.countries.map((c) => {
    const positions = new Float32Array(shorts(c.positions, true)),
      indices = new Uint16Array(shorts(c.indices, false)),
      outlines = new Float32Array(shorts(c.outlines, true));
    vertices += positions.length / 3;
    if (
      !/^[A-Z]{3}$/.test(c.iso3) ||
      positions.length % 3 ||
      indices.length % 3 ||
      outlines.length % 6 ||
      indices.some((i) => i >= positions.length / 3)
    )
      throw new Error('Invalid mesh indices');
    return { iso3: c.iso3, positions, indices, outlines };
  });
  if (vertices > 50000) throw new Error('Mesh budget exceeded');
  return { version: 1, countries };
}
