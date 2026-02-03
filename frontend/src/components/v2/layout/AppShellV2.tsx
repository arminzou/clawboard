import type { ReactNode } from 'react';

export function AppShellV2({
  sidebar,
  topbar,
  children,
}: {
  sidebar?: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full">
      {sidebar}

      <main className="min-w-0 flex flex-1 flex-col bg-[rgb(var(--cb-surface-muted))]">
        {topbar}
        <div className="flex-1 overflow-auto px-4 py-4">{children}</div>
      </main>
    </div>
  );
}
