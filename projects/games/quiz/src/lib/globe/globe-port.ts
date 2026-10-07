import type { KnowledgeLevel } from '../domain/knowledge-stats/knowledge-level';
export interface GlobeHandle {
  update(
    levels: ReadonlyMap<string, KnowledgeLevel>,
    selectedIso3: string | null,
    continent: string | null,
  ): void;
  rotate(horizontal: number, vertical: number): void;
  zoom(delta: number): void;
  reset(): void;
  setEngaged(value: boolean): void;
  dispose(): void;
}
export const GLOBE_COLORS = {
  none: 0x88909b,
  insufficient: 0xbfc6d0,
  low: 0xc45665,
  medium: 0xe1b760,
  high: 0x438f88,
};
