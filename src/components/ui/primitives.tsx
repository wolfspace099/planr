import React from "react";
import clsx from "clsx";
import { X } from "lucide-react";

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center gap-1.5 font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" && "px-2.5 py-1 text-xs",
        size === "md" && "px-3.5 py-2 text-sm",
        variant === "primary" && "bg-accent text-white hover:bg-accent-hover",
        variant === "secondary" &&
          "bg-surface border border-border text-ink hover:bg-bg hover:border-border-strong",
        variant === "ghost" && "text-ink-muted hover:text-ink hover:bg-border/60",
        variant === "danger" && "bg-danger text-white hover:bg-red-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

type BadgeProps = {
  children: React.ReactNode;
  color?: "blue" | "green" | "amber" | "red" | "purple" | "default";
  className?: string;
};

const badgeColors: Record<string, string> = {
  blue: "bg-accent-light text-accent border-accent-border",
  green: "bg-success-light text-success border-green-200",
  amber: "bg-warning-light text-warning border-amber-200",
  red: "bg-danger-light text-danger border-red-200",
  purple: "bg-purple-50 text-purple-600 border-purple-200",
  default: "bg-bg text-ink-muted border-border",
};

export function Badge({ children, color = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        badgeColors[color],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className={clsx(
          "relative bg-surface rounded-xl shadow-modal w-full animate-slide-up border border-border",
          width
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-ink text-base">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-light hover:text-ink hover:bg-bg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-ink-muted">{label}</label>
      )}
      <input
        className={clsx(
          "w-full px-3 py-2 text-sm rounded border bg-surface text-ink placeholder-ink-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors",
          error ? "border-danger" : "border-border hover:border-border-strong",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-ink-muted">{label}</label>
      )}
      <textarea
        className={clsx(
          "w-full px-3 py-2 text-sm rounded border border-border bg-surface text-ink placeholder-ink-light focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors resize-none hover:border-border-strong",
          className
        )}
        {...props}
      />
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
};

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-ink-muted">{label}</label>
      )}
      <select
        className={clsx(
          "w-full px-3 py-2 text-sm rounded border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors hover:border-border-strong",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-ink-light mb-3">{icon}</div>
      <p className="font-medium text-ink-muted text-sm">{title}</p>
      {description && (
        <p className="text-xs text-ink-light mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
