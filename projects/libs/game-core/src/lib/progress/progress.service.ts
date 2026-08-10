import { inject, Injectable, signal } from '@angular/core';
import { StorageService } from '../storage/storage.service';

export interface Progress {
  played: number;
  won: number;
  currentStreak: number;
}

const INITIAL_PROGRESS: Progress = { played: 0, won: 0, currentStreak: 0 };
const STORAGE_KEY = 'progress';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly storage = inject(StorageService);
  private readonly state = signal<Progress>(this.storage.read(STORAGE_KEY, INITIAL_PROGRESS));

  readonly progress = this.state.asReadonly();

  recordWin(): void {
    this.update((p) => ({ played: p.played + 1, won: p.won + 1, currentStreak: p.currentStreak + 1 }));
  }

  recordLoss(): void {
    this.update((p) => ({ played: p.played + 1, won: p.won, currentStreak: 0 }));
  }

  private update(next: (p: Progress) => Progress): void {
    const updated = next(this.state());
    this.state.set(updated);
    this.storage.write(STORAGE_KEY, updated);
  }
}
