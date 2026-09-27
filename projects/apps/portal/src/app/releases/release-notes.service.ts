import { computed, inject, Injectable, signal } from '@angular/core';
import { StorageService, STORAGE_KEYS } from '@lets-ple/game-core';
import { compareVersions, isVersion, RELEASE_DATA } from './release-data';

@Injectable({ providedIn: 'root' })
export class ReleaseNotesService {
  private readonly storage = inject(StorageService);
  private readonly data = inject(RELEASE_DATA);
  private readonly readVersion = signal(this.readMarker());
  readonly pending = computed(() => {
    const marker = this.readVersion();
    return this.data.releases.filter(
      (release) =>
        compareVersions(release.version, this.data.version) <= 0 &&
        (marker
          ? compareVersions(release.version, marker) > 0
          : release.version === this.data.version) &&
        release.features.length + release.fixes.length + release.breaking.length > 0,
    );
  });

  acknowledge(): void {
    const latest = this.readMarker();
    const marker =
      latest && compareVersions(latest, this.data.version) > 0 ? latest : this.data.version;
    this.storage.write(STORAGE_KEYS.releaseNotesRead, marker);
    this.readVersion.set(marker);
  }

  private readMarker(): string | null {
    const value = this.storage.read<unknown>(STORAGE_KEYS.releaseNotesRead, null);
    return isVersion(value) ? value : null;
  }
}
