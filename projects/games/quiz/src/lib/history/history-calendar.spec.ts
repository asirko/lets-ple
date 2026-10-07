import { describe, it, expect, vi } from 'vitest';
import { localWeekWindows } from './history-calendar';
describe('local calendar', () => {
  it('builds four contiguous Monday weeks including current', () => {
    const { windows } = localWeekWindows(new Date(2026, 9, 7, 15));
    expect(windows).toHaveLength(4);
    expect(windows[3].current).toBe(true);
    windows.forEach((w, i) => {
      expect(new Date(w.startMs).getDay()).toBe(1);
      expect(new Date(w.startMs).getHours()).toBe(0);
      if (i < 3) expect(w.endMs).toBe(windows[i + 1].startMs);
    });
  });
  it('uses calendar days across DST and year boundaries', () => {
    const { windows } = localWeekWindows(new Date(2027, 0, 1));
    expect(new Date(windows[3].startMs).getFullYear()).toBe(2026);
    expect(windows.every((w) => w.endMs > w.startMs)).toBe(true);
  });
});

it('uses 167 and 169 hour weeks across Paris daylight changes', () => {
  vi.stubEnv('TZ', 'Europe/Paris');
  try {
    const march = localWeekWindows(new Date(2026, 2, 29)).windows[3];
    const october = localWeekWindows(new Date(2026, 9, 25)).windows[3];
    expect((march.endMs - march.startMs) / 3600000).toBe(167);
    expect((october.endMs - october.startMs) / 3600000).toBe(169);
  } finally {
    vi.unstubAllEnvs();
  }
});
