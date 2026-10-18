// Small building blocks from design/components.md → "Slice 4 — website components".

import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Icon, type IconName } from '@/components/icons';
import { initials } from '@/lib/format';
import { s } from '@/lib/strings';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ---------------------------------------------------------------- Button */

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'lg' | 'md' | 'sm';

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-text-on-primary shadow-md hover:bg-primary-pressed rounded-lg',
  secondary:
    'bg-surface text-text border-[1.5px] border-border-control hover:bg-surface-muted rounded-lg',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft rounded-md',
};
const sizeClass: Record<Size, string> = {
  lg: 'h-primary-action px-6 text-lg font-semibold',
  md: 'h-12 px-5 text-md font-semibold',
  sm: 'h-12 md:h-10 px-4 text-sm font-semibold',
};
const disabledClass =
  'bg-surface-muted text-text-subtle border-[1.5px] border-border shadow-none cursor-not-allowed rounded-lg';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block size-icon-sm rounded-full border-2 border-current border-r-transparent animate-spin motion-reduce:animate-none',
        className,
      )}
    />
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  loadingLabel,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  // Loading keeps the variant colours (it's busy, not unavailable); disabled greys out.
  const greyed = disabled && !loading;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors motion-reduce:transition-none',
        sizeClass[size],
        greyed ? disabledClass : variantClass[variant],
        fullWidth && 'w-full',
        loading && 'cursor-wait',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner />
      ) : icon ? (
        <Icon name={icon} className={size === 'sm' ? 'size-icon-sm' : 'size-icon'} />
      ) : null}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

/* ---------------------------------------------------------------- Banner */

type BannerTone = 'error' | 'info' | 'success';

export function Banner({
  tone,
  title,
  body,
  action,
  className,
}: {
  tone: BannerTone;
  title?: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  const look = {
    error: { bg: 'bg-danger-soft', icon: 'alert-circle' as const, iconCls: 'text-danger', titleCls: 'text-danger' },
    info: {
      bg: 'bg-surface-muted',
      icon: 'information-circle-outline' as const,
      iconCls: 'text-text-muted',
      titleCls: 'text-text',
    },
    success: { bg: 'bg-success-soft', icon: 'checkmark-circle' as const, iconCls: 'text-success', titleCls: 'text-success' },
  }[tone];
  return (
    <div
      role={tone === 'info' ? 'status' : 'alert'}
      className={cx('flex items-start gap-3 rounded-md px-4 py-3', look.bg, className)}
    >
      <Icon name={look.icon} className={cx('size-icon mt-[1px]', look.iconCls)} />
      <div className="min-w-0 flex-1">
        {title && <p className={cx('text-sm font-semibold', look.titleCls)}>{title}</p>}
        {body && <p className="text-sm text-text">{body}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  body,
  action,
  error = false,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
  error?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={cx(
          'size-hero-circle rounded-full grid place-items-center',
          error ? 'bg-danger-soft' : 'bg-surface-muted',
        )}
      >
        <Icon name={icon} className={cx('size-icon-xl', error ? 'text-danger' : 'text-text-muted')} />
      </div>
      <h2 className="mt-4 text-xl font-bold text-text">{title}</h2>
      {body && <p className="mt-2 text-md text-text-muted max-w-text-block">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('bg-surface-muted animate-pulse motion-reduce:animate-none', className)} />;
}

export function LoadingRegion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only">{s.common.loading}</span>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- Avatar */

export function Avatar({ name, className }: { name: string; className?: string }) {
  const text = initials(name);
  return (
    <span
      aria-hidden="true"
      className={cx(
        'size-avatar flex-none rounded-full grid place-items-center text-sm font-bold text-text-muted',
        className ?? 'bg-surface-muted',
      )}
    >
      {text || <Icon name="person-circle-outline" className="size-icon-lg" />}
    </span>
  );
}

/* ---------------------------------------------------------------- Brand */

export function BrandMark({ large = false, className }: { large?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a tiny static SVG; next/image adds nothing here.
    <img
      src="/mark.svg"
      alt=""
      width={large ? 64 : 36}
      height={large ? 64 : 36}
      className={cx(large ? 'size-brand-mark rounded-lg' : 'size-brand-mark-sm rounded-md', 'flex-none', className)}
    />
  );
}

/* ---------------------------------------------------------------- Field parts */

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-2 flex gap-1 text-sm text-danger">
      <Icon name="alert-circle" className="size-icon-sm mt-[3px]" />
      <span>{message}</span>
    </p>
  );
}

/**
 * Box classes shared by inputs and selects. Focus and error read as a 2px border: the 1.5px
 * border plus a 0.5px inset ring, so the text never shifts and padding stays the caller's.
 */
export function fieldBox(invalid: boolean, extra?: string): string {
  return cx(
    'h-12 w-full rounded-md bg-surface px-4 text-md text-text placeholder:text-text-subtle outline-none border-[1.5px]',
    'disabled:bg-surface-muted disabled:text-text-muted disabled:border-border',
    invalid
      ? 'border-danger ring-[0.5px] ring-inset ring-danger'
      : 'border-border-control hover:border-text-muted focus:border-focus-ring focus:ring-[0.5px] focus:ring-inset focus:ring-focus-ring',
    extra,
  );
}
