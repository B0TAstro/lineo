import { describe, expect, test } from '@jest/globals';

import { completeForm, decodeForm } from './setup';

describe('decodeForm', () => {
  test('plays a match set up before courts existed outdoors, on a hard court', () => {
    const old = JSON.stringify({ nameA: 'Léa', nameB: 'Tom', firstServer: 'B' });

    const form = decodeForm(old);

    expect(form.court).toEqual({ place: 'outdoor', surface: 'hard' });
    expect(form.nameA).toBe('Léa');
  });
});

describe('completeForm', () => {
  test('fills in what a host on an older build did not send', () => {
    const form = completeForm({ nameA: 'Léa', noAd: true });

    expect(form.court).toEqual({ place: 'outdoor', surface: 'hard' });
    expect(form.noAd).toBe(true);
  });

  test('keeps the court the host chose', () => {
    const form = completeForm({ court: { place: 'indoor', surface: 'clay' } });

    expect(form.court).toEqual({ place: 'indoor', surface: 'clay' });
  });
});
