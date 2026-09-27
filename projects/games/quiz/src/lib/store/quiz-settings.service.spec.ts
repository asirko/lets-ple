import { TestBed } from '@angular/core/testing';
import { STORAGE_KEYS, STORAGE_PREFIX, StorageService } from '@lets-ple/game-core';
import { QuizSettingsService } from './quiz-settings.service';
import { normalizePreferences } from '../domain/preferences';
import { QuizStore } from './quiz.store';

describe('paramètres persistants du quiz', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_PREFIX + STORAGE_KEYS.quizSettings));
  afterEach(() => localStorage.removeItem(STORAGE_PREFIX + STORAGE_KEYS.quizSettings));

  it('restaure seulement les exclusions explicites, puis persiste les changements', () => {
    localStorage.setItem(
      STORAGE_PREFIX + STORAGE_KEYS.quizSettings,
      JSON.stringify({ flag: false, neighbors: 'false' }),
    );
    const settings = TestBed.inject(QuizSettingsService);
    expect(settings.preferences().flag).toBe(false);
    expect(settings.preferences().neighbors).toBe(true);
    expect(settings.preferences().silhouette).toBe(true);
    expect(settings.save(normalizePreferences({ capital: false }))).toBe(true);
    expect(
      JSON.parse(localStorage.getItem(STORAGE_PREFIX + STORAGE_KEYS.quizSettings)!).capital,
    ).toBe(false);
  });

  it('tolère un JSON illisible', () => {
    localStorage.setItem(STORAGE_PREFIX + STORAGE_KEYS.quizSettings, '{broken');
    expect(Object.values(TestBed.inject(QuizSettingsService).preferences()).every(Boolean)).toBe(
      true,
    );
  });

  it('conserve les paramètres actuels si l’écriture échoue', () => {
    const settings = TestBed.inject(QuizSettingsService);
    vi.spyOn(TestBed.inject(StorageService), 'write').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(settings.save(normalizePreferences({ flag: false }))).toBe(false);
    expect(settings.preferences().flag).toBe(true);
  });

  it('une sauvegarde excluant tout laisse accéder aux réglages sans lancer de partie', () => {
    TestBed.configureTestingModule({ providers: [QuizStore] });
    TestBed.inject(QuizSettingsService).save(
      normalizePreferences({
        silhouette: false,
        flag: false,
        capital: false,
        'country-from-capital': false,
        neighbors: false,
      }),
    );
    const store = TestBed.inject(QuizStore);
    expect(() => store.start([])).not.toThrow();
    expect(store.catalog()).not.toBeNull();
    expect(store.state()).toBeNull();
  });
});
