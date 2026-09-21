import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Chaque cœur représente une vie. Une croix superposée indique une vie perdue, sans dépendre
 * uniquement de la couleur ; le libellé accessible donne les vies restantes et les erreurs.
 */
@Component({
  selector: 'lp-error-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="crypto-error-counter" role="group" [attr.aria-label]="label()">
      @for (i of dots(); track i) {
        <span
          class="crypto-error-heart"
          [class.is-lost]="i < errors()"
          aria-hidden="true"
        >♥@if (i < errors()) {<span class="crypto-error-cross">✕</span>}</span>
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
    const remaining = Math.max(0, this.maxErrors() - errors);
    return `${remaining} vie${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}, ${errors} erreur${errors > 1 ? 's' : ''} sur ${this.maxErrors()}`;
  });
}
