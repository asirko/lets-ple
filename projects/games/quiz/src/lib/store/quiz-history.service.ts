import { QUIZ_HISTORY_HINT } from '@lets-ple/game-core';
import { DestroyRef, Injectable, inject, signal, InjectionToken } from '@angular/core';
import type { QuizAnswerEventV1 } from '../domain/knowledge-stats/events';
import { IndexedDbHistory } from '../history/indexeddb-history';
import { HistoryCoordinator } from '../history/history-coordinator';
export interface QuizHistoryCollector {
  capture(event: QuizAnswerEventV1): void;
}
export const QUIZ_HISTORY_COLLECTOR = new InjectionToken<QuizHistoryCollector>(
  'QuizHistoryCollector',
);
@Injectable({ providedIn: 'root' })
export class QuizHistoryService {
  readonly revision = signal(0);
  readonly repository = new IndexedDbHistory();
  readonly coordinator = new HistoryCoordinator(this.repository, () =>
    this.revision.update((n) => n + 1),
  );
  readonly ready = this.coordinator.initialize();
  private channel: BroadcastChannel | null = null;
  constructor() {
    const destroy = inject(DestroyRef);
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel('letsple:quiz:history');
        this.channel.onmessage = (e) => {
          void this.coordinator
            .refreshGeneration(e.data === 'cleared')
            .then(() => this.revision.update((n) => n + 1));
        };
      }
    } catch {}
    const refresh = () => {
      void this.coordinator.refreshGeneration().then(() => this.revision.update((n) => n + 1));
    };
    const storage = (event: StorageEvent) => {
      if (event.key === QUIZ_HISTORY_HINT) {
        void this.coordinator
          .refreshGeneration(event.newValue?.startsWith('cleared:') ?? false)
          .then(() => this.revision.update((n) => n + 1));
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', refresh);
      window.addEventListener('storage', storage);
    }
    destroy.onDestroy(() => {
      this.channel?.close();
      this.repository.close();
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', refresh);
        window.removeEventListener('storage', storage);
      }
    });
  }
  private notify(kind: 'changed' | 'cleared'): void {
    try {
      if (this.channel) this.channel.postMessage(kind);
      else if (typeof localStorage !== 'undefined')
        localStorage.setItem(QUIZ_HISTORY_HINT, kind + ':' + crypto.randomUUID());
    } catch {}
  }
  capture(event: QuizAnswerEventV1): void {
    this.coordinator.capture(event);
    void this.coordinator.settled().then(() => this.notify('changed'));
  }
  async retry(): Promise<void> {
    await this.coordinator.retry();
    this.notify('changed');
  }
  async clear(): Promise<void> {
    await this.coordinator.clear();
    this.notify('cleared');
  }
}
