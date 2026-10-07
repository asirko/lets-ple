import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { QuizStore } from './quiz.store';
import { QuizSettingsService } from './quiz-settings.service';
import { QUIZ_HISTORY_COLLECTOR } from './quiz-history.service';
import type { Country } from '../domain/types';
const countries: Country[] = Array.from({ length: 12 }, (_, i) => ({
  iso2: 'AA',
  iso3: 'AA' + String.fromCharCode(65 + i),
  name: 'Pays ' + i,
  aliases: [],
  capitals: ['Ville ' + i],
  capitalAliases: {},
  continent: 'Europe',
  subregion: 'Europe',
  borders: [],
  flag: 'flag.svg',
  flagEligible: true,
  capitalEligible: true,
}));
describe('answer history integration', () => {
  it('captures one accepted transition, no rejected submission or next, and renews sessions', () => {
    const capture = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        QuizStore,
        {
          provide: QuizSettingsService,
          useValue: {
            preferences: signal({
              flag: true,
              silhouette: false,
              capital: false,
              'country-from-capital': false,
              neighbors: false,
            }),
          },
        },
        { provide: QUIZ_HISTORY_COLLECTOR, useValue: { capture } },
      ],
    });
    const store = TestBed.inject(QuizStore);
    store.start(countries, 'test-corpus');
    store.dispatch({ type: 'mode', mode: 'cash' });
    store.dispatch({ type: 'answer', value: 'garbage' });
    expect(capture).not.toHaveBeenCalled();
    const country = countries.find((c) => c.iso3 === store.question()!.countryCode)!;
    store.dispatch({ type: 'answer', value: country.name });
    store.dispatch({ type: 'answer', value: country.name });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0][0]).toMatchObject({
      countryIso3: country.iso3,
      correct: true,
      pointsAwarded: 5,
      corpusVersion: 'test-corpus',
    });
    const old = capture.mock.calls[0][0].sessionId;
    store.dispatch({ type: 'next' });
    expect(capture).toHaveBeenCalledTimes(1);
    store.start();
    store.dispatch({ type: 'mode', mode: 'cash' });
    store.dispatch({
      type: 'answer',
      value: countries.find((c) => c.iso3 === store.question()!.countryCode)!.name,
    });
    expect(capture.mock.calls[1][0].sessionId).not.toBe(old);
  });
});
