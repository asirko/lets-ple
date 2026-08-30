import { normalizeWord } from './normalize-word';

export interface PrefixLookup {
  readonly normalized: string;
  readonly isWord: boolean;
  readonly continuationCount: number;
  readonly nextLetters: readonly string[];
}

export interface DictionaryPort {
  lookup(prefix: string): PrefixLookup;
  completions(prefix: string, limit: number): readonly string[];
}

export type DictionaryEntry = string | { readonly normalized: string; readonly frequency: number };

interface WordRecord {
  readonly normalized: string;
  readonly frequency: number;
}

/** Petit adaptateur déterministe destiné aux tests et au moteur pur. */
export function createMemoryDictionary(entries: readonly DictionaryEntry[]): DictionaryPort {
  const records = new Map<string, WordRecord>();
  for (const entry of entries) {
    const normalized = normalizeWord(typeof entry === 'string' ? entry : entry.normalized);
    const frequency = typeof entry === 'string' ? 0 : entry.frequency;
    const previous = records.get(normalized);
    if (!previous || frequency > previous.frequency)
      records.set(normalized, { normalized, frequency });
  }

  const words = [...records.values()];
  return {
    lookup(prefix: string): PrefixLookup {
      const normalized = normalizeWord(prefix);
      const continuations = words.filter(
        (word) =>
          word.normalized.startsWith(normalized) && word.normalized.length > normalized.length,
      );
      const nextLetters = [
        ...new Set(continuations.map((word) => word.normalized[normalized.length])),
      ].sort();
      return {
        normalized,
        isWord: records.has(normalized),
        continuationCount: continuations.length,
        nextLetters,
      };
    },

    completions(prefix: string, limit: number): readonly string[] {
      if (limit <= 0) return [];
      const normalized = normalizeWord(prefix);
      return words
        .filter(
          (word) =>
            word.normalized.startsWith(normalized) && word.normalized.length > normalized.length,
        )
        .sort(
          (left, right) =>
            left.normalized.length - right.normalized.length ||
            right.frequency - left.frequency ||
            left.normalized.localeCompare(right.normalized, 'fr-FR'),
        )
        .slice(0, limit)
        .map((word) => word.normalized);
    },
  };
}
