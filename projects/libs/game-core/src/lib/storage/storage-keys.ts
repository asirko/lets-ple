/** Persistent identifiers: keep existing values stable to preserve saved games. */
export const STORAGE_PREFIX = 'letsple:v1:';
export const STORAGE_KEYS = {
  probe: '__probe__',
  schemaVersion: 'schemaVersion',
  progress: 'progress',
  cryptogrammeActiveGame: 'cryptogramme:activeGame',
  dernierMotActiveMatch: 'dernierMot:activeMatch',
  quizSettings: 'quiz:settings',
  releaseNotesRead: 'portal:releaseNotesRead',
} as const;

/** Dedicated IndexedDB database; independent of localStorage schema versions. */
export const QUIZ_HISTORY_DATABASE = 'letsple:quiz:history';

/** Cross-tab notification only; never contains answer history. */
export const QUIZ_HISTORY_HINT = 'letsple:v1:quiz:history-hint';
