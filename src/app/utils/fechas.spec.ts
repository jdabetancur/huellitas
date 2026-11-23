import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { patronFecha } from './fechas';

describe('patronFecha', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 22, 10, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('sin año para fechas de este año', () => {
    expect(patronFecha('2026-12-24')).toBe("EEEE d 'de' MMMM");
    expect(patronFecha('2026-12-24', false)).toBe("d 'de' MMMM");
  });

  it('con año para fechas de otro año', () => {
    expect(patronFecha('2027-11-21')).toBe("EEEE d 'de' MMMM 'de' y");
    expect(patronFecha('2025-01-03', false)).toBe("d 'de' MMMM 'de' y");
  });
});
