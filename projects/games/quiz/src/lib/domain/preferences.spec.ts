import { describe, expect, it } from 'vitest';
import { normalizePreferences, enabledQuestionTypes } from './preferences';

describe('préférences du quiz', () => {
  it.each([undefined, null, [], 'false', 42, {}])(
    'active toutes les catégories sans false explicite : %j',
    (raw) => {
      expect(enabledQuestionTypes(normalizePreferences(raw))).toHaveLength(5);
    },
  );
  it('désactive seulement le booléen false, y compris pour une catégorie ajoutée plus tard', () => {
    expect(
      enabledQuestionTypes(
        normalizePreferences({ flag: false, capital: 'false', neighbors: 0, silhouette: null }),
      ),
    ).toEqual(['silhouette', 'country-from-capital', 'capital', 'neighbors']);
  });
  it('respecte une sélection vide enregistrée', () => {
    expect(
      enabledQuestionTypes(
        normalizePreferences({
          silhouette: false,
          flag: false,
          'country-from-capital': false,
          capital: false,
          neighbors: false,
        }),
      ),
    ).toEqual([]);
  });
});
