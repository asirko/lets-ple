import type { Metrics } from './statistics';
export type KnowledgeLevel = 'none' | 'insufficient' | 'low' | 'medium' | 'high';
export function classifyKnowledge(m: Metrics): KnowledgeLevel {
  if (!m.count) return 'none';
  if (m.count < 5) return 'insufficient';
  return m.averageScore! < 2 ? 'low' : m.averageScore! < 3.5 ? 'medium' : 'high';
}
