export type DictionarySourceName = 'Lexique 4' | 'Wiktionnaire';

export interface DictionarySourceInput {
  readonly name: DictionarySourceName;
  readonly url: string;
  readonly retrievedAt: string;
  readonly license: 'CC-BY-SA-4.0';
}

export interface DictionarySource extends DictionarySourceInput {
  readonly sha256: string;
  readonly creators: readonly string[];
  readonly licenseUrl: string;
  readonly citation?: {
    readonly text: string;
    readonly url: string;
  };
  readonly attributionUrl?: string;
  readonly articleUrlTemplate?: string;
  readonly contributorsUrlTemplate?: string;
  readonly extractor?: {
    readonly name: 'Wiktextract';
    readonly creator: 'Tatu Ylonen';
    readonly url: string;
    readonly license: 'MIT';
    readonly licenseUrl: string;
  };
}

export interface DictionaryAdaptation {
  readonly license: 'CC-BY-SA-4.0';
  readonly licenseUrl: string;
  readonly notice: string;
}

export interface DictionaryManifest {
  readonly schemaVersion: 1;
  /** Instant de collecte le plus récent parmi les sources, et non heure d'exécution du build. */
  readonly generatedAt: string;
  readonly entryCount: number;
  readonly sources: readonly DictionarySource[];
  readonly adaptation: DictionaryAdaptation;
}

export interface SerializedPrefixNode {
  readonly isWord: boolean;
  readonly continuationCount: number;
  readonly nextLetters: readonly string[];
  readonly frequency?: number;
  readonly definitionId?: string;
}

export type SerializedPrefixIndex = Readonly<Record<string, SerializedPrefixNode>>;

export interface DefinitionForm {
  readonly spelling: string;
  readonly glosses: readonly string[];
}

export interface DefinitionEntry {
  readonly normalized: string;
  readonly forms: readonly DefinitionForm[];
}

export interface LexiqueEntry {
  readonly spelling: string;
  readonly lemma: string;
  readonly category: string;
  readonly gender: string;
  readonly number: string;
  readonly frequency: number;
}

export interface WiktionaryEntry {
  readonly word: string;
  readonly pos: string;
  readonly senses: readonly WiktionarySense[];
}

export interface WiktionarySense {
  readonly glosses: readonly string[];
  readonly tags: readonly string[];
  readonly formOf: readonly string[];
}

export interface ValidationFile {
  readonly name: string;
  readonly bytes: number;
}

export interface DictionaryValidationReport {
  readonly entryCount: number;
  readonly files: readonly ValidationFile[];
}
