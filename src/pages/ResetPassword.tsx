import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, Lock, ArrowLeft } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthPasswordInput, AuthSubmit, RULES } from "@/components/auth/AuthFields";

export default function ResetPassword() {
  const { loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if we have a valid password reset session
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // For password reset, we need to check if the user came from an email link
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const type = searchParams.get("type");

      if (type === "recovery" && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        setHasValidSession(!error);
      } else if (session?.user) {
        // User is already logged in, allow password reset
        setHasValidSession(true);
      } else {
        setHasValidSession(false);
      }
    };

    checkSession();
  }, [searchParams]);

  if (loading || hasValidSession === null) {
    return (
      <div
        className="auth-scope flex min-h-screen items-center justify-center"
        style={{ background: "var(--auth-canvas)" }}
      >
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-[var(--auth-teal-lt)]" />
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (RULES.some((r) => !r.test(password)))
      errs.password = "Password must meet all the requirements below";
    if (confirmPassword !== password) errs.confirm = "Passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setErrors({ password: error.message });
    } else {
      toast({ title: "Success", description: "Your password has been updated successfully." });

      // Sign out the user to clear the recovery session
      await supabase.auth.signOut();

      navigate("/auth", {
        state: { message: "Password updated successfully! Please sign in with your new password." },
      });
    }
  };

  if (!hasValidSession) {
    return (
      <AuthShell
        showAccent={false}
        accent={{ key: "invalid", headline: "", body: "" }}
      >
        <div className="mx-auto w-full max-w-md space-y-6">
          <div
            className="flex items-start gap-3 rounded-xl border p-4 text-sm"
            style={{ borderColor: "var(--auth-danger)", color: "var(--auth-text)" }}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--auth-danger)]" />
            <div>
              <p className="font-semibold">Invalid or expired reset link</p>
              <p className="mt-1 text-[var(--auth-muted)]">
                This password reset link is no longer valid. Request a new one from the sign-in page.
              </p>
            </div>
          </div>
          <AuthSubmit type="button" onClick={() => navigate("/auth")}>
            Back to sign in
          </AuthSubmit>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      accentSide="right"
      accent={{
        key: "reset",
        pill: "SECURE RESET",
        headline: "Choose a strong new password",
        body: "Your reset link is single-use and expires shortly. Once updated, you'll sign in again with your new password.",
      }}
    >
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--auth-text)]">
            Set a new password
          </h1>
          <p className="text-sm text-[var(--auth-muted)]">
            Enter your new password below. Make sure it&apos;s secure and memorable.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
          <AuthPasswordInput
            label="New password"
            icon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
            placeholder="Enter your new password"
            showStrength
            value={password}
            error={errors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <AuthPasswordInput
            label="Confirm new password"
            icon={<Lock className="h-4 w-4" />}
            autoComplete="new-password"
            placeholder="Confirm your new password"
            matchValue={password}
            value={confirmPassword}
            error={errors.confirm}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <AuthSubmit loading={isLoading}>
            {isLoading ? "Updating password…" : "Update password"}
          </AuthSubmit>
        </form>

        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-sm text-[var(--auth-muted)] transition-colors hover:text-[var(--auth-text)]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
