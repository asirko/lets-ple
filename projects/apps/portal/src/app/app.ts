import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReleaseDialogs } from './releases/release-dialogs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ReleaseDialogs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  protected readonly gameHasHeader = signal(this.hasOwnHeader(this.router.url));

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd)
        this.gameHasHeader.set(this.hasOwnHeader(event.urlAfterRedirects));
    });
  }

  private hasOwnHeader(url: string): boolean {
    return /^\/(?:cryptogramme|quiz)(?:[/?#;]|$)/.test(url);
  }
}
