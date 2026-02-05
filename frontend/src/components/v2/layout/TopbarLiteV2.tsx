import { Button } from '../ui/Button';

export function TopbarLiteV2({
  title,
  subtitle,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-base font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
        </div>

        {onRefresh ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onRefresh} title="Refresh">
              ⟳
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
