import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThreadDetailPage } from './ThreadDetailPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    getThread: vi.fn(),
    listThreadEvents: vi.fn(),
    getPromotionPacket: vi.fn(),
    transitionThread: vi.fn(),
    cloneThread: vi.fn(),
    promoteThread: vi.fn(),
    validatePromotionPacket: vi.fn(),
    putPromotionPacket: vi.fn(),
  },
}));

const baseThread = {
  id: 'thread-1',
  workspace_id: 'default',
  title: 'Fix rendering crash in thread detail',
  problem_statement: 'Frontend crashes when opening a thread',
  status: 'open' as const,
  priority: 'high' as const,
  owner_human_id: 'armin',
  created_by_type: 'human' as const,
  created_by_id: 'armin',
  current_state_summary: null,
  consensus_state: 'mixed' as const,
  open_disagreements_count: 1,
  decision_deadline: null,
  last_human_ping_at: null,
  cloned_from_thread_id: null,
  created_at: '2026-03-11T10:00:00.000Z',
  updated_at: '2026-03-11T10:00:00.000Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/threads/thread-1']}>
      <Routes>
        <Route path="/threads/:threadId" element={<ThreadDetailPage wsSignal={null} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ThreadDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads from spinner state to thread detail without hook-order crash', async () => {
    vi.mocked(api.getThread).mockResolvedValue(baseThread);
    vi.mocked(api.listThreadEvents).mockResolvedValue([]);
    vi.mocked(api.getPromotionPacket).mockRejectedValue(new Error('no packet'));

    renderPage();

    expect(screen.getByText(/loading thread/i)).toBeTruthy();

    expect(await screen.findByText('Fix rendering crash in thread detail')).toBeTruthy();
    expect(screen.getByText(/events \(0\)/i)).toBeTruthy();
  });

  it('renders timeline events in chronological order (oldest first)', async () => {
    vi.mocked(api.getThread).mockResolvedValue(baseThread);
    vi.mocked(api.getPromotionPacket).mockRejectedValue(new Error('no packet'));
    vi.mocked(api.listThreadEvents).mockResolvedValue([
      {
        id: 'evt-2',
        thread_id: 'thread-1',
        event_type: 'work_log',
        actor_type: 'agent',
        actor_id: 'tee',
        body_md: 'second',
        stance: null,
        mention_human: false,
        mention_payload: null,
        metadata: null,
        created_at: '2026-03-11T10:02:00.000Z',
      },
      {
        id: 'evt-1',
        thread_id: 'thread-1',
        event_type: 'question_opened',
        actor_type: 'human',
        actor_id: 'armin',
        body_md: 'first',
        stance: null,
        mention_human: false,
        mention_payload: null,
        metadata: null,
        created_at: '2026-03-11T10:01:00.000Z',
      },
    ]);

    renderPage();

    await screen.findByText('Fix rendering crash in thread detail');

    await waitFor(() => {
      const first = screen.getByText('first');
      const second = screen.getByText('second');
      const firstPos = first.compareDocumentPosition(second);
      expect((firstPos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
    });
  });

  it('does not crash when mention payload options are missing', async () => {
    vi.mocked(api.getThread).mockResolvedValue(baseThread);
    vi.mocked(api.getPromotionPacket).mockRejectedValue(new Error('no packet'));
    vi.mocked(api.listThreadEvents).mockResolvedValue([
      {
        id: 'evt-mention',
        thread_id: 'thread-1',
        event_type: 'decision_requested',
        actor_type: 'agent',
        actor_id: 'tee',
        body_md: 'Need your decision',
        stance: null,
        mention_human: true,
        mention_payload: {
          what_changed: 'Scope changed',
          what_you_need_from_human: 'Pick direction',
          options: undefined,
          recommended_option: 'Option A',
        } as any,
        metadata: null,
        created_at: '2026-03-11T10:01:00.000Z',
      },
    ]);

    renderPage();

    expect(await screen.findByText('Fix rendering crash in thread detail')).toBeTruthy();
    expect(screen.getByText(/human ping/i)).toBeTruthy();
    expect(screen.getByText(/scope changed/i)).toBeTruthy();
  });
});
