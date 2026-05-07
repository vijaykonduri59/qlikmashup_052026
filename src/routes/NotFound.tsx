import { Link, useRouteError, isRouteErrorResponse } from 'react-router';

import { Button } from '@/components/ui/button';

function NotFound() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {is404 ? '404 — Page not found' : 'Something went wrong'}
        </h1>
        <p className="text-muted-foreground">
          {is404
            ? "We couldn't find the page you were looking for."
            : 'An unexpected error occurred. The error has been logged.'}
        </p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}

export default NotFound;
