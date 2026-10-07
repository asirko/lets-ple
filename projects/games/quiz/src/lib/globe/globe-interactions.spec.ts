import { describe, it, expect } from 'vitest';
import { isTap } from './globe-interactions';
describe('globe selection', () => {
  it('distinguishes drag from tap', () => {
    expect(isTap([10, 10], [12, 11])).toBe(true);
    expect(isTap([10, 10], [10, 30])).toBe(false);
  });
});
