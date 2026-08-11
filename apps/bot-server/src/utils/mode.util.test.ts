import { describe, expect, it } from 'vitest';
import { modeSign, progress } from './mode.util';

describe('modeSign', () => {
  it('is +1 for grow', () => {
    expect(modeSign('grow')).toBe(1);
  });

  it('is -1 for drill', () => {
    expect(modeSign('drill')).toBe(-1);
  });
});

describe('progress', () => {
  it('equals value for grow', () => {
    expect(progress(500, 'grow')).toBe(500);
    expect(progress(-500, 'grow')).toBe(-500);
  });

  it('equals -value for drill', () => {
    expect(progress(500, 'drill')).toBe(-500);
    expect(progress(-500, 'drill')).toBe(500);
  });

  it('is 0 at 0 for both modes', () => {
    expect(progress(0, 'grow')).toBeCloseTo(0);
    expect(progress(0, 'drill')).toBeCloseTo(0);
  });
});
