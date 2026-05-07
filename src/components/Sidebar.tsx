import { Link, NavLink, useParams } from 'react-router';

import { useDocList, type StreamGroup } from '@/features/qlik-session/useDocList';
import { useSheets } from '@/features/qlik-session/useApp';
import type { QlikAppMetadata } from '@/lib/qlik/types';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { appId } = useParams<{ appId: string }>();
  const docList = useDocList();

  return (
    <aside className="min-h-screen w-72 border-r bg-sidebar p-4 text-sidebar-foreground">
      <Link to="/" className="text-lg font-semibold">
        Qlik Mashup
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">Mock data — Stage 7</p>

      <nav className="mt-6 space-y-4 text-sm">
        {docList.isPending && <p className="text-muted-foreground">Loading apps…</p>}
        {docList.isError && (
          <p className="text-destructive">
            Failed to load apps: {(docList.error as Error).message}
          </p>
        )}
        {docList.data?.map((group) => (
          <StreamGroupView key={group.stream.id} group={group} activeAppId={appId} />
        ))}
      </nav>
    </aside>
  );
}

function StreamGroupView({
  group,
  activeAppId,
}: {
  group: StreamGroup;
  activeAppId: string | undefined;
}) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {group.stream.name}
      </h3>
      <ul className="space-y-1">
        {group.apps.map((app) => (
          <AppRow key={app.id} app={app} expanded={activeAppId === app.id} />
        ))}
      </ul>
    </div>
  );
}

function AppRow({ app, expanded }: { app: QlikAppMetadata; expanded: boolean }) {
  return (
    <li>
      <NavLink
        to={`/app/${app.id}`}
        className={({ isActive }) =>
          cn('block rounded px-2 py-1 hover:bg-muted', isActive && 'bg-muted font-medium')
        }
      >
        {app.name}
      </NavLink>
      {expanded && <SheetList appId={app.id} />}
    </li>
  );
}

function SheetList({ appId }: { appId: string }) {
  const { data, isPending } = useSheets(appId);

  if (isPending) {
    return <p className="ml-3 mt-1 text-xs text-muted-foreground">Loading sheets…</p>;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <ul className="ml-3 mt-1 space-y-0.5">
      {data.map((sheet) => (
        <li key={sheet.id}>
          <NavLink
            to={`/app/${appId}/sheet/${sheet.id}`}
            className={({ isActive }) =>
              cn(
                'block rounded px-2 py-0.5 text-xs hover:bg-muted',
                isActive && 'bg-muted font-medium',
              )
            }
          >
            {sheet.title}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
