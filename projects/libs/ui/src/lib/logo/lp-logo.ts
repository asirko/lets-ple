import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type LpLogoVariant = 'mark' | 'full';
export type LpLogoSize = 'sm' | 'md' | 'lg';

/**
 * Logo de Let's Plé : la pastille « pé » (`mark`) seule, ou accompagnée du mot-symbole (`full`).
 * Le dessin de la pastille (cercle + texte, viewBox 64) est la source unique recopiée dans les
 * icônes statiques et l'écran de démarrage.
 */
@Component({
  selector: 'lp-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo" [class]="sizeClass()">
      <!-- Tracé autonome (géométrie et typographie en attributs SVG) : recopié tel quel dans les
           icônes statiques et l'écran de démarrage, où les fills sont remplacés par les valeurs
           hex des tokens. Dans le composant, les fills viennent des classes CSS (tokens). -->
      <svg
        class="logo-mark"
        viewBox="0 0 64 64"
        [attr.role]="variant() === 'mark' ? 'img' : null"
        [attr.aria-label]="variant() === 'mark' ? 'Let’s Plé' : null"
        [attr.aria-hidden]="variant() === 'full' ? 'true' : null"
      >
        <circle class="logo-mark-disc" cx="32" cy="32" r="32" />
        <text
          class="logo-mark-text"
          x="30"
          y="43"
          text-anchor="middle"
          font-family="'Segoe UI', system-ui, -apple-system, sans-serif"
          font-size="36"
          font-weight="700"
          letter-spacing="-3"
        >p<tspan dy="-4">é</tspan></text>
      </svg>
      @if (variant() === 'full') {
        <span class="logo-wordmark">let’s plé<span class="logo-period">.</span></span>
      }
    </span>
  `,
})
export class LpLogo {
  readonly variant = input<LpLogoVariant>('full');
  readonly size = input<LpLogoSize>('md');
  protected readonly sizeClass = computed(() => `logo-${this.size()}`);
}
