import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '@lets-ple/game-core';

@Component({
  selector: 'lp-word-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="dernier-mot-word-progress"
      [attr.aria-label]="text('dernierMot.word.label')"
      aria-live="polite"
    >
      <div class="dernier-mot-word-sequence" [attr.aria-label]="sequenceLabel()">
        @if (letters().length === 0) {
          <span class="dernier-mot-word-empty" aria-hidden="true">—</span>
        }
        @for (letter of letters(); track $index; let last = $last) {
          <span class="dernier-mot-word-letter" [class.is-newest]="last">{{ letter }}</span>
        }
        @if (attemptedLetter()) {
          <span class="dernier-mot-word-letter is-attempted">{{ attemptedLetter() }}</span>
        }
      </div>

      @if (prefix() === '') {
        <p class="dernier-mot-word-status">{{ text('dernierMot.word.firstLetter') }}</p>
      } @else if (isWord() && continuationCount() === 0) {
        <p class="dernier-mot-word-status is-terminal">{{ text('dernierMot.word.terminal') }}</p>
      } @else {
        <p class="dernier-mot-word-status">
          @if (isWord()) {
            <strong>{{ text('dernierMot.word.valid') }}</strong
            ><span aria-hidden="true"> · </span>
          }
          {{ continuationCount() }}
          {{
            text(
              continuationCount() === 1
                ? 'dernierMot.word.continuationOne'
                : 'dernierMot.word.continuationMany'
            )
          }}
        </p>
      }
    </section>
  `,
})
export class LpWordProgress {
  readonly prefix = input('');
  readonly isWord = input(false);
  readonly continuationCount = input(0);
  readonly attemptedLetter = input('');
  private readonly i18n = inject(I18nService);

  protected readonly letters = computed(() => Array.from(this.prefix()));
  protected readonly sequenceLabel = computed(() => {
    const accepted =
      this.prefix() === ''
        ? this.text('dernierMot.word.emptyPrefix')
        : this.text('dernierMot.word.prefix', { prefix: this.prefix() });
    return this.attemptedLetter() === ''
      ? accepted
      : this.text('dernierMot.word.attemptedLetter', {
          prefix: accepted,
          letter: this.attemptedLetter(),
        });
  });

  protected text(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
