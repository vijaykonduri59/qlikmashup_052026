import { createBrowserRouter } from 'react-router';

import RootLayout from './RootLayout';
import HomeView from './HomeView';
import NotFound from './NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <HomeView /> },
      {
        path: 'app/:appId',
        lazy: async () => {
          const { default: AppView } = await import('./AppView');
          return { Component: AppView };
        },
      },
      {
        path: 'app/:appId/sheet/:sheetId',
        lazy: async () => {
          const { default: SheetView } = await import('./SheetView');
          return { Component: SheetView };
        },
      },
    ],
  },
]);
