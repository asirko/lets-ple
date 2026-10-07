import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { I18nService } from '@lets-ple/game-core';
import { QuizStatisticsStore } from '../../store/quiz-statistics.store';
import { LpStatisticsSummary } from '../statistics-summary/statistics-summary';
import { LpContinentFocus } from '../continent-focus/continent-focus';
import { LpWeeklyTrend } from '../weekly-trend/weekly-trend';
import { LpTypeBreakdown } from '../type-breakdown/type-breakdown';
import { LpCountryList } from '../country-list/country-list';
import { LpCountryDetail } from '../country-detail/country-detail';
import { LpKnowledgeLegend } from '../knowledge-legend/knowledge-legend';
import { LpEmptyHistory } from '../empty-history/empty-history';
import { LpHistoryStatus } from '../history-status/history-status';
import { LpClearHistoryDialog } from '../clear-history-dialog/clear-history-dialog';
import { LpKnowledgeGlobe } from '../knowledge-globe/knowledge-globe';
import { resolveStatsLabels } from '../stats-labels';
import type { BreakdownRow } from '../statistics-models';
import { HISTORY_TYPES } from '../../domain/knowledge-stats/events';
import { EMPTY_METRICS } from '../../domain/knowledge-stats/statistics';
@Component({
  selector: 'lp-quiz-statistics-page',
  imports: [
    RouterLink,
    LpStatisticsSummary,
    LpContinentFocus,
    LpWeeklyTrend,
    LpTypeBreakdown,
    LpCountryList,
    LpCountryDetail,
    LpKnowledgeLegend,
    LpEmptyHistory,
    LpHistoryStatus,
    LpClearHistoryDialog,
    LpKnowledgeGlobe,
  ],
  providers: [QuizStatisticsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_knowledge-stats.scss'],
  template: ` <main class="quiz-stats-shell">
    <header class="quiz-stats-heading">
      <div>
        <a routerLink="/quiz">{{ labels()['back'] }}</a>
        <h1 #heading tabindex="-1">{{ labels()['title'] }}</h1>
      </div>
      <button class="b-button" type="button" (click)="clearOpen.set(true)">
        {{ labels()['clear'] }}
      </button>
    </header>
    <lp-continent-focus
      [continent]="stats.filters().continent"
      [mode]="stats.filters().mode"
      [labels]="labels()"
      (continentChanged)="stats.setContinent($event)"
      (modeChanged)="stats.setMode($event)"
    />
    <lp-history-status
      [kind]="status().kind"
      [pending]="status().pending"
      [invalid]="stats.invalidCount()"
      [labels]="labels()"
      (retry)="retry()"
    />
    @if (stats.loadState() === 'loading') {
      <p role="status">{{ labels()['loading'] }}</p>
    }
    @if (stats.loadState() === 'error') {
      <p role="alert">{{ labels()['loadError'] }}</p>
      <button class="b-button" type="button" (click)="retry()">{{ labels()['retry'] }}</button>
    }
    @if (stats.result(); as result) {
      @if (
        result.overall.count === 0 &&
        stats.loadState() === 'ready' &&
        !stats.filters().continent &&
        !stats.filters().mode
      ) {
        <lp-empty-history [labels]="labels()" (play)="play()" />
      }
      <lp-statistics-summary [metrics]="result.overall" [labels]="labels()" />
      <p>{{ labels()['allTime'] }}</p>
      <div class="quiz-stats-filters">
        <button
          class="b-button"
          type="button"
          [attr.aria-pressed]="stats.view() === 'globe'"
          (click)="stats.setView('globe')"
        >
          {{ labels()['viewGlobe'] }}</button
        ><button
          class="b-button"
          type="button"
          [attr.aria-pressed]="stats.view() === 'list'"
          (click)="stats.setView('list')"
        >
          {{ labels()['viewList'] }}
        </button>
      </div>
      <div class="quiz-stats-map-region">
        @if (stats.view() === 'globe') {
          <lp-knowledge-globe
            [countries]="stats.countries()"
            [levels]="stats.levels()"
            [selected]="stats.selectedIso3()"
            [continent]="stats.filters().continent"
            [labels]="labels()"
            (selectedCountry)="stats.selectCountry($event)"
          />
        }
        <lp-knowledge-legend [labels]="labels()" />
      </div>
      @if (stats.proposedCountry(); as proposed) {
        <p role="status">{{ i18n.t('quiz.stats.changeFocus', { country: proposed.name }) }}</p>
        <button
          class="b-button"
          (click)="stats.setContinent(proposed.continent); stats.selectCountry(proposed.iso3)"
        >
          {{ labels()['focus'] }} : {{ labels()['continent.' + proposed.continent] }}</button
        ><button class="b-button" (click)="stats.proposedCountry.set(null)">
          {{ labels()['cancel'] }}
        </button>
      }
      @if (selected(); as country) {
        <lp-country-detail
          [country]="country"
          [types]="countryTypes()"
          [modes]="countryModes()"
          [labels]="labels()"
          (closed)="closeDetail()"
        />
      }
      <lp-weekly-trend [weeks]="weeks()" [timeZone]="stats.timeZone()" [labels]="labels()" />
      <lp-type-breakdown [title]="labels()['types']" [rows]="types()" [labels]="labels()" />
      <lp-country-list
        #list
        [rows]="stats.rows()"
        [selected]="stats.selectedIso3()"
        [labels]="labels()"
        (selectedCountry)="stats.selectCountry($event)"
      />
    }
    <lp-clear-history-dialog
      [open]="clearOpen()"
      [busy]="clearing()"
      [failed]="stats.clearFailed()"
      [labels]="labels()"
      (cancelled)="clearOpen.set(false)"
      (confirmed)="clear()"
    />
  </main>`,
})
export class QuizStatisticsPage {
  readonly stats = inject(QuizStatisticsStore);
  readonly i18n = inject(I18nService);
  private router = inject(Router);
  readonly labels = computed(() => resolveStatsLabels((k) => this.i18n.t(k)));
  readonly clearOpen = signal(false);
  readonly clearing = signal(false);
  readonly status = computed(() => {
    this.stats.history.revision();
    const status = this.stats.history.coordinator.status();
    return this.stats.loadState() === 'incomplete' ? { ...status, kind: 'incomplete' } : status;
  });
  readonly selected = computed(
    () => this.stats.rows().find((c) => c.iso3 === this.stats.selectedIso3()) ?? null,
  );
  readonly types = computed(() =>
    HISTORY_TYPES.map((key) => ({
      key,
      label: this.labels()['type.' + key],
      metrics: this.stats.result()?.byType.get(key) ?? EMPTY_METRICS,
    })),
  );
  readonly weeks = computed(
    () =>
      this.stats
        .result()
        ?.weeks.map((w) => ({
          label: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(
            w.window.startMs,
          ),
          current: w.window.current,
          metrics: w.metrics,
        })) ?? [],
  );
  readonly countryTypes = computed(() => this.countryBreakdown('type'));
  readonly countryModes = computed(() => this.countryBreakdown('mode'));
  private heading = viewChild<ElementRef<HTMLElement>>('heading');
  private list = viewChild('list', { read: ElementRef });
  constructor() {
    afterNextRender(() => this.heading()?.nativeElement.focus());
  }
  private countryBreakdown(kind: 'type' | 'mode'): BreakdownRow[] {
    const country = this.selected();
    if (!country) return [];
    const map =
      kind === 'type' ? this.stats.result()?.countryByType : this.stats.result()?.countryByMode;
    return [...(map ?? [])]
      .filter(([k]) => k.startsWith(country.iso3 + '|'))
      .map(([k, metrics]) => ({
        key: k,
        label: this.labels()[kind + '.' + k.split('|')[1]],
        metrics,
      }));
  }
  closeDetail(): void {
    this.stats.selectedIso3.set(null);
    queueMicrotask(() => this.list()?.nativeElement.querySelector('input')?.focus());
  }
  play(): void {
    void this.router.navigateByUrl('/quiz');
  }
  async retry(): Promise<void> {
    await this.stats.history.retry();
    await this.stats.refresh();
  }
  async clear(): Promise<void> {
    this.clearing.set(true);
    try {
      await this.stats.clear();
      this.clearOpen.set(false);
    } catch {
    } finally {
      this.clearing.set(false);
    }
  }
}
