import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, signal } from '@angular/core';
import { contrastRatio } from '../contrast-ratio';

interface ColorToken {
  readonly name: string;
  readonly cssVar: string;
}

interface ColorTokenRow extends ColorToken {
  readonly resolvedColor: string;
  readonly contrastVsBackground: number;
  readonly contrastVsSurface: number;
}

const COLOR_TOKENS: readonly ColorToken[] = [
  { name: 'Fond', cssVar: '--lp-color-background' },
  { name: 'Surface', cssVar: '--lp-color-surface' },
  { name: 'Surface (élevée)', cssVar: '--lp-color-surface-raised' },
  { name: 'Bordure', cssVar: '--lp-color-border' },
  { name: 'Texte', cssVar: '--lp-color-text' },
  { name: 'Texte atténué', cssVar: '--lp-color-text-muted' },
  { name: 'Primaire', cssVar: '--lp-color-primary' },
  { name: 'Primaire (contraste)', cssVar: '--lp-color-primary-contrast' },
  { name: 'Primaire (survol)', cssVar: '--lp-color-primary-hover' },
  { name: 'Succès', cssVar: '--lp-color-success' },
  { name: 'Danger', cssVar: '--lp-color-danger' },
  { name: 'Anneau de focus', cssVar: '--lp-color-focus-ring' },
];

/** Seuil WCAG AA pour un élément d'UI (bordure, icône) — texte normal exige 4.5:1. */
const AA_UI_THRESHOLD = 3;

@Component({
  selector: 'app-style-guide-page',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Guide de style</h1>

    <section class="dev-style-section">
      <h2>Couleurs</h2>
      <p>Ratio de contraste WCAG calculé contre le fond et la surface. Un élément d'UI (bordure,
      icône) doit atteindre 3:1 ; un texte normal, 4.5:1.</p>
      <div class="dev-style-token-grid">
        @for (token of colorRows(); track token.cssVar) {
          <div class="dev-style-token-card">
            <div class="dev-style-token-swatch" [style.background]="token.resolvedColor"></div>
            <strong>{{ token.name }}</strong>
            <div><code>{{ token.cssVar }}</code></div>
            <div [class.dev-style-contrast-fail]="token.contrastVsBackground < AA_UI_THRESHOLD">
              vs fond : {{ token.contrastVsBackground | number: '1.2-2' }}:1
            </div>
            <div [class.dev-style-contrast-fail]="token.contrastVsSurface < AA_UI_THRESHOLD">
              vs surface : {{ token.contrastVsSurface | number: '1.2-2' }}:1
            </div>
          </div>
        }
      </div>
    </section>

    <section class="dev-style-section">
      <h2>Typographie</h2>
      <p style="font-size: var(--lp-font-size-xs)">xs — texte fin</p>
      <p style="font-size: var(--lp-font-size-sm)">sm — texte secondaire</p>
      <p style="font-size: var(--lp-font-size-base)">base — texte courant</p>
      <p style="font-size: var(--lp-font-size-lg)">lg — sous-titre</p>
      <p style="font-size: var(--lp-font-size-xl)">xl — titre</p>
      <p style="font-size: var(--lp-font-size-2xl)">2xl — titre principal</p>
    </section>

    <section class="dev-style-section">
      <h2>Boutons (.b-button)</h2>
      <button type="button" class="b-button b-primary">Primaire</button>
      <button type="button" class="b-button b-secondary">Secondaire</button>
      <button type="button" class="b-button b-danger">Danger</button>
      <button type="button" class="b-button b-primary is-disabled" disabled>Désactivé</button>
    </section>

    <section class="dev-style-section">
      <h2>Carte (.card)</h2>
      <article class="card">
        <h3 class="card-title">Titre de carte</h3>
        <div class="card-body">Corps de la carte.</div>
      </article>
      <article class="card card-interactive" tabindex="0" role="button">
        <h3 class="card-title">Carte interactive</h3>
        <div class="card-body">Survolable et focusable.</div>
      </article>
    </section>

    <section class="dev-style-section">
      <h2>Panneau (.panel)</h2>
      <section class="panel panel-padding-md">Panneau standard.</section>
      <section class="panel panel-elevated panel-padding-md">Panneau élevé.</section>
    </section>
  `,
})
export class StyleGuidePage {
  protected readonly AA_UI_THRESHOLD = AA_UI_THRESHOLD;
  protected readonly colorRows = signal<readonly ColorTokenRow[]>([]);

  constructor() {
    // getComputedStyle exige que les styles soient appliqués au DOM — afterNextRender()
    // garantit qu'on est côté navigateur, après le premier rendu.
    afterNextRender(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const background = rootStyle.getPropertyValue('--lp-color-background').trim();
      const surface = rootStyle.getPropertyValue('--lp-color-surface').trim();
      const resolve = (cssVar: string) => {
        const probe = document.createElement('div');
        probe.style.color = `var(${cssVar})`;
        document.body.appendChild(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();
        return resolved;
      };
      const backgroundResolved = resolve('--lp-color-background');
      const surfaceResolved = resolve('--lp-color-surface');

      this.colorRows.set(
        COLOR_TOKENS.map((token) => {
          const resolvedColor = resolve(token.cssVar);
          return {
            ...token,
            resolvedColor,
            contrastVsBackground: contrastRatio(resolvedColor, backgroundResolved),
            contrastVsSurface: contrastRatio(resolvedColor, surfaceResolved),
          };
        }),
      );
      // `background`/`surface` (valeurs brutes de la variable CSS, potentiellement un nom ou un
      // hex non résolu) ne servent qu'à documenter l'intention ci-dessus ; le calcul utilise
      // exclusivement les couleurs résolues par le navigateur (`backgroundResolved`/`surfaceResolved`).
      void background;
      void surface;
    });
  }
}
