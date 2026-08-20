import { describe, expect, test } from 'vitest';
import {
  PORT_RANGE,
  branchNameFor,
  formatIssueContext,
  parsePortFile,
  pickPort,
  slugify,
} from './ticket-lib';

describe('slugify', () => {
  test('met en minuscules et relie les mots par des tirets', () => {
    expect(slugify('Piles multiples dans le cryptogramme')).toBe(
      'piles-multiples-dans-le-cryptogramme',
    );
  });

  test('retire les accents et la ponctuation', () => {
    expect(slugify("Amélioration de l'écran d'accueil")).toBe('amelioration-de-l-ecran-d-accueil');
  });

  test('ne laisse jamais de tiret en début ou en fin', () => {
    expect(slugify('  --- Refonte CSS !!! ')).toBe('refonte-css');
  });

  test('tronque sans couper un mot en deux', () => {
    const slug = slugify(
      'Corriger la lisibilite des lettres decodees dans la grille du cryptogramme',
    );
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug).toBe('corriger-la-lisibilite-des-lettres');
  });

  test('rend une chaine vide quand rien n est slugifiable', () => {
    expect(slugify('!!! ???')).toBe('');
  });
});

describe('branchNameFor', () => {
  test('prefixe le slug du numero d issue', () => {
    expect(branchNameFor({ issueNumber: 42, title: 'Piles multiples' })).toBe('42-piles-multiples');
  });

  test('rend le slug seul quand il n y a pas de numero', () => {
    expect(branchNameFor({ title: 'refacto CSS' })).toBe('refacto-css');
  });

  test('retombe sur le numero seul quand le titre n est pas slugifiable', () => {
    expect(branchNameFor({ issueNumber: 7, title: '???' })).toBe('7-ticket');
  });

  test('refuse un sujet sans numero ni titre slugifiable', () => {
    expect(() => branchNameFor({ title: '???' })).toThrow(/slugifiable/i);
  });
});

describe('pickPort', () => {
  test('prend le premier port de la plage quand rien n est pris', () => {
    expect(pickPort([])).toBe(PORT_RANGE.start);
  });

  test('saute les ports deja pris', () => {
    expect(pickPort([PORT_RANGE.start, PORT_RANGE.start + 1])).toBe(PORT_RANGE.start + 2);
  });

  test('ignore les ports pris hors de la plage', () => {
    expect(pickPort([4200, 8080])).toBe(PORT_RANGE.start);
  });

  test('leve une erreur quand la plage est epuisee', () => {
    const tous = [];
    for (let port = PORT_RANGE.start; port <= PORT_RANGE.end; port++) tous.push(port);
    expect(() => pickPort(tous)).toThrow(/plage/i);
  });
});

describe('parsePortFile', () => {
  test('lit un port valide entoure d espaces', () => {
    expect(parsePortFile(' 4207\n')).toBe(4207);
  });

  test('rend null sur un contenu absent ou illisible', () => {
    expect(parsePortFile(null)).toBeNull();
    expect(parsePortFile('abc')).toBeNull();
  });

  test('rend null sur un port hors de la plage', () => {
    expect(parsePortFile('80')).toBeNull();
  });
});

describe('formatIssueContext', () => {
  test('resume l issue en un bloc lisible', () => {
    const bloc = formatIssueContext({
      number: 42,
      title: 'Piles multiples',
      body: 'On veut plusieurs piles.',
      labels: [{ name: 'enhancement' }],
      milestone: { title: 'affinage cryptogramme' },
    });

    expect(bloc).toContain('#42 Piles multiples');
    expect(bloc).toContain('enhancement');
    expect(bloc).toContain('affinage cryptogramme');
    expect(bloc).toContain('On veut plusieurs piles.');
  });

  test('omet les lignes labels et jalon quand elles sont vides', () => {
    const bloc = formatIssueContext({
      number: 7,
      title: 'Chore',
      body: '',
      labels: [],
      milestone: null,
    });

    expect(bloc).not.toMatch(/labels/i);
    expect(bloc).not.toMatch(/jalon/i);
    expect(bloc).toContain('#7 Chore');
  });
});
