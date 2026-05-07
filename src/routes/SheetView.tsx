import { useParams } from 'react-router';

import { NebulaObject } from '@/components/charts/nebula/NebulaObject';
import { useApp, useSheets } from '@/features/qlik-session/useApp';

function SheetView() {
  const { appId, sheetId } = useParams<{ appId: string; sheetId: string }>();
  const app = useApp(appId);
  const sheets = useSheets(appId);

  if (!appId || !sheetId) {
    return <p>No sheet selected.</p>;
  }

  if (app.isPending || sheets.isPending) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (app.isError) {
    return <p className="text-destructive">Failed to open app: {(app.error as Error).message}</p>;
  }

  const sheet = sheets.data?.find((s) => s.id === sheetId);
  if (!sheet) {
    return <p className="text-destructive">Sheet not found in this app.</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{sheet.title}</h1>
        <p className="text-sm text-muted-foreground">From app: {appId}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {sheet.objects.map((objectId) => (
          <NebulaObject key={objectId} appId={appId} objectId={objectId} />
        ))}
      </div>
    </div>
  );
}

export default SheetView;
