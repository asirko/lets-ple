import { describe, expect, it } from 'vitest';
import { chooseBump, nextVersion, parseCommit } from './commits';
import { makeNotes, renderChangelog } from './notes';

const parse = (message: string) => parseCommit({ hash: 'abc123', message });

describe('Conventional Commits de release', () => {
  it.each([
    [['fix(portal): corrige le chargement'], 'patch'],
    [['chore: entretien', 'fix(ui): corrige le contraste'], 'patch'],
    [['feat(portal): ajoute les nouveautes', 'fix(ui): corrige le contraste'], 'minor'],
    [['refactor(core)!: change le stockage', 'feat(ui): ajoute un bouton'], 'major'],
    [['docs: precise les regles'], null],
    [[], null],
    [
      [
        'feat(core): change le stockage\n\nBREAKING CHANGE: Les sauvegardes changent.\nUne migration est requise.',
      ],
      'major',
    ],
    [['fix(core): change le format\n\nBREAKING-CHANGE: Nouveau format.'], 'major'],
  ] as const)('classe %j en %s', (messages, expected) => {
    expect(chooseBump(messages.map(parse))).toBe(expected);
  });

  it('ignore une simple mention de rupture dans une phrase', () => {
    expect(
      parse('fix(ui): corrige le texte\n\nLa mention BREAKING CHANGE: est un exemple.').breaking,
    ).toBe(false);
  });

  it('conserve les paragraphes de migration jusquau prochain footer', () => {
    const result = parse(
      'feat(portal): change le stockage\n\nBREAKING CHANGE: Les anciennes sauvegardes changent.\n\nOuvrez les préférences pour migrer.\n\nRefs: #12\nBREAKING CHANGE: Un autre format change.',
    );
    expect(result.breakingNotes).toEqual([
      'Les anciennes sauvegardes changent.\n\nOuvrez les préférences pour migrer.',
      'Un autre format change.',
    ]);
  });

  it.each([
    'texte libre',
    'feat: manque le scope',
    'fix(ui): accentué',
    'fix(ui): termine.',
    'unknown(ui): change',
    'feat(): vide',
  ])('refuse %s avec le hash', (message) => {
    expect(() => parse(message)).toThrow(/abc123/);
  });

  it('accepte les scopes de maintenance et les majuscules internes historiques', () => {
    expect(parse('chore(release): 0.2.0').type).toBe('chore');
    expect(parse('docs: convention CSS SMACSS').subject).toBe('convention CSS SMACSS');
  });

  it('calcule les versions meme en 0.x', () => {
    expect(nextVersion('0.1.9', 'patch')).toBe('0.1.10');
    expect(nextVersion('0.1.9', 'minor')).toBe('0.2.0');
    expect(nextVersion('0.1.9', 'major')).toBe('1.0.0');
    expect(() => nextVersion('0.1.0-beta', 'patch')).toThrow();
  });

  it('produit des notes joueur, conserve les ruptures techniques et le changelog ancien', () => {
    const notes = makeNotes('1.0.0', '2026-09-27', [
      parse('feat(portal): affiche les nouveautes'),
      parse('fix(ui): corrige le contraste'),
      parse('test(ui): couvre le focus'),
      parse(
        'refactor(core)!: change le stockage\n\nBREAKING CHANGE: Les anciennes sauvegardes doivent être migrées.',
      ),
    ]);
    expect(notes.features).toEqual(['affiche les nouveautes']);
    expect(notes.fixes).toEqual(['corrige le contraste']);
    expect(notes.breaking).toEqual(['Les anciennes sauvegardes doivent être migrées.']);
    const old = makeNotes('0.1.0', '2026-08-01', [parse('feat(portal): ajoute le catalogue')]);
    const markdown = renderChangelog([notes, old]);
    expect(markdown).toContain('## 1.0.0');
    expect(markdown).toContain('## 0.1.0');
    expect(markdown).not.toContain('couvre le focus');
    expect(markdown).not.toContain('abc123');
  });
});
