import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '@lets-ple/game-core';
import type { Country } from '../../domain/types';
import { countryAnchor, staticGlobePath, type LabelCandidate } from './globe-geography';
import type { GlobeRenderer } from './globe-renderer';
let nextHelpId = 0;
@Component({
  selector: 'lp-country-globe',
  host: { '(document:keydown.escape)': 'helpKeydown($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="quiz-globe">
      @if (country().geometry) {
        <div #viewport class="quiz-globe-viewport" [class.is-static]="!interactive()">
          @if (!interactive()) {
            <svg
              viewBox="0 0 300 300"
              role="img"
              [attr.aria-label]="i18n.t('quiz.globe.alt', { country: country().name })"
            >
              <circle cx="150" cy="150" r="143" class="quiz-globe-ocean" />
              <ellipse cx="150" cy="150" rx="75" ry="143" class="quiz-globe-grid" />
              <ellipse cx="150" cy="150" rx="143" ry="50" class="quiz-globe-grid" />
              <path [attr.d]="shape()" class="quiz-globe-selected" fill-rule="evenodd" />
              <circle cx="150" cy="150" r="3" class="quiz-globe-marker" />
            </svg>
          }
          @for (label of labels(); track label.code) {
            <span
              aria-hidden="true"
              class="quiz-globe-label"
              [class.is-selected]="label.code === country().iso3"
              [style.left.px]="label.x"
              [style.top.px]="label.y"
              >{{ label.name }}</span
            >
          }
        </div>
      } @else {
        <p class="quiz-globe-fallback">{{ i18n.t('quiz.globe.missing') }}</p>
      }
      <figcaption>
        <strong>{{ country().name }}</strong>
      </figcaption>
    </figure>
    @if (country().geometry) {
      <div class="quiz-globe-controls">
        <button
          class="b-button b-secondary quiz-globe-recenter"
          type="button"
          [disabled]="!interactive()"
          (click)="renderer?.recenter()"
        >
          {{ i18n.t('quiz.globe.recenter') }}
        </button>
        <div
          class="quiz-globe-help-anchor"
          (pointerenter)="openHelp()"
          (pointerleave)="helpOpen.set(helpFocused() && !helpDismissed()); helpDismissed.set(false)"
        >
          <button
            class="b-button b-secondary quiz-globe-help-trigger"
            type="button"
            [attr.aria-label]="i18n.t('quiz.globe.helpLabel')"
            [attr.aria-describedby]="helpId"
            (focus)="helpFocused.set(true); helpDismissed.set(false); helpOpen.set(true)"
            (blur)="helpFocused.set(false); helpOpen.set(false)"
            (click)="helpDismissed.set(false); helpOpen.set(true)"
          >
            ?
          </button>
          <div class="quiz-globe-tooltip" role="tooltip" [id]="helpId" [hidden]="!helpOpen()">
            {{ i18n.t('quiz.globe.caption') }}<br />
            {{ i18n.t(interactive() ? 'quiz.globe.help' : 'quiz.globe.static') }}
          </div>
        </div>
      </div>
    }
  `,
})
export class LpCountryGlobe {
  readonly country = input.required<Country>();
  readonly countries = input.required<readonly Country[]>();
  readonly staticOnly = input(false);
  protected readonly i18n = inject(I18nService);
  private readonly zone = inject(NgZone);
  private readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  protected readonly interactive = signal(false);
  protected readonly labels = signal<readonly LabelCandidate[]>([]);
  protected readonly helpOpen = signal(false);
  protected readonly helpFocused = signal(false);
  protected readonly helpDismissed = signal(false);
  protected openHelp(): void {
    if (!this.helpDismissed()) this.helpOpen.set(true);
  }
  protected readonly helpId = 'quiz-globe-help-' + ++nextHelpId;
  protected helpKeydown(event: Event): void {
    if (event instanceof KeyboardEvent && event.key === 'Escape' && this.helpOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.helpDismissed.set(true);
      this.helpOpen.set(false);
    }
  }
  protected readonly shape = computed(() => {
    const g = this.country().geometry;
    return g ? staticGlobePath(g, countryAnchor(g)) : '';
  });
  protected renderer: GlobeRenderer | null = null;
  constructor() {
    effect((onCleanup) => {
      const host = this.viewport()?.nativeElement,
        country = this.country(),
        countries = this.countries(),
        staticOnly = this.staticOnly();
      let cancelled = false;
      this.interactive.set(false);
      this.labels.set([]);
      onCleanup(() => {
        cancelled = true;
        this.renderer?.dispose();
        this.renderer = null;
      });
      if (!host || !country.geometry || staticOnly) return;
      this.zone.runOutsideAngular(() => {
        // Keep namespace access: the production optimizer must retain the lazy export.
        void import('./globe-renderer')
          .then((module) => {
            if (cancelled) return;
            try {
              this.renderer = module.createGlobe(
                host,
                country,
                countries,
                (labels) => {
                  if (!cancelled)
                    this.zone.run(() => {
                      this.labels.set(labels);
                    });
                },
                () => {
                  this.zone.run(() => {
                    this.renderer?.dispose();
                    this.renderer = null;
                    this.interactive.set(false);
                    this.labels.set([]);
                  });
                },
              );
              this.zone.run(() => this.interactive.set(true));
            } catch {
              this.renderer?.dispose();
              this.renderer = null;
            }
          })
          .catch(() => {
            /* The static view remains usable when the lazy chunk cannot load. */
          });
      });
    });
  }
}
