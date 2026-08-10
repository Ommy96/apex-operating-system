import { ReactNode, forwardRef, useId, useState } from "react";
import { Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const inputBase =
  "h-12 w-full rounded-xl border bg-[var(--auth-input)] pl-11 pr-11 text-sm text-[var(--auth-text)] " +
  "placeholder:text-[var(--auth-muted)] outline-none transition-shadow";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, icon, error, className, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-xs font-medium text-[var(--auth-muted)]">
          {label}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--auth-muted)]">
            {icon}
          </span>
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              inputBase,
              "focus:border-[var(--auth-teal-lt)] focus:shadow-[0_0_0_3px_rgba(31,168,145,0.28)]",
              className,
            )}
            style={{ borderColor: error ? "var(--auth-danger)" : "var(--auth-border)" }}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--auth-danger)]">
            {error}
          </p>
        )}
      </div>
    );
  },
);
AuthInput.displayName = "AuthInput";

interface PasswordProps extends FieldProps {
  /** Show live strength meter + requirement list. */
  showStrength?: boolean;
  /** Show inline match indicator against this value. */
  matchValue?: string;
}

export const RULES = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "An uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "A lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "A number", test: (v: string) => /[0-9]/.test(v) },
];

export function passwordScore(v: string) {
  return RULES.filter((r) => r.test(v)).length + (/[^A-Za-z0-9]/.test(v) ? 1 : 0);
}

export const AuthPasswordInput = forwardRef<HTMLInputElement, PasswordProps>(
  ({ label, icon, error, showStrength, matchValue, className, id, value, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const autoId = useId();
    const inputId = id ?? autoId;
    const val = String(value ?? "");
    const score = passwordScore(val);
    const matches = matchValue !== undefined && val.length > 0 && val === matchValue;
    const mismatched = matchValue !== undefined && val.length > 0 && val !== matchValue;
    const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"][score] ?? "";

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-xs font-medium text-[var(--auth-muted)]">
          {label}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--auth-muted)]">
            {icon}
          </span>
          <input
            id={inputId}
            ref={ref}
            value={value}
            type={visible ? "text" : "password"}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              inputBase,
              "pr-20 focus:border-[var(--auth-teal-lt)] focus:shadow-[0_0_0_3px_rgba(31,168,145,0.28)]",
              className,
            )}
            style={{ borderColor: error ? "var(--auth-danger)" : "var(--auth-border)" }}
            {...props}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {matchValue !== undefined && (matches || mismatched) && (
              <span aria-hidden className={matches ? "text-[var(--auth-teal-lt)]" : "text-[var(--auth-danger)]"}>
                {matches ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </span>
            )}
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--auth-muted)] transition-colors hover:text-[var(--auth-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-teal-lt)]"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {showStrength && val.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-full transition-colors"
                    style={{
                      background:
                        i < score
                          ? score <= 2
                            ? "var(--auth-danger)"
                            : score === 3
                              ? "var(--auth-gold)"
                              : "var(--auth-teal-lt)"
                          : "var(--auth-border)",
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-[var(--auth-muted)]">{strengthLabel}</span>
            </div>
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {RULES.map((r) => {
                const ok = r.test(val);
                return (
                  <li
                    key={r.label}
                    className="flex items-center gap-1.5 text-[11px]"
                    style={{ color: ok ? "var(--auth-teal-lt)" : "var(--auth-muted)" }}
                  >
                    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {r.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {mismatched && !error && (
          <p className="text-xs text-[var(--auth-danger)]">Passwords don&apos;t match</p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[var(--auth-danger)]">
            {error}
          </p>
        )}
      </div>
    );
  },
);
AuthPasswordInput.displayName = "AuthPasswordInput";

export function AuthSubmit({
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || props.disabled}
      {...props}
      className={cn(
        "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white",
        "transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-teal-lt)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-surface)]",
        props.className,
      )}
      style={{
        background: "linear-gradient(120deg, var(--auth-teal) 0%, var(--auth-teal-lt) 100%)",
      }}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function GoogleButton({
  onClick,
  loading,
  label = "Continue with Google",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border bg-[var(--auth-input)] text-sm font-medium text-[var(--auth-text)] transition-colors hover:bg-white/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-teal-lt)]"
      style={{ borderColor: "var(--auth-border)" }}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C39.1 36.3 44 31 44 24c0-1.3-.1-2.6-.4-3.9z" />
        </svg>
      )}
      {label}
    </button>
  );
}

export function AuthDivider({ label = "or continue with email" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1" style={{ background: "var(--auth-border)" }} />
      <span className="text-[11px] uppercase tracking-wider text-[var(--auth-muted)]">{label}</span>
      <span className="h-px flex-1" style={{ background: "var(--auth-border)" }} />
    </div>
  );
}