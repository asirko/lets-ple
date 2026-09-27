import { Injectable } from '@angular/core';

import { STORAGE_PREFIX as PREFIX, STORAGE_KEYS } from './storage-keys';
const SCHEMA_VERSION = 1;

function isLocalStorageAvailable(): boolean {
  try {
    const probeKey = PREFIX + STORAGE_KEYS.probe;
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
  private useLocalStorage = isLocalStorageAvailable();

  constructor() {
    this.write(STORAGE_KEYS.schemaVersion, SCHEMA_VERSION);
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

  remove(key: string): void {
    const fullKey = PREFIX + key;
    this.memory.delete(fullKey);
    try {
      if (this.useLocalStorage) window.localStorage.removeItem(fullKey);
    } catch {
      this.useLocalStorage = false;
    }
  }

  private getRaw(fullKey: string): string | null {
    if (this.useLocalStorage) {
      try {
        const raw = window.localStorage.getItem(fullKey);
        if (raw === null) this.memory.delete(fullKey);
        else this.memory.set(fullKey, raw);
        return raw;
      } catch {
        this.useLocalStorage = false;
      }
    }
    return this.memory.get(fullKey) ?? null;
  }

  private setRaw(fullKey: string, raw: string): void {
    this.memory.set(fullKey, raw);
    try {
      if (this.useLocalStorage) window.localStorage.setItem(fullKey, raw);
    } catch {
      this.useLocalStorage = false;
    }
  }
}
