import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { loadKnowledgeMap, type KnowledgeMap } from '../../data/knowledge-data';
import type { Geometry } from '../../domain/types';
import { countryAnchor, staticGlobePath, type LabelCandidate } from '../../globe/globe-geography';
import type {
  CenterOptions,
  GlobeHandle,
  GlobeLabel,
  GlobePlace,
  GlobeTone,
} from '../../globe/globe-port';
// One parse of the heavy mesh per session: correction dialogs remount the globe every question.
let sharedMap: Promise<KnowledgeMap> | null = null;
function knowledgeMap(): Promise<KnowledgeMap> {
  sharedMap ??= loadKnowledgeMap(new AbortController().signal).catch((error: unknown) => {
    sharedMap = null;
    throw error;
  });
  return sharedMap;
}
/**
 * Pure globe rendering and direct interaction (drag, pinch/wheel zoom, keyboard, tap to
 * select). Titles, legends and buttons belong to the screens that host it.
 */
@Component({
  selector: 'lp-globe',
  host: { class: 'quiz-globe' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (staticOnly() || failed()) {
      @if (fallbackShape()) {
        <svg class="quiz-globe-static" viewBox="0 0 300 300" role="img" [attr.aria-label]="label()">
          <circle cx="150" cy="150" r="143" class="quiz-globe-ocean" />
          <ellipse cx="150" cy="150" rx="75" ry="143" class="quiz-globe-grid" />
          <ellipse cx="150" cy="150" rx="143" ry="50" class="quiz-globe-grid" />
          <path [attr.d]="staticPath()" class="quiz-globe-selected" fill-rule="evenodd" />
        </svg>
      }
    } @else {
      <div #surface class="quiz-globe-surface">
        @for (name of names(); track name.code) {
          <span
            aria-hidden="true"
            class="quiz-globe-label"
            [class.is-selected]="name.code === selected()"
            [style.left.px]="name.x"
            [style.top.px]="name.y"
            >{{ name.name }}</span
          >
        }
      </div>
    }
  `,
})
export class LpGlobe {
  /** Countries that can be named and centered on. */
  readonly places = input.required<readonly GlobePlace[]>();
  readonly tones = input<ReadonlyMap<string, GlobeTone>>(new Map());
  readonly dimmed = input<ReadonlySet<string>>(new Set());
  /** Names drawn instead of the places' own, e.g. one per group of countries. */
  readonly labels = input<readonly GlobeLabel[] | null>(null);
  /** Outlined country, also first in label priority. */
  readonly selected = input<string | null>(null);
  /** Accessible name of the globe. */
  readonly label = input.required<string>();
  /** Skip WebGL and draw the static view directly. */
  readonly staticOnly = input(false);
  /** Shape drawn by the static view when WebGL is unavailable; nothing is drawn without it. */
  readonly fallbackShape = input<Geometry | null>(null);
  readonly countrySelect = output<string>();
  readonly unavailable = output<void>();
  protected readonly failed = signal(false);
  protected readonly names = signal<readonly LabelCandidate[]>([]);
  protected readonly staticPath = computed(() => {
    const g = this.fallbackShape();
    return g ? staticGlobePath(g, countryAnchor(g)) : '';
  });
  private readonly zone = inject(NgZone);
  private readonly surface = viewChild<ElementRef<HTMLElement>>('surface');
  private handle: GlobeHandle | null = null;
  private pendingCenter: readonly [string, CenterOptions] | null = null;
  constructor() {
    effect((onCleanup) => {
      const host = this.surface()?.nativeElement,
        places = this.places();
      if (!host) return;
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
        this.release();
      });
      this.zone.runOutsideAngular(() => {
        // Keep namespace access: the production optimizer must retain the lazy export.
        void Promise.all([import('../../globe/three-globe'), knowledgeMap()])
          .then(([module, map]) => {
            if (cancelled) return;
            this.handle = module.createGlobe(host, map, places, {
              label: this.label(),
              onSelect: (code) => this.zone.run(() => this.countrySelect.emit(code)),
              onLabels: (labels) => {
                if (!cancelled) this.zone.run(() => this.names.set(labels));
              },
              onUnavailable: () => this.zone.run(() => this.fail()),
            });
            this.handle.update(this.view());
            if (this.pendingCenter) this.handle.centerOn(...this.pendingCenter);
            this.pendingCenter = null;
          })
          .catch(() => {
            if (!cancelled) this.zone.run(() => this.fail());
          });
      });
    });
    effect(() => {
      const view = this.view();
      this.handle?.update(view);
    });
    inject(DestroyRef).onDestroy(() => this.release());
  }
  /** Turns the camera toward a country, now or as soon as the globe is ready. */
  centerOn(iso3: string, options: CenterOptions = {}): void {
    if (this.handle) this.handle.centerOn(iso3, options);
    else this.pendingCenter = [iso3, options];
  }
  private view() {
    return {
      tones: this.tones(),
      dimmed: this.dimmed(),
      selected: this.selected(),
      labels: this.labels(),
    };
  }
  private fail(): void {
    this.release();
    this.names.set([]);
    this.failed.set(true);
    this.unavailable.emit();
  }
  private release(): void {
    this.handle?.dispose();
    this.handle = null;
  }
}
