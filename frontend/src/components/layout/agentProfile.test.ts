import { describe, expect, it } from 'vitest';
import { normalizeProfileSourceMap, normalizeProfileSources, pickIdleQuote, profileForAgent } from './agentProfile';

describe('agentProfile', () => {
  it('creates deterministic fallback profiles from normalized ids', () => {
    const a = profileForAgent('Alpha-Bot');
    const b = profileForAgent(' alpha-bot ');

    expect(a.id).toBe('alpha-bot');
    expect(a).toEqual(b);
  });

  it('merges plugin metadata and config overrides with config precedence', () => {
    const sources = normalizeProfileSources({
      pluginMetadata: {
        qa: {
          displayName: 'Plugin QA',
          accent: '#9c27b0',
          persona: 'methodical',
        },
      },
      config: {
        QA: {
          displayName: 'Config QA',
          avatar: '🧪',
          idleQuotes: ['Config quote'],
        },
      },
    });

    const profile = profileForAgent('qa', sources);
    expect(profile.displayName).toBe('Config QA');
    expect(profile.avatar).toBe('🧪');
    expect(profile.accent).toBe('#9c27b0');
    expect(profile.idleQuotes).toEqual(['Config quote']);
  });

  it('uses stable decorative quotes from the resolved profile', () => {
    const sources = normalizeProfileSources({
      config: {
        alpha: {
          idleQuotes: ['first', 'second'],
        },
      },
    });

    const q1 = pickIdleQuote('alpha', sources);
    const q2 = pickIdleQuote('alpha', sources);
    expect(['first', 'second']).toContain(q1);
    expect(q1).toBe(q2);
  });

  it('sanitizes malformed profile source data', () => {
    const map = normalizeProfileSourceMap({
      '': { displayName: 'invalid' },
      alpha: { displayName: 'Alpha', idleQuotes: ['', '  ', 'ready'] },
      beta: { persona: 'methodical' as const, avatar: '🦊' },
    });

    expect(map['']).toBeUndefined();
    expect(map.alpha.idleQuotes).toEqual(['ready']);
    expect(map.beta.avatar).toBe('🦊');
  });
});
