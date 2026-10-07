import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { QuizHistoryService } from './quiz-history.service';
import { loadKnowledgeCountries, type KnowledgeCountry } from '../data/knowledge-data';
import {
  createAccumulator,
  addAnswers,
  finishStatistics,
  EMPTY_METRICS,
  type StatsResult,
  type StatsFilters,
} from '../domain/knowledge-stats/statistics';
import { classifyKnowledge } from '../domain/knowledge-stats/knowledge-level';
import { localWeekWindows } from '../history/history-calendar';
@Injectable()
export class QuizStatisticsStore {
  readonly history = inject(QuizHistoryService);
  readonly proposedCountry = signal<KnowledgeCountry | null>(null);
  readonly filters = signal<StatsFilters>({ continent: null, mode: null });
  readonly result = signal<StatsResult | null>(null);
  readonly countries = signal<readonly KnowledgeCountry[]>([]);
  readonly selectedIso3 = signal<string | null>(null);
  readonly loadState = signal<'loading' | 'ready' | 'incomplete' | 'error'>('loading');
  readonly invalidCount = signal(0);
  readonly timeZone = signal('');
  readonly clearFailed = signal(false);
  private request = 0;
  private controller = new AbortController();
  private destroyed = false;
  readonly rows = computed(() =>
    this.countries()
      .filter((c) => !this.filters().continent || c.continent === this.filters().continent)
      .map((c) => {
        const metrics = this.result()?.byCountry.get(c.iso3) ?? EMPTY_METRICS;
        return { ...c, metrics, level: classifyKnowledge(metrics) };
      }),
  );
  readonly levels = computed(
    () =>
      new Map(
        this.countries().map((c) => [
          c.iso3,
          classifyKnowledge(this.result()?.byCountry.get(c.iso3) ?? EMPTY_METRICS),
        ]),
      ),
  );
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.request++;
      this.controller.abort();
    });
    effect(() => {
      this.history.revision();
      this.filters();
      void this.refresh();
    });
  }
  setContinent(continent: string | null): void {
    this.filters.update((f) => ({ ...f, continent }));
    this.selectedIso3.set(null);
  }
  setMode(mode: string | null): void {
    this.filters.update((f) => ({ ...f, mode }));
  }
  selectCountry(iso3: string): void {
    const c = this.countries().find((c) => c.iso3 === iso3);
    if (c && this.filters().continent && c.continent !== this.filters().continent) {
      this.proposedCountry.set(c);
      return;
    }
    this.proposedCountry.set(null);
    this.selectedIso3.set(iso3);
  }
  async refresh(): Promise<void> {
    const request = ++this.request;
    const filters = this.filters();
    this.loadState.set('loading');
    const calendar = localWeekWindows(new Date());
    this.timeZone.set(calendar.timeZone);
    const acc = createAccumulator(filters, calendar.windows);
    let incomplete = false,
      invalid = 0;
    try {
      await this.history.ready;
      if (!this.countries().length)
        this.countries.set(await loadKnowledgeCountries(this.controller.signal));
      const pending = new Map(this.history.coordinator.temporaryEvents().map((e) => [e.id, e]));
      try {
        const snapshot = await this.history.repository.beginRead();
        let last = 0;
        while (last < snapshot.highSequence) {
          if (request !== this.request || this.destroyed) return;
          const batch = await this.history.repository.readBatch(snapshot, last, 1000);
          invalid += batch.invalidCount;
          addAnswers(acc, batch.events);
          for (const id of batch.ids) pending.delete(id);
          if (batch.lastSequence === null) break;
          last = batch.lastSequence;
        }
        await this.history.repository.verifyRead(snapshot);
      } catch (e) {
        if ((e as { code?: string })?.code === 'changed') {
          if (request === this.request && !this.destroyed) void this.refresh();
          return;
        }
        incomplete = true;
      }
      addAnswers(acc, [...pending.values()]);
      if (request !== this.request || this.destroyed) return;
      this.invalidCount.set(invalid);
      this.result.set(finishStatistics(acc));
      this.loadState.set(incomplete ? 'incomplete' : 'ready');
    } catch {
      if (request === this.request && !this.destroyed) this.loadState.set('error');
    }
  }
  async clear(): Promise<void> {
    this.clearFailed.set(false);
    try {
      await this.history.clear();
      await this.refresh();
    } catch {
      this.clearFailed.set(true);
      throw new Error('clear failed');
    }
  }
}
