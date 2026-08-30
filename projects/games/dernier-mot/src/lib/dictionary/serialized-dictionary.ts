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

export interface SerializedDefinitionEntry {
  readonly normalized: string;
  readonly forms: readonly DefinitionForm[];
}

export interface DictionarySourceManifest {
  readonly name: 'Lexique 4' | 'Wiktionnaire';
  readonly url: string;
  readonly retrievedAt: string;
  readonly license: 'CC-BY-SA-4.0';
  readonly sha256: string;
  readonly creators: readonly string[];
  readonly licenseUrl: string;
  readonly citation?: { readonly text: string; readonly url: string };
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

export interface DictionaryManifest {
  readonly schemaVersion: 1;
  /** Instant de collecte le plus récent parmi les sources, et non heure d'exécution du build. */
  readonly generatedAt: string;
  readonly entryCount: number;
  readonly sources: readonly DictionarySourceManifest[];
  readonly adaptation: {
    readonly license: 'CC-BY-SA-4.0';
    readonly licenseUrl: string;
    readonly notice: string;
  };
}
