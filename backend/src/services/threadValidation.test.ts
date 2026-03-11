import { describe, expect, it } from 'vitest';
import { HttpError } from '../presentation/http/errors/httpError';
import {
  assertObjectionEventContract,
  assertPromotionTaskCount,
  assertThreadTransitionAllowed,
  isThreadTransitionAllowed,
  parseAndValidateMentionPayload,
  parseAndValidateObjectionMetadata,
} from './threadValidation';

describe('threadValidation', () => {
  describe('thread transitions', () => {
    it('accepts allowed transitions', () => {
      expect(isThreadTransitionAllowed('open', 'clarifying')).toBe(true);
      expect(isThreadTransitionAllowed('ready_to_plan', 'pending_approval')).toBe(true);
      expect(isThreadTransitionAllowed('promoted', 'archived')).toBe(true);
    });

    it('rejects invalid transitions', () => {
      expect(() =>
        assertThreadTransitionAllowed({
          from: 'open',
          to: 'promoted',
          actorType: 'human',
        }),
      ).toThrow(HttpError);

      try {
        assertThreadTransitionAllowed({
          from: 'open',
          to: 'promoted',
          actorType: 'human',
        });
      } catch (err) {
        expect((err as HttpError).status).toBe(400);
        expect((err as HttpError).message).toBe('thread_transition_invalid');
      }
    });

    it('rejects non-human promote transition from pending_approval', () => {
      expect(() =>
        assertThreadTransitionAllowed({
          from: 'pending_approval',
          to: 'promoted',
          actorType: 'agent',
        }),
      ).toThrow(HttpError);

      try {
        assertThreadTransitionAllowed({
          from: 'pending_approval',
          to: 'promoted',
          actorType: 'agent',
        });
      } catch (err) {
        expect((err as HttpError).status).toBe(403);
        expect((err as HttpError).message).toBe('thread_transition_forbidden_actor');
      }
    });
  });

  describe('mention payload contract', () => {
    it('accepts valid mention payload', () => {
      const payload = parseAndValidateMentionPayload({
        what_changed: 'Plan posted',
        what_you_need_from_human: 'Choose option',
        options: ['A', 'B'],
        recommended_option: 'A',
      });

      expect(payload.what_changed).toBe('Plan posted');
      expect(payload.options).toEqual(['A', 'B']);
      expect(payload.recommended_option).toBe('A');
    });

    it('rejects mention payload with 2+ options and no recommended option', () => {
      expect(() =>
        parseAndValidateMentionPayload({
          what_changed: 'Plan posted',
          what_you_need_from_human: 'Choose option',
          options: ['A', 'B'],
        }),
      ).toThrow(HttpError);
    });
  });

  describe('objection payload contract', () => {
    it('accepts valid objection metadata', () => {
      const metadata = parseAndValidateObjectionMetadata({
        risk: 'May break migration order',
        alternative: 'Run behind feature flag first',
      });

      expect(metadata.risk).toContain('migration');
      expect(metadata.alternative).toContain('feature flag');
    });

    it('rejects objection event without object stance', () => {
      expect(() =>
        assertObjectionEventContract({
          eventType: 'objection_posted',
          stance: 'agree',
          metadata: {
            risk: 'x',
            alternative: 'y',
          },
        }),
      ).toThrow(HttpError);
    });

    it('rejects objection event missing risk/alternative', () => {
      expect(() =>
        assertObjectionEventContract({
          eventType: 'objection_posted',
          stance: 'object',
          metadata: { risk: 'missing alternative' },
        }),
      ).toThrow(HttpError);
    });
  });

  describe('promotion gate', () => {
    it('requires at least one spawned task', () => {
      expect(() => assertPromotionTaskCount(0)).toThrow(HttpError);
      expect(() => assertPromotionTaskCount(1)).not.toThrow();
    });
  });
});
