import { describe, expect, it } from 'vitest';
import { formatCm, formatCmSigned, roundCm } from './number.util';

describe('roundCm', () => {
  it('rounds to the nearest hundredth', () => {
    expect(roundCm(10.005)).toBe(10.01);
    expect(roundCm(10.004)).toBe(10);
  });
});

describe('formatCm', () => {
  it('drops a trailing .0', () => {
    expect(formatCm(10)).toBe('10');
  });

  it('rounds down within half a tenth', () => {
    expect(formatCm(10.04)).toBe('10');
  });

  it('rounds up at half a tenth', () => {
    expect(formatCm(10.05)).toBe('10.1');
  });

  it('normalizes -0 to 0', () => {
    expect(formatCm(-0.02)).toBe('0');
  });

  it('keeps a negative tenth', () => {
    // Math.round rounds ties toward +Infinity, so -12.5 -> -12, not -13.
    expect(formatCm(-1.25)).toBe('-1.2');
  });
});

describe('formatCmSigned', () => {
  it('prefixes zero with a plus sign', () => {
    expect(formatCmSigned(0)).toBe('+0');
  });

  it('does not double the minus sign for negatives', () => {
    expect(formatCmSigned(-1.24)).toBe('-1.2');
  });

  it('prefixes positive values with a plus sign', () => {
    expect(formatCmSigned(3.14)).toBe('+3.1');
  });
});
