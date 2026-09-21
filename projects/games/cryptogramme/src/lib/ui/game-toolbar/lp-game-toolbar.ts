import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LpDialog } from '@lets-ple/ui';
import { LpCipherTable } from '../cipher-table/lp-cipher-table';
import { LpCryptogramDeck } from '../cryptogram-deck/lp-cryptogram-deck';
import { LpCryptogramHand } from '../cryptogram-hand/lp-cryptogram-hand';
import { LpErrorCounter } from '../error-counter/lp-error-counter';

/** Commandes de présentation : les changements de partie restent à la charge de l'écran. */
@Component({
  selector: 'lp-game-toolbar',
  imports: [RouterLink, LpDialog, LpCipherTable, LpCryptogramDeck, LpCryptogramHand, LpErrorCounter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'crypto-toolbar', '(document:click)': 'onDocumentClick($event)' },
  template: `
    <div class="crypto-toolbar-heading">
      <a class="crypto-toolbar-back" routerLink="/" aria-label="Retour aux jeux">←</a>
      <div class="crypto-toolbar-title">
        <span class="crypto-toolbar-brand">Let's Plé</span>
        <div class="crypto-toolbar-game-title">
          <h1>Cryptogramme</h1>
          <button type="button" class="crypto-toolbar-help" aria-label="Règles du jeu"
            title="Règles du jeu" (click)="rulesOpen.set(true)"><span aria-hidden="true">?</span></button>
        </div>
      </div>
      <details class="crypto-toolbar-menu" #menu (keydown.escape)="closeMenu(menu)">
        <summary class="crypto-toolbar-trigger" aria-label="Menu du cryptogramme">⋮</summary>
        <div class="crypto-toolbar-dropdown">
          <button type="button" class="crypto-toolbar-action" data-action="restart"
            (click)="restart.emit(); closeMenu(menu)">Recommencer cette citation</button>
          <button type="button" class="crypto-toolbar-action" data-action="new-game"
            (click)="closeMenu(menu); newGame.emit()">Abandonner et changer de citation</button>
          <button type="button" class="crypto-toolbar-action" data-action="settings"
            (click)="closeMenu(menu); settingsOpen.set(true)">Paramètres</button>
          <button type="button" class="crypto-toolbar-action" data-action="rules"
            (click)="closeMenu(menu); rulesOpen.set(true)">Règles du jeu</button>
        </div>
      </details>
    </div>
    @if (filterError()) {
      <p class="crypto-toolbar-error" role="alert">{{ filterError() }}</p>
    }
    <div class="crypto-toolbar-bar">
      <lp-error-counter [errors]="errors()" [maxErrors]="maxErrors()" />
      <div class="crypto-toolbar-cards">
        <lp-cryptogram-hand [hand]="hand()" (playTop)="playTop.emit()" />
        <lp-cryptogram-deck [remaining]="remaining()" [handFull]="handFull()" (draw)="draw.emit()" />
      </div>
    </div>
    <div class="crypto-toolbar-cipher" aria-label="Correspondance des lettres">
      <lp-cipher-table [known]="known()" />
    </div>
    <lp-dialog [open]="rulesOpen()" title="Règles du jeu" (dismissed)="rulesOpen.set(false)">
      <div lpDialogBody>
        <p>Retrouvez la citation : chaque numéro représente une lettre. Un même numéro correspond toujours à la même lettre ; les accents comptent comme des lettres distinctes. Quelques lettres sont offertes au départ.</p>
        <ol>
          <li>Cliquez sur la pioche à droite pour tirer une carte. Vous pouvez garder jusqu’à cinq cartes en main.</li>
          <li>Seule la dernière carte tirée, mise en évidence, est active. Sélectionnez une case vide, puis cliquez sur cette carte pour la jouer, ou double-cliquez directement sur la case.</li>
          <li>Une bonne réponse remplit la case et ajoute la lettre au tableau des correspondances. Chaque carte remplit une seule case.</li>
        </ol>
        <p>Une mauvaise réponse coûte une vie et laisse la carte en main. Après {{ maxErrors() }} erreurs, la partie est perdue. Une main pleine empêche de piocher : jouez la carte active pour libérer une place.</p>
        <p>Dès que toutes les correspondances sont trouvées, une modale vous félicite. Fermez-la pour remplir automatiquement les cases restantes et terminer la partie.</p>
        <p>Le menu permet de recommencer la même citation avec un nouveau chiffrement, de changer de citation ou de régler sa longueur dans les paramètres. Votre partie est sauvegardée automatiquement sur cet appareil pour reprendre après un rafraîchissement.</p>
      </div>
      <button lpDialogActions type="button" class="b-button b-primary" (click)="rulesOpen.set(false)">Compris</button>
    </lp-dialog>
    <lp-dialog [open]="settingsOpen()" title="Paramètres du cryptogramme" (dismissed)="settingsOpen.set(false)">
      <div lpDialogBody>
        <fieldset class="crypto-toolbar-filters">
          <legend>Longueur de la prochaine citation</legend>
          <p class="crypto-toolbar-hint">Nombre de lettres, hors espaces et ponctuation. Ces limites s'appliqueront à la prochaine citation.</p>
          <div class="crypto-toolbar-bounds">
            <label>Minimum
              <input name="minLetters" type="number" min="1" step="1" placeholder="Sans limite"
                [value]="selectedMin() ?? ''" (input)="setMinimum(numberValue($event))" />
            </label>
            <label>Maximum
              <input name="maxLetters" type="number" min="1" step="1" placeholder="Sans limite"
                [value]="selectedMax() ?? ''" (input)="setMaximum(numberValue($event))" />
            </label>
          </div>
          <div class="crypto-toolbar-range" [style.--range-start]="rangeStart() + '%'" [style.--range-end]="rangeEnd() + '%'">
            <input name="minimumRange" type="range" aria-label="Nombre minimum de lettres"
              [min]="minAvailable()" [max]="maxAvailable()" step="1" [value]="rangeMinimum()"
              [class.is-uppermost]="rangeMinimum() === maxAvailable()"
              [attr.aria-valuemax]="rangeMaximum()" (input)="changeRange($event, 'minimum')" />
            <input name="maximumRange" type="range" aria-label="Nombre maximum de lettres"
              [min]="minAvailable()" [max]="maxAvailable()" step="1" [value]="rangeMaximum()"
              [attr.aria-valuemin]="rangeMinimum()" (input)="changeRange($event, 'maximum')" />
          </div>
          <p class="crypto-toolbar-range-value">De {{ rangeMinimum() }} à {{ rangeMaximum() }} lettres</p>
          @if (filterError()) {
            <p class="crypto-toolbar-error" role="alert">{{ filterError() }}</p>
          }
        </fieldset>
      </div>
      <button lpDialogActions type="button" class="b-button b-primary" (click)="settingsOpen.set(false)">Terminer</button>
    </lp-dialog>
  `,
})
export class LpGameToolbar {
  private readonly menuElement = viewChild<ElementRef<HTMLDetailsElement>>('menu');
  readonly known = input.required<ReadonlyMap<number, string>>();
  readonly errors = input.required<number>();
  readonly maxErrors = input.required<number>();
  readonly remaining = input.required<number>();
  readonly handFull = input(false);
  readonly hand = input.required<readonly string[]>();
  readonly minLetters = input<number | null>(null);
  readonly maxLetters = input<number | null>(null);
  readonly minAvailable = input(1);
  readonly maxAvailable = input(500);
  readonly filterError = input<string | null>(null);
  readonly draw = output<void>();
  readonly playTop = output<void>();
  readonly restart = output<void>();
  readonly newGame = output<void>();
  readonly minLettersChange = output<number | null>();
  readonly maxLettersChange = output<number | null>();
  readonly heightChange = output<number>();
  protected readonly settingsOpen = signal(false);
  protected readonly rulesOpen = signal(false);
  protected readonly selectedMin = linkedSignal(() => this.minLetters());
  protected readonly selectedMax = linkedSignal(() => this.maxLetters());
  protected readonly rangeMaximum = computed(() => this.bounded(this.selectedMax(), this.maxAvailable()));
  protected readonly rangeMinimum = computed(() => Math.min(this.rangeMaximum(), this.bounded(this.selectedMin(), this.minAvailable())));
  protected readonly rangeStart = computed(() => this.rangePercent(this.rangeMinimum()));
  protected readonly rangeEnd = computed(() => this.rangePercent(this.rangeMaximum()));

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    let observer: ResizeObserver | undefined;
    let previousHeight = -1;
    const measureHeight = () => {
      const height = Math.ceil(host.getBoundingClientRect().height);
      if (height !== previousHeight) {
        previousHeight = height;
        this.heightChange.emit(height);
      }
    };
    afterNextRender({ read: () => {
      measureHeight();
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(measureHeight);
        observer.observe(host);
      }
    } });
    destroyRef.onDestroy(() => observer?.disconnect());
  }

  protected numberValue(event: Event): number | null {
    const field = event.target as HTMLInputElement;
    return field.value === '' ? null : field.valueAsNumber;
  }

  protected setMinimum(value: number | null): void {
    this.selectedMin.set(value);
    this.minLettersChange.emit(value);
  }

  protected setMaximum(value: number | null): void {
    this.selectedMax.set(value);
    this.maxLettersChange.emit(value);
  }

  protected changeRange(event: Event, handle: 'minimum' | 'maximum'): void {
    const field = event.target as HTMLInputElement;
    if (handle === 'minimum') {
      const value = Math.min(field.valueAsNumber, this.rangeMaximum());
      this.setMinimum(value);
      field.value = String(value);
    } else {
      const value = Math.max(field.valueAsNumber, this.rangeMinimum());
      this.setMaximum(value);
      field.value = String(value);
    }
  }

  private bounded(value: number | null, fallback: number): number {
    return Math.max(this.minAvailable(), Math.min(this.maxAvailable(), value !== null && Number.isFinite(value) ? value : fallback));
  }

  private rangePercent(value: number): number {
    return this.maxAvailable() === this.minAvailable() ? 0 : 100 * (value - this.minAvailable()) / (this.maxAvailable() - this.minAvailable());
  }

  protected closeMenu(menu: HTMLDetailsElement): void {
    menu.open = false;
    menu.querySelector('summary')?.focus();
  }

  protected onDocumentClick(event: MouseEvent): void {
    const menu = this.menuElement()?.nativeElement;
    if (menu?.open && !event.composedPath().includes(menu)) menu.open = false;
  }
}
