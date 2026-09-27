import { Injectable, inject, signal } from '@angular/core';
import { STORAGE_KEYS, StorageService } from '@lets-ple/game-core';
import { normalizePreferences, type QuizPreferences } from '../domain/preferences';

@Injectable({ providedIn: 'root' })
export class QuizSettingsService {
  private readonly storage = inject(StorageService);
  private readonly value = signal(
    normalizePreferences(this.storage.read<unknown>(STORAGE_KEYS.quizSettings, null)),
  );
  readonly preferences = this.value.asReadonly();

  save(preferences: QuizPreferences): boolean {
    const normalized = normalizePreferences(preferences);
    try {
      this.storage.write(STORAGE_KEYS.quizSettings, normalized);
      this.value.set(normalized);
      return true;
    } catch {
      return false;
    }
  }
}
