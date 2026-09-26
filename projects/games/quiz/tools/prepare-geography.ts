/** Explicit, pinned preparation step; never called by a game or normal build. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Country, Geometry } from '../src/lib/domain/types';

const sources = {
  countries:
    'https://raw.githubusercontent.com/mledoze/countries/c8015eebdd94c533358406b0d709f441389e1f2e/countries.json',
  geometry:
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson',
  flags:
    'https://raw.githubusercontent.com/lipis/flag-icons/086f7e97d657358203916dbe84f61c2bccaa81eb',
};
const out = resolve('content/geography');
const cache = resolve('tmp/geography-sources');
async function download(url: string, path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    /* populate cache below */
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const text = await response.text();
  await writeFile(path, text);
  return text;
}
interface SourceCountry {
  cca2: string;
  cca3: string;
  unMember: boolean;
  name: { common: string };
  translations: { fra: { common: string } };
  capital: string[];
  region: string;
  subregion: string;
  borders: string[];
}
interface Feature {
  properties: Record<string, string>;
  geometry: Geometry;
}

// French exonyms; source spelling remains an explicit accepted alias.
const french: Record<string, string> = {
  Kabul: 'Kaboul',
  'Andorra la Vella': 'Andorre-la-Vieille',
  'Abu Dhabi': 'Abou Dabi',
  Yerevan: 'Erevan',
  Vienna: 'Vienne',
  Baku: 'Bakou',
  Brussels: 'Bruxelles',
  Dhaka: 'Dacca',
  Thimphu: 'Thimphou',
  Bern: 'Berne',
  Beijing: 'Pékin',
  Havana: 'La Havane',
  Nicosia: 'Nicosie',
  Copenhagen: 'Copenhague',
  'Santo Domingo': 'Saint-Domingue',
  Algiers: 'Alger',
  Cairo: 'Le Caire',
  'Addis Ababa': 'Addis-Abeba',
  London: 'Londres',
  Tbilisi: 'Tbilissi',
  Athens: 'Athènes',
  'Guatemala City': 'Guatemala',
  Tehran: 'Téhéran',
  Baghdad: 'Bagdad',
  Jerusalem: 'Jérusalem',
  Bishkek: 'Bichkek',
  'South Tarawa': 'Tarawa-Sud',
  Seoul: 'Séoul',
  'Kuwait City': 'Koweït',
  Beirut: 'Beyrouth',
  'Mexico City': 'Mexico',
  Valletta: 'La Valette',
  'Ulan Bator': 'Oulan-Bator',
  'Port Louis': 'Port-Louis',
  Kathmandu: 'Katmandou',
  Muscat: 'Mascate',
  'Panama City': 'Panama',
  Manila: 'Manille',
  Warsaw: 'Varsovie',
  Lisbon: 'Lisbonne',
  Bucharest: 'Bucarest',
  Moscow: 'Moscou',
  Riyadh: 'Riyad',
  Singapore: 'Singapour',
  'City of San Marino': 'Saint-Marin',
  Mogadishu: 'Mogadiscio',
  Juba: 'Djouba',
  Damascus: 'Damas',
  Dushanbe: 'Douchanbé',
  Ashgabat: 'Achgabat',
  'Port of Spain': 'Port-d’Espagne',
  Tashkent: 'Tachkent',
  'Vatican City': 'Cité du Vatican',
  Hanoi: 'Hanoï',
  "Sana'a": 'Sanaa',
  'Cape Town': 'Le Cap',
  'Washington D.C.': 'Washington',
};
const countryNames: Record<string, string> = {
  COD: 'République démocratique du Congo',
  COG: 'République du Congo',
  CPV: 'Cap-Vert',
  PLW: 'Palaos',
  MUS: 'Maurice',
  VAT: 'Vatican',
  STP: 'São Tomé-et-Príncipe',
};
// Preserve special cases, but do not ask an unqualified capital question about them.
const capitals: Record<string, string[]> = {
  BOL: ['Sucre', 'La Paz'],
  SWZ: ['Mbabane', 'Lobamba'],
  LKA: ['Sri Jayawardenepura Kotte', 'Colombo'],
  NLD: ['Amsterdam', 'La Haye'],
  MYS: ['Kuala Lumpur', 'Putrajaya'],
  NRU: [],
};
const capitalExcluded = new Set([
  'BOL',
  'SWZ',
  'LKA',
  'NLD',
  'MYS',
  'NRU',
  'ISR',
  'PSE',
  'YEM',
  'IDN',
  'GNQ',
  'CHE',
  'BEN',
  'CIV',
]);
const flagExcluded = new Set(['ROU', 'TCD', 'IDN', 'MCO', 'AFG', 'SYR']);

