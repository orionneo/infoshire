import { TooltipProps } from 'recharts';

export function SafeTooltip({ active, payload, label }: TooltipProps<any, any>) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-md border bg-background p-2 shadow-sm text-sm">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: (item as any).color ?? (item as any).fill ?? '#999' }}
          />
          <span>
            {(item as any).name}: {(item as any).value}
          </span>
        </div>
      ))}
    </div>
  );
}
