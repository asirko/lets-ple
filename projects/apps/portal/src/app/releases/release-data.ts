import { InjectionToken } from '@angular/core';
import type { ReleaseNotes } from '@lets-ple/ui';
import { version } from '../../../../../../package.json';
import releases from './releases.json';

export interface ReleaseData {
  readonly version: string;
  readonly releases: readonly ReleaseNotes[];
}
/** Both values are part of the running bundle, including while offline. */
export const RELEASE_DATA = new InjectionToken<ReleaseData>('RELEASE_DATA', {
  providedIn: 'root',
  factory: () => ({ version, releases }),
});

export function isVersion(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) &&
    value.split('.').every((part) => Number.isSafeInteger(Number(part)))
  );
}
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number),
    right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}
