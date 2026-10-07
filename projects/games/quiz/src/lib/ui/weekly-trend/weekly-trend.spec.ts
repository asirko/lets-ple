import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LpWeeklyTrend } from './weekly-trend';
import { EMPTY_METRICS } from '../../domain/knowledge-stats/statistics';
describe('missing weekly observations', () => {
  it('does not interpolate through a missing week', () => {
    const f = TestBed.createComponent(LpWeeklyTrend);
    f.componentRef.setInput('labels', { na: 'N.A.' });
    f.componentRef.setInput('timeZone', 'Europe/Paris');
    f.componentRef.setInput('weeks', [
      { label: '1', current: false, metrics: { count: 1, averageScore: 5, successRate: 1 } },
      { label: '2', current: false, metrics: EMPTY_METRICS },
      { label: '3', current: false, metrics: { count: 1, averageScore: 3, successRate: 1 } },
      { label: '4', current: true, metrics: EMPTY_METRICS },
    ]);
    f.detectChanges();
    expect(f.componentInstance.segments('averageScore')).toHaveLength(0);
    expect(f.componentInstance.dots('averageScore')).toHaveLength(2);
    expect(f.nativeElement.textContent).toContain('N.A.');
  });
});
