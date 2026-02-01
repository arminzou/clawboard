import { useMemo, useState } from 'react';
import { KanbanBoard } from './components/KanbanBoard';
import { ActivityTimeline } from './components/ActivityTimeline';
import { useWebSocket } from './hooks/useWebSocket';
import './index.css';

type Tab = 'kanban' | 'activity';

export default function App() {
  const [tab, setTab] = useState<Tab>('kanban');
  const { connected, lastMessage } = useWebSocket();

  const wsSignal = useMemo(() => lastMessage, [lastMessage]);

  return (
    <div className="h-full bg-slate-100">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-base font-semibold text-slate-900">Project Manager</div>
            <div className="text-xs text-slate-500">API ws: {connected ? 'connected' : 'disconnected'}</div>
          </div>
          <div className="flex gap-2">
            <TabButton active={tab === 'kanban'} onClick={() => setTab('kanban')}>Kanban</TabButton>
            <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>Activity</TabButton>
          </div>
        </div>
      </div>

      <div className="mx-auto h-[calc(100%-56px)] max-w-7xl px-4 py-4">
        {tab === 'kanban' ? <KanbanBoard wsSignal={wsSignal} /> : null}
        {tab === 'activity' ? <ActivityTimeline wsSignal={wsSignal} /> : null}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={
        active
          ? 'rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white'
          : 'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50'
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}
