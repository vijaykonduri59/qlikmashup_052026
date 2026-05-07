import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('joins string class names with spaces', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('drops falsy values', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar');
  });

  it('lets later Tailwind utilities win over earlier ones (tailwind-merge behavior)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles conditional object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });
});
