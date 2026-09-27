/** Persistent identifiers: keep existing values stable to preserve saved games. */
export const STORAGE_PREFIX = 'letsple:v1:';
export const STORAGE_KEYS = {
  probe: '__probe__',
  schemaVersion: 'schemaVersion',
  progress: 'progress',
  cryptogrammeActiveGame: 'cryptogramme:activeGame',
  dernierMotActiveMatch: 'dernierMot:activeMatch',
  quizSettings: 'quiz:settings',
} as const;
