import * as Sentry from '@sentry/react';

/**
 * Typed breadcrumb helpers.
 *
 * Calling these is safe even when Sentry is not initialized — Sentry's
 * internal `addBreadcrumb` is a no-op in that case.
 *
 * Convention from docs/15: never include PII or raw hypercube data in the
 * `data` payload. Stick to IDs, durations, and small enums.
 */

type QlikBreadcrumbCategory =
  | 'qlik.session'
  | 'qlik.app'
  | 'qlik.sheet'
  | 'qlik.object'
  | 'qlik.selection'
  | 'qlik.export';

interface QlikBreadcrumbInput {
  category: QlikBreadcrumbCategory;
  message: string;
  data?: Record<string, string | number | boolean>;
  level?: 'info' | 'warning' | 'error';
}

/** Emit a breadcrumb for a Qlik engine event (session/app/sheet/object/etc.). */
export function qlikBreadcrumb(input: QlikBreadcrumbInput): void {
  Sentry.addBreadcrumb({
    category: input.category,
    message: input.message,
    data: input.data,
    level: input.level ?? 'info',
  });
}

interface NavigationBreadcrumbInput {
  from: string;
  to: string;
  data?: Record<string, string | number | boolean>;
}

/** Emit a breadcrumb for a navigation event (route change). */
export function navigationBreadcrumb(input: NavigationBreadcrumbInput): void {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `${input.from} -> ${input.to}`,
    data: input.data,
    level: 'info',
  });
}
