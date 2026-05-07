import { useObjectLayout } from '@/features/qlik-session/useApp';
import type { QlikAppId, QlikObjectId } from '@/lib/qlik/types';

interface NebulaObjectProps {
  appId: QlikAppId;
  objectId: QlikObjectId;
}

/**
 * Renders a Qlik object (chart/table/KPI/etc.) into a card.
 *
 * Stage 7: PLACEHOLDER renderer — shows the object's title and data as a
 * simple HTML table. The component lifecycle, data flow, and error handling
 * established here will all stay; only the inner rendering swaps to real
 * nebula.js `embed()` in Stage 7b.
 */
export function NebulaObject({ appId, objectId }: NebulaObjectProps) {
  const { data, isPending, isError, error } = useObjectLayout(appId, objectId);

  if (isPending) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-card p-6">
        <h3 className="font-semibold text-destructive">Failed to load object</h3>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{data.title}</h3>
        <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
          {data.kind}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Mock placeholder — real nebula.js {data.kind} in Stage 7b.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              {data.headers.map((h) => (
                <th key={h} className="px-2 py-1 font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b last:border-b-0">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-2 py-1">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
