import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeFactors, computeScore, toTier } from './difficulty';
import type { Quote } from './quote-schema';

const ACCENT_MODE = 'distinct';

function scoreQuote(quote: Quote): Quote {
  const factors = computeFactors(quote.text, ACCENT_MODE);
  const score = computeScore(factors, quote.notoriety);
  return {
    ...quote,
    difficulty: { score, tier: toTier(score), factors },
  };
}

function scoreCorpus(dir: string): void {
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const path = join(dir, file);
    const quotes: Quote[] = JSON.parse(readFileSync(path, 'utf8'));
    const scored = quotes.map(scoreQuote);
    writeFileSync(path, JSON.stringify(scored, null, 2) + '\n');
    for (const quote of scored) {
      console.log(`${quote.id}: score ${quote.difficulty!.score.toFixed(1)} — palier ${quote.difficulty!.tier}`);
    }
  }
}

function isMainModule(): boolean {
  return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  scoreCorpus(join(process.cwd(), 'content', 'quotes'));
}
