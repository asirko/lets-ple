import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { I18nService } from '@lets-ple/game-core';

@Component({
  selector: 'lp-player-setup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dernier-mot-player-setup" aria-labelledby="dernier-mot-setup-title">
      <div class="dernier-mot-section-heading">
        <p class="dernier-mot-eyebrow">{{ text('dernierMot.setup.eyebrow') }}</p>
        <h1 id="dernier-mot-setup-title">{{ text('dernierMot.setup.title') }}</h1>
        <p>{{ text('dernierMot.setup.instruction') }}</p>
      </div>

      @if (allNames().length > 0) {
        <ol
          class="dernier-mot-player-list"
          [attr.aria-label]="text('dernierMot.setup.playersLabel')"
        >
          @for (name of allNames(); track $index) {
            <li>
              <span>{{ name }}</span>
            </li>
          }
        </ol>
      } @else {
        <p class="dernier-mot-empty">{{ text('dernierMot.setup.empty') }}</p>
      }

      <div class="dernier-mot-name-entry">
        <label for="dernier-mot-player-name">{{ text('dernierMot.setup.nameLabel') }}</label>
        <input
          id="dernier-mot-player-name"
          data-player-name
          type="text"
          autocomplete="nickname"
          [value]="draftName()"
          [attr.aria-invalid]="duplicateName() ? 'true' : null"
          [attr.aria-describedby]="duplicateName() ? 'dernier-mot-name-error' : null"
          (input)="updateDraft($event)"
          (keydown.enter)="addPlayer()"
        />
        @if (duplicateName()) {
          <p id="dernier-mot-name-error" class="dernier-mot-form-error" role="alert">
            {{ text('dernierMot.setup.duplicate') }}
          </p>
        }
      </div>

      <div class="dernier-mot-setup-actions">
        <button
          type="button"
          class="b-button b-secondary"
          data-add-player
          [class.is-disabled]="!canAdd()"
          [disabled]="!canAdd()"
          (click)="addPlayer()"
        >
          {{ text('dernierMot.setup.add') }}
        </button>
        <button
          type="button"
          class="b-button b-primary"
          data-start-game
          [class.is-disabled]="!canStart()"
          [disabled]="!canStart()"
          (click)="submitPlayers()"
        >
          {{ text('dernierMot.setup.start') }}
        </button>
      </div>
    </section>
  `,
})
export class LpPlayerSetup {
  readonly names = input<readonly string[]>([]);
  readonly playersSubmitted = output<readonly string[]>();
  private readonly i18n = inject(I18nService);

  protected readonly draftName = signal('');
  private readonly addedNames = signal<readonly string[]>([]);
  protected readonly allNames = computed(() => [...this.names(), ...this.addedNames()]);
  protected readonly duplicateName = computed(() => {
    const candidate = this.draftName().trim().toLocaleLowerCase('fr');
    return (
      candidate !== '' &&
      this.allNames().some((name) => name.trim().toLocaleLowerCase('fr') === candidate)
    );
  });
  protected readonly canAdd = computed(
    () => this.draftName().trim() !== '' && !this.duplicateName(),
  );
  protected readonly canStart = computed(() => {
    if (this.duplicateName()) return false;
    return this.allNames().length + (this.draftName().trim() === '' ? 0 : 1) >= 2;
  });

  protected updateDraft(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  protected addPlayer(): void {
    if (!this.canAdd()) return;
    this.addedNames.update((names) => [...names, this.draftName().trim()]);
    this.draftName.set('');
  }

  protected submitPlayers(): void {
    if (!this.canStart()) return;
    const draft = this.draftName().trim();
    this.playersSubmitted.emit(draft === '' ? this.allNames() : [...this.allNames(), draft]);
  }

  protected text(key: string): string {
    return this.i18n.t(key);
  }
}
