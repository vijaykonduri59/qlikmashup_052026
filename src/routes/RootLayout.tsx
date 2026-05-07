import { Outlet } from 'react-router';

import { Sidebar } from '@/components/Sidebar';

function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default RootLayout;
