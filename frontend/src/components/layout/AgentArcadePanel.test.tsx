import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AgentArcadePanel } from './AgentArcadePanel';
import { AgentPresenceProvider } from './AgentPresenceContext';

function testTree(wsSignal?: { type?: string; data?: unknown } | null) {
  return (
    <MemoryRouter>
      <AgentPresenceProvider wsSignal={wsSignal} initialAgentIds={['tee']}>
        <AgentArcadePanel showNowLine />
      </AgentPresenceProvider>
    </MemoryRouter>
  );
}

describe('AgentArcadePanel floating popover', () => {
  it('shows one shared floating popover from hovered agent', async () => {
    render(
      testTree({
        type: 'agent_status_updated',
        data: {
          agentId: 'tee',
          status: 'thinking',
          thought: 'Running tests',
          turnCount: 5,
          lastActivity: '2026-02-22T12:00:00.000Z',
        },
      }),
    );

    expect(screen.queryByTestId('agent-rail-floating-popover')).toBeNull();

    const row = screen.getByRole('button', { name: /open tee activity/i });
    await userEvent.hover(row);
    expect(row.className).toContain('ring-slate-300/85');

    const popover = await screen.findByTestId('agent-rail-floating-popover');
    expect(popover.textContent).toContain('Tee');
    expect(popover.textContent).toContain('Running tests');
    expect(popover.textContent).toContain('Turn 5');

    await userEvent.unhover(row);
    await waitFor(() => {
      expect(screen.queryByTestId('agent-rail-floating-popover')).toBeNull();
    });
    expect(row.className).not.toContain('ring-slate-300/85');
  });
});
