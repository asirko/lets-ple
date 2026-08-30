import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { DictionaryPort, PrefixLookup } from '../domain/dictionary';
import { normalizeWord } from '../domain/normalize-word';
import type {
  DefinitionForm,
  DictionaryManifest,
  SerializedDefinitionEntry,
  SerializedPrefixIndex,
  SerializedPrefixNode,
} from './serialized-dictionary';

const DICTIONARY_PATH = '/content/dictionaries/dernier-mot';

@Injectable({ providedIn: 'root' })
export class DictionaryService implements DictionaryPort {
  private readonly http = inject(HttpClient);
  private readonly definitionChunks = new Map<
    string,
    Promise<ReadonlyMap<string, readonly DefinitionForm[]>>
  >();
  private index: SerializedPrefixIndex | undefined;
  private loadPromise: Promise<void> | undefined;
  private manifestPromise: Promise<DictionaryManifest> | undefined;

  load(): Promise<void> {
    if (!this.loadPromise) {
      const loading = firstValueFrom(
        this.http.get<SerializedPrefixIndex>(`${DICTIONARY_PATH}/index.json`),
      )
        .then((index) => {
          this.index = index;
        })
        .catch((error: unknown) => {
          if (this.loadPromise === loading) this.loadPromise = undefined;
          throw error;
        });
      this.loadPromise = loading;
    }
    return this.loadPromise;
  }

  manifest(): Promise<DictionaryManifest> {
    if (!this.manifestPromise) {
      const loading = firstValueFrom(
        this.http.get<DictionaryManifest>(`${DICTIONARY_PATH}/manifest.json`),
      ).catch((error: unknown) => {
        if (this.manifestPromise === loading) this.manifestPromise = undefined;
        throw error;
      });
      this.manifestPromise = loading;
    }
    return this.manifestPromise;
  }

  lookup(prefix: string): PrefixLookup {
    const normalized = normalizeWord(prefix);
    const node = this.loadedIndex()[normalized];
    return {
      normalized,
      isWord: node?.isWord ?? false,
      continuationCount: node?.continuationCount ?? 0,
      nextLetters: node?.nextLetters ?? [],
    };
  }

  completions(prefix: string, limit: number): readonly string[] {
    if (limit <= 0) return [];

    const normalized = normalizeWord(prefix);
    const index = this.loadedIndex();
    const words = this.collectWords(normalized, index).filter(
      (entry) => entry.normalized.length > normalized.length,
    );
    return words
      .sort(
        (left, right) =>
          left.normalized.length - right.normalized.length ||
          (right.node.frequency ?? 0) - (left.node.frequency ?? 0) ||
          left.normalized.localeCompare(right.normalized, 'fr-FR'),
      )
      .slice(0, limit)
      .map((entry) => entry.normalized);
  }

  async definitions(word: string): Promise<readonly DefinitionForm[]> {
    const normalized = normalizeWord(word);
    const definitionId = this.loadedIndex()[normalized]?.definitionId;
    if (!definitionId) return [];

    const chunk = await this.loadDefinitionChunk(definitionId[0]);
    return chunk.get(definitionId) ?? [];
  }

  private loadedIndex(): SerializedPrefixIndex {
    if (!this.index) throw new Error('Le dictionnaire doit être chargé avant son utilisation.');
    return this.index;
  }

  private collectWords(
    prefix: string,
    index: SerializedPrefixIndex,
  ): Array<{ readonly normalized: string; readonly node: SerializedPrefixNode }> {
    const node = index[prefix];
    if (!node) return [];

    const words = node.isWord ? [{ normalized: prefix, node }] : [];
    for (const nextLetter of node.nextLetters) {
      words.push(...this.collectWords(`${prefix}${nextLetter}`, index));
    }
    return words;
  }

  private loadDefinitionChunk(
    initial: string,
  ): Promise<ReadonlyMap<string, readonly DefinitionForm[]>> {
    let chunk = this.definitionChunks.get(initial);
    if (!chunk) {
      chunk = firstValueFrom(
        this.http.get<readonly SerializedDefinitionEntry[]>(
          `${DICTIONARY_PATH}/definitions/${initial}.json`,
        ),
      ).then((entries) => new Map(entries.map((entry) => [entry.normalized, entry.forms])));
      this.definitionChunks.set(initial, chunk);
    }
    return chunk;
  }
}
