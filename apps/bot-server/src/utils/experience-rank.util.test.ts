import { describe, expect, it } from 'vitest';
import { getExperienceRankLabel } from './experience-rank.util';

describe('getExperienceRankLabel - rank boundaries', () => {
  it.each([
    [-5, 'Новачок 🌱'],
    [0, 'Новачок 🌱'],
    [19.99, 'Новачок 🌱'],
    [20, 'Спостерігач 🔍'],
    [49.99, 'Спостерігач 🔍'],
    [50, 'Досвідчений 💪'],
    [99.99, 'Досвідчений 💪'],
    [100, 'Ветеран 🎖️'],
    [199.99, 'Ветеран 🎖️'],
    [200, 'Легенда активності 👑'],
    [1000, 'Легенда активності 👑'],
  ])('experience %d -> %s', (experience, expected) => {
    expect(getExperienceRankLabel(experience)).toBe(expected);
  });
});
