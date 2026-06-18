import { describe, it, expect } from 'vitest';
import vi from '@/app/i18n/vi.json';
import en from '@/app/i18n/en.json';

describe('i18n resources', () => {
  it('vi and en define exactly the same keys', () => {
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
  });

  it('no translation is empty', () => {
    for (const [k, v] of Object.entries(vi)) expect(v, `vi.${k}`).toBeTruthy();
    for (const [k, v] of Object.entries(en)) expect(v, `en.${k}`).toBeTruthy();
  });
});
