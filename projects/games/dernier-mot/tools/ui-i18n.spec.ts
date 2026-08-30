import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const UI_SOURCES = [
  'player-setup/lp-player-setup.ts',
  'scoreboard/lp-scoreboard.ts',
  'word-progress/lp-word-progress.ts',
  'letter-keyboard/lp-letter-keyboard.ts',
  'turn-dialog/lp-turn-dialog.ts',
  'game-page/lp-dernier-mot-game-page.ts',
  'game-route/lp-dernier-mot-game-route.ts',
];

const REQUIRED_KEYS = [
  'dernierMot.title',
  'dernierMot.setup.title',
  'dernierMot.scoreboard.eliminated',
  'dernierMot.word.firstLetter',
  'dernierMot.keyboard.groupLabel',
  'dernierMot.dialog.showDefinition',
  'dernierMot.game.invalidMessage',
  'dernierMot.route.loading',
];

describe('i18n de Dernier Mot', () => {
  it('fait passer chaque texte de jeu par le service i18n', async () => {
    const sources = await Promise.all(
      UI_SOURCES.map((file) =>
        readFile(resolve('projects/games/dernier-mot/src/lib/ui', file), 'utf8'),
      ),
    );

    for (const [index, source] of sources.entries()) {
      expect(source, UI_SOURCES[index]).toContain('I18nService');
    }

    const combined = sources.join('\n');
    for (const literal of [
      'Nouvelle partie',
      'Vainqueur',
      'Choisissez la première lettre',
      'Choisir une lettre',
      'Voir la définition',
      'La manche continue',
      'Chargement du dictionnaire',
    ]) {
      expect(combined, literal).not.toContain(literal);
    }
  });

  it('versionne les clés nécessaires dans le dictionnaire français', async () => {
    const dictionary = JSON.parse(
      await readFile(resolve('projects/libs/game-core/src/lib/i18n/fr.json'), 'utf8'),
    ) as Record<string, string>;

    for (const key of REQUIRED_KEYS) expect(dictionary[key], key).toBeTypeOf('string');
  });
});
