import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  createAccumulator,
  addAnswers,
  finishStatistics,
} from '../src/lib/domain/knowledge-stats/statistics';
import { answerFixture } from '../src/lib/domain/knowledge-stats/fixtures';
import { localWeekWindows } from '../src/lib/history/history-calendar';
async function main() {
  const records = Array.from({ length: 100000 }, () => answerFixture());
  const start = performance.now();
  const acc = createAccumulator(
    { continent: null, mode: null },
    localWeekWindows(new Date()).windows,
  );
  for (let i = 0; i < records.length; i += 1000) addAnswers(acc, records.slice(i, i + 1000));
  const result = finishStatistics(acc);
  const milliseconds = performance.now() - start;
  await mkdir('tmp/knowledge-stats', { recursive: true });
  const report = {
    runtime: process.version,
    platform: process.platform,
    count: result.overall.count,
    pureAggregationMilliseconds: milliseconds,
    mobile: 'not verified',
  };
  await writeFile('tmp/knowledge-stats/calculation-report.json', JSON.stringify(report, null, 2));
  console.log(report);
  if (result.overall.count !== 100000) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
