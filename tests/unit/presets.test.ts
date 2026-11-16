import { describe, expect, it } from 'vitest';
import { applyPreset, detectPreset, PRESET_KEYS, PRESETS } from '../../src/core/presets';

describe('presets', () => {
  it('detects each preset after applying it', () => {
    for (const id of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
      const S: Record<string, boolean | string | number> = { accent: '#fff' };
      applyPreset(S, id);
      expect(detectPreset(S)).toBe(id);
    }
  });

  it('shows custom after a manual change', () => {
    const S: Record<string, boolean | string | number> = {};
    applyPreset(S, 'balanced');
    S.fluentReveal = true;
    expect(detectPreset(S)).toBe('beauty');
    S.motion = false;
    expect(detectPreset(S)).toBe('custom');
  });

  it('does not touch other settings', () => {
    const S: Record<string, boolean | string | number> = { accent: '#123456', hotLikes: 7 };
    applyPreset(S, 'performance');
    expect(S.accent).toBe('#123456');
    expect(S.hotLikes).toBe(7);
  });

  it('presets differ from each other in every key set', () => {
    expect(new Set(PRESET_KEYS).size).toBe(PRESET_KEYS.length);
    expect(PRESETS.performance).not.toEqual(PRESETS.balanced);
    expect(PRESETS.balanced).not.toEqual(PRESETS.beauty);
  });
});
