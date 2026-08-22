import { mergeJsonPatch } from './json-merge-patch';

describe('mergeJsonPatch', () => {
  it('merges objects and removes null fields', () => {
    const current = { wifi: { ssid: 'old', key: 'secret' }, revision: 1 };
    const patch = { wifi: { ssid: 'new', key: null }, revision: 2 };

    expect(mergeJsonPatch(current, patch)).toEqual({
      wifi: { ssid: 'new' },
      revision: 2,
    });
  });

  it('replaces arrays instead of merging their indexes', () => {
    expect(mergeJsonPatch({ values: [1, 2] }, { values: [3] })).toEqual({
      values: [3],
    });
  });
});
