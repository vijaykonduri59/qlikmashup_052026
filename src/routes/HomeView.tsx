import { Link } from 'react-router';

import { useDocList } from '@/features/qlik-session/useDocList';

function HomeView() {
  const docList = useDocList();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
        <p className="text-muted-foreground">
          Pick an app from the sidebar — or one of the cards below — to start exploring.
        </p>
      </header>

      {docList.isPending && <p className="text-muted-foreground">Loading streams…</p>}

      {docList.data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docList.data.flatMap((group) =>
            group.apps.map((app) => (
              <Link
                key={app.id}
                to={`/app/${app.id}`}
                className="block rounded-lg border bg-card p-6 hover:bg-accent"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {group.stream.name}
                </p>
                <h2 className="mt-1 font-semibold">{app.name}</h2>
                {app.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{app.description}</p>
                )}
              </Link>
            )),
          )}
        </div>
      )}
    </div>
  );
}

export default HomeView;
