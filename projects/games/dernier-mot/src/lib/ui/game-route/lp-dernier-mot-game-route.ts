import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { I18nService, StorageService } from '@lets-ple/game-core';
import { DictionaryService } from '../../dictionary/dictionary.service';
import type { DictionaryManifest } from '../../dictionary/serialized-dictionary';
import { DernierMotGameStore } from '../../store/game.store';
import { LpDernierMotGamePage } from '../game-page/lp-dernier-mot-game-page';
import { LpDernierMotSetupPage } from '../setup-page/lp-dernier-mot-setup-page';

type LoadStatus = 'loading' | 'ready' | 'error';

/** Point d'entrée routé : charge les données puis choisit reprise, setup ou partie. */
@Component({
  selector: 'lp-dernier-mot-game-route',
  imports: [LpDernierMotGamePage, LpDernierMotSetupPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../styles/_dernier-mot.scss'],
  template: `
    @switch (status()) {
      @case ('loading') {
        <main aria-live="polite">
          <p>{{ text('dernierMot.route.loading') }}</p>
        </main>
      }
      @case ('error') {
        <main role="alert">
          <h1>{{ text('dernierMot.title') }}</h1>
          <p>{{ text('dernierMot.route.error') }}</p>
          <button type="button" class="b-button b-primary" data-retry (click)="loadDictionary()">
            {{ text('dernierMot.route.retry') }}
          </button>
        </main>
      }
      @case ('ready') {
        @if (store(); as gameStore) {
          <lp-dernier-mot-game-page
            [store]="gameStore"
            [dictionary]="dictionary"
            [announceFirstPlayer]="announceFirstPlayer()"
            (restartRequested)="showSetup()"
          />
        } @else {
          <lp-dernier-mot-setup-page
            [manifest]="dictionaryManifest()"
            (playersSubmitted)="startGame($event)"
          />
        }
      }
    }
  `,
})
export class LpDernierMotGameRoute {
  protected readonly dictionary = inject(DictionaryService);
  private readonly storage = inject(StorageService);
  private readonly i18n = inject(I18nService);

  protected readonly status = signal<LoadStatus>('loading');
  protected readonly store = signal<DernierMotGameStore | null>(null);
  protected readonly dictionaryManifest = signal<DictionaryManifest | null>(null);
  protected readonly announceFirstPlayer = signal(false);

  constructor() {
    void this.loadDictionary();
  }

  protected async loadDictionary(): Promise<void> {
    this.status.set('loading');
    this.dictionaryManifest.set(null);
    try {
      const [, manifest] = await Promise.all([this.dictionary.load(), this.dictionary.manifest()]);
      this.dictionaryManifest.set(manifest);
      const resumed = DernierMotGameStore.resume(this.dictionary, this.storage);
      this.store.set(resumed.state() ? resumed : null);
      this.announceFirstPlayer.set(false);
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }

  protected startGame(names: readonly string[]): void {
    this.store.set(DernierMotGameStore.create(names, this.dictionary, this.storage));
    this.announceFirstPlayer.set(true);
  }

  protected showSetup(): void {
    this.store.set(null);
    this.announceFirstPlayer.set(false);
  }

  protected text(key: string): string {
    return this.i18n.t(key);
  }
}