async function main(): Promise<void> {
  await mkdir(cache, { recursive: true });
  await mkdir(`${out}/flags`, { recursive: true });
  const raw: SourceCountry[] = JSON.parse(
    await download(sources.countries, `${cache}/countries.json`),
  );
  const world: { features: Feature[] } = JSON.parse(
    await download(sources.geometry, `${cache}/world.geojson`),
  );
  const selected = raw.filter((c) => c.unMember || ['VAT', 'PSE'].includes(c.cca3));
  const codes = new Set(selected.map((c) => c.cca3));
  const countries: Country[] = [];
  for (const c of selected) {
    const sourceCapitals = capitals[c.cca3] ?? c.capital;
    const translated = sourceCapitals.map((name) => french[name] ?? name);
    const name = countryNames[c.cca3] ?? c.translations.fra.common;
    const svg = await download(
      `${sources.flags}/flags/4x3/${c.cca2.toLowerCase()}.svg`,
      `${cache}/${c.cca2}.svg`,
    );
    const sanitized = svg
      .replace(/<title[\s\S]*?<\/title>/g, '')
      .replace(/<desc[\s\S]*?<\/desc>/g, '')
      .replace(/<!--[^]*?-->/g, '');
    const filename = createHash('sha256').update(sanitized).digest('hex').slice(0, 20) + '.svg';
    await writeFile(`${out}/flags/${filename}`, sanitized);
    const feature = world.features.find((f) =>
      [f.properties['ISO_A3'], f.properties['ISO_A3_EH']].includes(c.cca3),
    );
    countries.push({
      iso2: c.cca2,
      iso3: c.cca3,
      name,
      aliases: [
        ...new Set([
          c.translations.fra.common,
          c.name.common,
          ...(c.cca3 === 'COD' ? ['RDC', 'Congo-Kinshasa'] : []),
          ...(c.cca3 === 'COG' ? ['Congo-Brazzaville'] : []),
          ...(c.cca3 === 'MMR' ? ['Myanmar'] : []),
          ...(c.cca3 === 'CZE' ? ['République tchèque'] : []),
        ]),
      ].filter((alias) => alias !== name && alias !== 'Congo'),
      capitals: translated,
      capitalAliases: Object.fromEntries(
        translated.map((name, i) => [name, sourceCapitals[i] === name ? [] : [sourceCapitals[i]]]),
      ),
      continent: c.region,
      subregion: c.subregion,
      borders: c.borders.filter((code) => codes.has(code)),
      flag: `content/geography/flags/${filename}`,
      flagEligible: !flagExcluded.has(c.cca3),
      capitalEligible: !capitalExcluded.has(c.cca3),
      ...(feature ? { geometry: feature.geometry } : {}),
    });
  }
  await writeFile(`${out}/countries.json`, JSON.stringify(countries));
  await writeFile(
    `${out}/manifest.json`,
    JSON.stringify(
      {
        sources,
        count: countries.length,
        scope: '193 UN members + Vatican and Palestine',
        geometryScale: '1:110m',
        licenses: { countries: 'ODbL-1.0', geometry: 'Public domain', flags: 'MIT' },
      },
      null,
      2,
    ) + '\n',
  );
  for (const [name, url] of Object.entries({
    'LICENSE-countries.txt':
      'https://raw.githubusercontent.com/mledoze/countries/c8015eebdd94c533358406b0d709f441389e1f2e/LICENSE',
    'LICENSE-flags.txt': `${sources.flags}/LICENSE`,
  }))
    await writeFile(`${out}/${name}`, await download(url, `${cache}/${name}`));
  console.log(
    `Prepared ${countries.length} countries (${countries.filter((c) => c.geometry).length} geometries).`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
