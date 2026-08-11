import { describe, expect, it } from 'vitest';
import { buildClampedValueUpdate } from './value-update.util';

describe('buildClampedValueUpdate', () => {
  it('clamps toward 0 from below for grow (max with 0)', () => {
    const pipeline = buildClampedValueUpdate(-10, 'grow');
    const setNext = pipeline[0] as { $set: { __next: unknown } };
    expect(setNext.$set.__next).toEqual({ $round: [{ $max: [0, { $add: ['$value', -10] }] }, 2] });
  });

  it('clamps toward 0 from above for drill (min with 0)', () => {
    const pipeline = buildClampedValueUpdate(10, 'drill');
    const setNext = pipeline[0] as { $set: { __next: unknown } };
    expect(setNext.$set.__next).toEqual({ $round: [{ $min: [0, { $add: ['$value', 10] }] }, 2] });
  });

  it('rounds value, season_growth, round_growth to 2 decimals', () => {
    const pipeline = buildClampedValueUpdate(5, 'grow');
    const setFields = pipeline[2] as { $set: Record<string, unknown> };
    expect(setFields.$set.value).toBe('$__next');
    expect(setFields.$set.season_growth).toEqual({
      $round: [{ $add: ['$season_growth', '$__applied'] }, 2],
    });
    expect(setFields.$set.round_growth).toEqual({
      $round: [{ $add: ['$round_growth', '$__applied'] }, 2],
    });
  });

  it('takes round_best_delta as max of previous and applied progress', () => {
    const growPipeline = buildClampedValueUpdate(5, 'grow');
    const growSet = growPipeline[2] as { $set: Record<string, unknown> };
    expect(growSet.$set.round_best_delta).toEqual({
      $max: ['$round_best_delta', { $multiply: ['$__applied', 1] }],
    });

    const drillPipeline = buildClampedValueUpdate(-5, 'drill');
    const drillSet = drillPipeline[2] as { $set: Record<string, unknown> };
    expect(drillSet.$set.round_best_delta).toEqual({
      $max: ['$round_best_delta', { $multiply: ['$__applied', -1] }],
    });
  });

  it('merges extraSet into the final $set stage', () => {
    const pipeline = buildClampedValueUpdate(5, 'grow', { streak_current: 3 });
    const setFields = pipeline[2] as { $set: Record<string, unknown> };
    expect(setFields.$set.streak_current).toBe(3);
  });

  it('cleans up temporary fields with $unset', () => {
    const pipeline = buildClampedValueUpdate(5, 'grow');
    expect(pipeline[3]).toEqual({ $unset: ['__next', '__applied'] });
  });
});
