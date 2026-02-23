import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AgentPresenceProvider } from './AgentPresenceContext';
import { AgentStatusRow } from './AgentStatusRow';

function testTree(
  wsSignal?: { type?: string; data?: unknown } | null,
  options?: { onPreviewAgentChange?: (agentId: string | null, anchorEl?: HTMLElement | null) => void },
) {
  return (
    <MemoryRouter>
      <AgentPresenceProvider wsSignal={wsSignal} initialAgentIds={['tee']}>
        <AgentStatusRow
          agentId="tee"
          showNowLine
          onPreviewAgentChange={options?.onPreviewAgentChange}
        />
      </AgentPresenceProvider>
    </MemoryRouter>
  );
}

function renderAgentRow(
  wsSignal?: { type?: string; data?: unknown } | null,
  options?: { onPreviewAgentChange?: (agentId: string | null, anchorEl?: HTMLElement | null) => void },
) {
  return render(testTree(wsSignal, options));
}

describe('AgentStatusRow thought rendering', () => {
  it('shows current thought in now line without row bubble', async () => {
    const thought = 'Using git.commit with amended author and running pnpm test with workspace filters.';
    renderAgentRow({
      type: 'agent_status_updated',
      data: {
        agentId: 'tee',
        status: 'thinking',
        thought,
        lastActivity: '2026-02-22T12:00:00.000Z',
      },
    });

    const nowLine = await screen.findByText(thought);
    expect(nowLine.textContent).toBe(thought);
    expect(screen.queryByRole('status')).toBeNull();

    const row = screen.getByRole('button', { name: /open tee activity/i });
    await userEvent.hover(row);
    expect(screen.queryByRole('status')).toBeNull();

    await userEvent.unhover(row);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('emits preview agent id and anchor element on hover/focus', async () => {
    const onPreviewAgentChange = vi.fn();
    renderAgentRow(undefined, { onPreviewAgentChange });

    const row = screen.getByRole('button', { name: /open tee activity/i });
    await userEvent.hover(row);
    expect(onPreviewAgentChange).toHaveBeenCalledWith('tee', expect.any(HTMLElement));

    await userEvent.unhover(row);
    expect(onPreviewAgentChange).toHaveBeenCalledWith(null, null);

    row.focus();
    expect(onPreviewAgentChange).toHaveBeenCalledWith('tee', row);

    row.blur();
    await waitFor(() => {
      expect(onPreviewAgentChange).toHaveBeenCalledWith(null, null);
    });
  });

  it('renders generic thinking line when no thought text is available', async () => {
    renderAgentRow({
      type: 'agent_status_updated',
      data: {
        agentId: 'tee',
        status: 'thinking',
        lastActivity: '2026-02-22T12:00:00.000Z',
      },
    });

    await screen.findByText('Thinking...');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('clears stale thought text when status transitions to idle without thought', async () => {
    const staleThought = 'Running tests';
    const { rerender } = renderAgentRow({
      type: 'agent_status_updated',
      data: {
        agentId: 'tee',
        status: 'thinking',
        thought: staleThought,
        lastActivity: '2026-02-22T12:00:00.000Z',
      },
    });

    await screen.findByText(staleThought);

    rerender(
      testTree({
        type: 'agent_status_updated',
        data: {
          agentId: 'tee',
          status: 'idle',
          lastActivity: '2026-02-22T12:00:20.000Z',
        },
      }),
    );

    await screen.findByText('Idle');
    expect(screen.queryByText(staleThought)).toBeNull();

    const row = screen.getByRole('button', { name: /open tee activity/i });
    await userEvent.hover(row);
    expect(screen.queryByText(staleThought)).toBeNull();
  });
});
