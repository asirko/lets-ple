import { Injectable } from '@angular/core';

const PREFIX = 'letsple:v1:';
const SCHEMA_VERSION = 1;

function isLocalStorageAvailable(): boolean {
  try {
    const probeKey = `${PREFIX}__probe__`;
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly memory = new Map<string, string>();
  private readonly useLocalStorage = isLocalStorageAvailable();

  constructor() {
    this.write('schemaVersion', SCHEMA_VERSION);
  }

  read<T>(key: string, fallback: T): T {
    const raw = this.getRaw(PREFIX + key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  write<T>(key: string, value: T): void {
    this.setRaw(PREFIX + key, JSON.stringify(value));
  }

  private getRaw(fullKey: string): string | null {
    return this.useLocalStorage ? window.localStorage.getItem(fullKey) : (this.memory.get(fullKey) ?? null);
  }

  private setRaw(fullKey: string, raw: string): void {
    if (this.useLocalStorage) {
      window.localStorage.setItem(fullKey, raw);
    } else {
      this.memory.set(fullKey, raw);
    }
  }
}
