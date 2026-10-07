import type { WeekWindow } from '../domain/knowledge-stats/statistics';
export function localWeekWindows(now: Date): { windows: readonly WeekWindow[]; timeZone: string } {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const boundaries = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + (i - 3) * 7);
    return d.getTime();
  });
  return {
    windows: boundaries
      .slice(0, 4)
      .map((startMs, i) => ({ startMs, endMs: boundaries[i + 1], current: i === 3 })),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
