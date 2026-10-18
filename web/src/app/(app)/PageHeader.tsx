import type { ReactNode } from 'react';

/** Shared page header: title + subtitle on the left, page actions on the right. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-md text-text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
