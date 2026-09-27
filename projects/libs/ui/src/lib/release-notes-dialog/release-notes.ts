/** Presentation contract: no dependency on Node or portal services. */
export interface ReleaseNotes {
  readonly version: string;
  readonly date: string;
  readonly features: readonly string[];
  readonly fixes: readonly string[];
  readonly breaking: readonly string[];
}
