import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly gameHasHeader = signal(this.isCryptogramme(this.router.url));

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.gameHasHeader.set(this.isCryptogramme(event.urlAfterRedirects));
    });
  }

  private isCryptogramme(url: string): boolean {
    return /^\/cryptogramme(?:[/?#;]|$)/.test(url);
  }
}
