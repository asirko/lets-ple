import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { loadKnowledgeMap, type KnowledgeCountry } from '../../data/knowledge-data';
import type { KnowledgeLevel } from '../../domain/knowledge-stats/knowledge-level';
import type { GlobeHandle } from '../../globe/globe-port';
import type { LabelCandidate } from '../country-globe/globe-geography';
import type { StatsLabels } from '../statistics-models';
@Component({
  selector: 'lp-knowledge-globe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section>
    <h2>{{ labels()['globe'] }}</h2>
    <p>{{ labels()['globeHint'] }}</p>
    @if (failed()) {
      <p role="status">{{ labels()['globeFallback'] }}</p>
    } @else {
      <div class="quiz-stats-globe">
        <div #surface class="quiz-stats-globe-surface">
          @for (label of names(); track label.code) {
            <span
              aria-hidden="true"
              class="quiz-globe-label"
              [class.is-selected]="label.code === selected()"
              [style.left.px]="label.x"
              [style.top.px]="label.y"
              >{{ label.name }}</span
            >
          }
        </div>
      </div>
      <div class="quiz-stats-touch-control">
        <button class="b-button" (click)="engage()" [attr.aria-pressed]="engaged()" type="button">
          {{ labels()['activateTouch'] }}
        </button>
      </div>
    }
    <p>{{ labels()['coverage'] }}</p>
  </section>`,
})
export class LpKnowledgeGlobe {
  readonly labels = input.required<StatsLabels>();
  readonly countries = input.required<readonly KnowledgeCountry[]>();
  readonly levels = input.required<ReadonlyMap<string, KnowledgeLevel>>();
  readonly selected = input<string | null>(null);
  readonly continent = input<string | null>(null);
  readonly selectedCountry = output<string>();
  readonly unavailable = output<void>();
  readonly failed = signal(false);
  readonly engaged = signal(false);
  readonly names = signal<readonly LabelCandidate[]>([]);
  private surface = viewChild<ElementRef<HTMLElement>>('surface');
  private handle: GlobeHandle | null = null;
  private controller = new AbortController();
  private starting = false;
  private destroyed = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.controller.abort();
      this.handle?.dispose();
    });
    effect(() => {
      const levels = this.levels(),
        selected = this.selected(),
        continent = this.continent();
      const surface = this.surface();
      if (surface && !this.starting) {
        this.starting = true;
        void this.start(surface.nativeElement);
      }
      this.handle?.update(levels, selected, continent);
    });
  }
  private async start(host: HTMLElement): Promise<void> {
    try {
      const [module, map] = await Promise.all([
        import('../../globe/three-globe'),
        loadKnowledgeMap(this.controller.signal),
      ]);
      if (this.destroyed) return;
      this.handle = module.createGlobe(host, map, this.countries(), {
        label: this.labels()['globe'],
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        onSelect: (code) => this.selectedCountry.emit(code),
        onLabels: (labels) => {
          if (!this.destroyed) this.names.set(labels);
        },
        onUnavailable: () => {
          this.handle?.dispose();
          this.handle = null;
          this.names.set([]);
          this.failed.set(true);
          this.unavailable.emit();
        },
      });
      this.handle.update(this.levels(), this.selected(), this.continent());
    } catch {
      if (!this.destroyed) {
        this.failed.set(true);
        this.unavailable.emit();
      }
    }
  }
  engage(): void {
    this.engaged.update((v) => !v);
    this.handle?.setEngaged(this.engaged());
  }
}
