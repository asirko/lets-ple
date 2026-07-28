import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Les erreurs, sur un total plafonné. L'état ne passe jamais par la seule couleur : une erreur
 * (✕) et une case restante (○) ont des glyphes distincts, pas seulement des teintes différentes.
 */
@Component({
  selector: 'lp-error-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="crypto-error-counter" role="group" [attr.aria-label]="label()">
      @for (i of dots(); track i) {
        <span
          class="crypto-error-dot"
          [class.crypto-error-dot-active]="i < errors()"
          aria-hidden="true"
        >{{ i < errors() ? '✕' : '○' }}</span>
      }
    </div>
  `,
})
export class LpErrorCounter {
  readonly errors = input.required<number>();
  readonly maxErrors = input(3);

  protected readonly dots = computed(() => Array.from({ length: this.maxErrors() }, (_, i) => i));

  protected readonly label = computed(() => {
    const errors = this.errors();
    return `${errors} erreur${errors > 1 ? 's' : ''} sur ${this.maxErrors()}`;
  });
}
