import { GAME_REGISTRY } from './game-registry';

describe('GAME_REGISTRY', () => {
  it('contient une entrée pour le cryptogramme', () => {
    const cryptogramme = GAME_REGISTRY.find((g) => g.id === 'cryptogramme');
    expect(cryptogramme).toMatchObject({
      id: 'cryptogramme',
      route: '/cryptogramme',
    });
  });

  it("chaque jeu du registre a les champs requis non vides", () => {
    for (const game of GAME_REGISTRY) {
      expect(game.id).not.toBe('');
      expect(game.title).not.toBe('');
      expect(game.summary).not.toBe('');
      expect(game.route.startsWith('/')).toBe(true);
      expect(game.icon).not.toBe('');
      expect(game.themes.length).toBeGreaterThan(0);
    }
  });
});
