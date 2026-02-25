import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AgentPresenceProvider } from './AgentPresenceContext';
import { AgentPresenceStrip } from './AgentPresenceStrip';

function testTree(wsSignal?: { type?: string; data?: unknown } | null) {
  return (
    <MemoryRouter>
      <AgentPresenceProvider wsSignal={wsSignal} initialAgentIds={['tee']}>
        <AgentPresenceStrip autoPopupOnThoughtChange />
      </AgentPresenceProvider>
    </MemoryRouter>
  );
}

function horizontalTree(wsSignal?: { type?: string; data?: unknown } | null) {
  return (
    <MemoryRouter>
      <AgentPresenceProvider wsSignal={wsSignal} initialAgentIds={['tee']}>
        <AgentPresenceStrip horizontal />
      </AgentPresenceProvider>
    </MemoryRouter>
  );
}

describe('AgentPresenceStrip', () => {
  it('auto pops thought bubble when thinking text changes in collapsed mode', async () => {
    const { rerender } = render(testTree());

    expect(screen.queryByRole('status')).toBeNull();

    rerender(
      testTree({
        type: 'agent_status_updated',
        data: {
          agentId: 'tee',
          status: 'thinking',
          thought: 'Running tests',
          turnCount: 2,
          lastActivity: '2026-02-22T12:00:05.000Z',
        },
      }),
    );

    rerender(
      testTree({
        type: 'agent_status_updated',
        data: {
          agentId: 'tee',
          status: 'thinking',
          thought: 'Running tests',
          turnCount: 3,
          lastActivity: '2026-02-22T12:00:10.000Z',
        },
      }),
    );

    const updatedBubble = await screen.findByRole('status');
    expect(updatedBubble.textContent).toContain('Running tests');
    expect(updatedBubble.textContent).toContain('Turn 3');
  });

  it('shows thought bubble on hover in horizontal bottom strip', async () => {
    render(
      horizontalTree({
        type: 'agent_status_updated',
        data: {
          agentId: 'tee',
          status: 'thinking',
          thought: 'Running tests',
          turnCount: 4,
          lastActivity: '2026-02-22T12:00:10.000Z',
        },
      }),
    );

    const row = screen.getByRole('button', { name: /open tee activity/i });
    await userEvent.hover(row);

    const bubble = await screen.findByRole('status');
    expect(bubble.textContent).toContain('Running tests');
    expect(bubble.textContent).toContain('Turn 4');
  });
});
