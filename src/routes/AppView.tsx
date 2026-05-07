import { Link, useParams } from 'react-router';

import { useApp, useSheets } from '@/features/qlik-session/useApp';

function AppView() {
  const { appId } = useParams<{ appId: string }>();
  const app = useApp(appId);
  const sheets = useSheets(appId);

  if (!appId) {
    return <p>No app selected.</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">App: {appId}</h1>
        <p className="text-sm text-muted-foreground">
          {app.isPending && 'Opening app handle…'}
          {app.isError && `Failed to open: ${(app.error as Error).message}`}
          {app.isSuccess && 'Open. Pick a sheet below.'}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Sheets</h2>
        {sheets.isPending && <p className="text-muted-foreground">Loading sheets…</p>}
        {sheets.isError && (
          <p className="text-destructive">
            Failed to load sheets: {(sheets.error as Error).message}
          </p>
        )}
        {sheets.data && (
          <ul className="space-y-2">
            {sheets.data.map((sheet) => (
              <li key={sheet.id}>
                <Link
                  to={`/app/${appId}/sheet/${sheet.id}`}
                  className="block rounded-lg border bg-card p-4 hover:bg-accent"
                >
                  <p className="font-medium">{sheet.title}</p>
                  <p className="text-xs text-muted-foreground">{sheet.id}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AppView;
