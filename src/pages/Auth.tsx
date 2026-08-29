import { logger } from "@/lib/logger";
import { useState, useEffect, useMemo } from "react";
import { Navigate, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthInput,
  AuthPasswordInput,
  AuthSubmit,
  AuthDivider,
  GoogleButton,
  RULES,
} from "@/components/auth/AuthFields";
import { PRODUCT_NAME } from "@/config/brand";

type Mode = "signin" | "signup" | "forgot";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  status: string;
  expires_at: string;
  organization?: { name: string };
}

/** Map raw Supabase auth errors to specific, human messages. */
function humanAuthError(message?: string): string {
  const m = (message || "").toLowerCase();
  if (!m) return "Something went wrong. Please try again.";
  if (m.includes("invalid login credentials"))
    return "That email and password don't match an account. Check the password and try again.";
  if (m.includes("email not confirmed"))
    return "Your email isn't verified yet. Open the confirmation link we emailed you, then sign in.";
  if (m.includes("too many") || m.includes("rate limit"))
    return "Too many attempts. Please wait a few minutes before trying again.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "We couldn't reach the server. Check your connection and try again.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "Google sign-in isn't enabled for this workspace yet. Please sign in with email, or ask your administrator to enable Google in Supabase Auth settings.";
  if (m.includes("already registered")) return "That email is already registered. Sign in instead.";
  return message as string;
}

export default function Auth() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const reduced = useReducedMotion();

  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin",
  );

  // ── Sign in ────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [signInErrors, setSignInErrors] = useState<Record<string, string>>({});
  const [signInBusy, setSignInBusy] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendNote, setResendNote] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Sign up ────────────────────────────────────────────────────────────
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suErrors, setSuErrors] = useState<Record<string, string>>({});

  // ── Forgot ─────────────────────────────────────────────────────────────
  const [fpEmail, setFpEmail] = useState("");
  const [fpError, setFpError] = useState<string | null>(null);
  const [fpBusy, setFpBusy] = useState(false);
  const [fpSent, setFpSent] = useState(false);

  // ── Google ─────────────────────────────────────────────────────────────
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // ── Invitation ─────────────────────────────────────────────────────────
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [invName, setInvName] = useState("");
  const [invPassword, setInvPassword] = useState("");
  const [invConfirm, setInvConfirm] = useState("");
  const [invErrors, setInvErrors] = useState<Record<string, string>>({});
  const [invBusy, setInvBusy] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    const fetchInvitation = async (token: string) => {
      setInvitationLoading(true);
      setInvitationError(null);
      try {
        const { data, error } = await supabase
          .from("organization_invitations")
          .select(
            `id, email, role, organization_id, status, expires_at, organizations:organization_id (name)`,
          )
          .eq("token", token)
          .single();

        if (error) {
          setInvitationError("Invalid invitation link");
          return;
        }
        if (!data) {
          setInvitationError("Invitation not found");
          return;
        }
        if (data.status !== "pending") {
          setInvitationError("This invitation has already been used or cancelled");
          return;
        }
        if (new Date(data.expires_at) < new Date()) {
          setInvitationError("This invitation has expired");
          return;
        }
        setInvitation({
          ...data,
          organization: data.organizations as unknown as { name: string },
        });
      } catch {
        setInvitationError("Failed to load invitation");
      } finally {
        setInvitationLoading(false);
      }
    };
    fetchInvitation(inviteToken);
  }, [inviteToken]);

  const accent = useMemo(() => {
    if (mode === "signup")
      return {
        key: "signin-cta",
        pill: PRODUCT_NAME.toUpperCase(),
        headline: "Already have an account?",
        body: "Sign in to pick up where you left off.",
        ctaLabel: "Sign in",
        onCta: () => switchMode("signin"),
      };
    if (mode === "forgot")
      return {
        key: "forgot-cta",
        pill: PRODUCT_NAME.toUpperCase(),
        headline: "Remembered it?",
        body: "Head back to sign in and continue managing your programmes.",
        ctaLabel: "Back to sign in",
        onCta: () => switchMode("signin"),
      };
    return {
      key: "signup-cta",
      pill: PRODUCT_NAME.toUpperCase(),
      headline: `New to ${PRODUCT_NAME}?`,
      body: "Create your organisation account and start managing your programmes in minutes.",
      ctaLabel: "Create account",
      onCta: () => switchMode("signup"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setSignInErrors({});
    setSuErrors({});
    setFpError(null);
    setGoogleError(null);
  };

  if (loading || invitationLoading) {
    return (
      <div
        className="auth-scope flex min-h-screen items-center justify-center"
        style={{ background: "var(--auth-canvas)" }}
      >
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-[var(--auth-teal-lt)]" />
      </div>
    );
  }

  if (user && !inviteToken) {
    return <Navigate to="/dashboard" replace />;
  }

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      const el = document.querySelector('[aria-invalid="true"]') as HTMLElement | null;
      el?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
      el?.focus?.();
    });
  };

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // ── Handlers (auth logic unchanged) ────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isEmail(email)) errs.email = "Please enter a valid email";
    if (password.length < 6) errs.password = "Password must be at least 6 characters";
    setSignInErrors(errs);
    if (Object.keys(errs).length) return focusFirstError();

    setSignInBusy(true);
    setNeedsConfirm(false);
    setResendNote(null);
    const { error } = await signIn(email, password);
    setSignInBusy(false);
    if (error) {
      const msg = humanAuthError(error.message);
      if ((error.message || "").toLowerCase().includes("email not confirmed")) {
        setNeedsConfirm(true);
      }
      setSignInErrors({
        password: msg,
      });
      focusFirstError();
    }
  };

  /** Unverified email is otherwise a dead end — let the user request a new link. */
  const handleResendConfirmation = async () => {
    if (!isEmail(email)) {
      setSignInErrors((p) => ({ ...p, email: "Please enter a valid email" }));
      return;
    }
    setResendBusy(true);
    setResendNote(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setResendBusy(false);
    setResendNote(
      error
        ? { ok: false, text: humanAuthError(error.message) }
        : { ok: true, text: `Confirmation email sent to ${email}. Check your inbox and spam folder.` },
    );
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (suName.trim().length < 2) errs.name = "Full name must be at least 2 characters";
    if (!isEmail(suEmail)) errs.email = "Please enter a valid email";
    if (RULES.some((r) => !r.test(suPassword)))
      errs.password = "Password must meet all the requirements below";
    if (suConfirm !== suPassword) errs.confirm = "Passwords don't match";
    setSuErrors(errs);
    if (Object.keys(errs).length) return focusFirstError();

    // Account + organisation are created together in the next step.
    navigate("/register-organization", {
      state: {
        prefill: { fullName: suName.trim(), email: suEmail.trim(), password: suPassword },
      },
    });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(fpEmail)) {
      setFpError("Please enter a valid email");
      return focusFirstError();
    }
    setFpError(null);
    setFpBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(fpEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setFpBusy(false);
    if (error) {
      logger.error("Error sending password reset email:", error);
      setFpError(humanAuthError(error.message));
      return;
    }
    setFpSent(true);
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    setGoogleError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setGoogleBusy(false);
      setGoogleError(humanAuthError(error.message));
    }
  };

  const handleInviteSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    const errs: Record<string, string> = {};
    if (invName.trim().length < 2) errs.name = "Full name must be at least 2 characters";
    if (invPassword.length < 6) errs.password = "Password must be at least 6 characters";
    if (invConfirm !== invPassword) errs.confirm = "Passwords don't match";
    setInvErrors(errs);
    if (Object.keys(errs).length) return focusFirstError();

    setInvBusy(true);
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: invPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: { full_name: invName.trim() },
        },
      });
      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ full_name: invName.trim(), organization_id: invitation.organization_id })
          .eq("user_id", authData.user.id);
        if (profileError) logger.error("Profile update error:", profileError);

        const { error: acceptError } = await supabase.rpc("accept_invitation", {
          _invitation_id: invitation.id,
          _user_id: authData.user.id,
        });
        if (acceptError) logger.error("Accept invitation error:", acceptError);

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: "staff" });
        if (roleError) logger.error("Role creation error:", roleError);

        navigate("/auth");
      }
    } catch (error: any) {
      logger.error("Signup error:", error);
      setInvErrors({ password: humanAuthError(error?.message) });
      focusFirstError();
    } finally {
      setInvBusy(false);
    }
  };

  // ── Invitation screen ──────────────────────────────────────────────────
  if (inviteToken) {
    return (
      <AuthShell
        showAccent={false}
        accent={{ key: "invite", headline: "", body: "" }}
      >
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--auth-text)]">
              Accept your invitation
            </h1>
            <p className="text-sm text-[var(--auth-muted)]">
              Set a password to activate your {PRODUCT_NAME} account.
            </p>
          </div>

          {invitationError ? (
            <div
              className="flex items-start gap-2 rounded-xl border p-4 text-sm"
              style={{ borderColor: "var(--auth-danger)", color: "var(--auth-danger)" }}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{invitationError}</span>
            </div>
          ) : invitation ? (
            <>
              <div
                className="rounded-xl border p-4"
                style={{ borderColor: "var(--auth-border)", background: "var(--auth-surface-2)" }}
              >
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 text-[var(--auth-teal-lt)]" />
                  <div className="text-sm">
                    <p className="text-[var(--auth-text)]">
                      You&apos;ve been invited to join{" "}
                      <span className="font-semibold">{invitation.organization?.name}</span> as{" "}
                      <span className="font-semibold capitalize">
                        {invitation.role.replace(/_/g, " ")}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleInviteSignUp} className="space-y-4" noValidate>
                <AuthInput
                  label="Email"
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  value={invitation.email}
                  readOnly
                  className="cursor-not-allowed opacity-80"
                />
                <AuthInput
                  label="Full name"
                  icon={<User className="h-4 w-4" />}
                  autoComplete="name"
                  placeholder="Your full name"
                  value={invName}
                  error={invErrors.name}
                  onChange={(e) => setInvName(e.target.value)}
                  onBlur={() =>
                    setInvErrors((p) => ({
                      ...p,
                      name: invName.trim().length < 2 ? "Full name must be at least 2 characters" : "",
                    }))
                  }
                />
                <AuthPasswordInput
                  label="Password"
                  icon={<Lock className="h-4 w-4" />}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  showStrength
                  value={invPassword}
                  error={invErrors.password}
                  onChange={(e) => setInvPassword(e.target.value)}
                />
                <AuthPasswordInput
                  label="Confirm password"
                  icon={<Lock className="h-4 w-4" />}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  matchValue={invPassword}
                  value={invConfirm}
                  error={invErrors.confirm}
                  onChange={(e) => setInvConfirm(e.target.value)}
                />
                <AuthSubmit loading={invBusy}>
                  {invBusy ? "Creating account…" : "Accept & create account"}
                </AuthSubmit>
              </form>
            </>
          ) : null}

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

  // ── Main split-panel screens ───────────────────────────────────────────
  const panelTransition = { duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <AuthShell accent={accent} accentSide={mode === "signup" ? "left" : "right"}>
      <div className="mx-auto w-full max-w-md">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: reduced ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={panelTransition}
            className="space-y-6"
          >
            {mode === "signin" && (
              <>
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-semibold tracking-tight text-[var(--auth-text)]">
                    Sign in
                  </h1>
                  <p className="text-sm text-[var(--auth-muted)]">
                    Welcome back. Access your organisation workspace.
                  </p>
                </div>

                <GoogleButton onClick={handleGoogle} loading={googleBusy} />
                {googleError && (
                  <p className="text-xs text-[var(--auth-danger)]">{googleError}</p>
                )}
                <AuthDivider />

                <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                  <AuthInput
                    label="Email"
                    icon={<Mail className="h-4 w-4" />}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@organisation.org"
                    value={email}
                    error={signInErrors.email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() =>
                      setSignInErrors((p) => ({
                        ...p,
                        email: isEmail(email) || !email ? "" : "Please enter a valid email",
                      }))
                    }
                  />
                  <AuthPasswordInput
                    label="Password"
                    icon={<Lock className="h-4 w-4" />}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    error={signInErrors.password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--auth-muted)]">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--auth-border)] accent-[var(--auth-teal-lt)]"
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-sm text-[var(--auth-teal-lt)] underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <AuthSubmit loading={signInBusy}>
                    {signInBusy ? "Signing in…" : "Sign in"}
                  </AuthSubmit>

                  {needsConfirm && (
                    <div className="rounded-lg border border-[var(--auth-border)] bg-white/5 p-3 text-sm">
                      <p className="text-[var(--auth-muted)]">
                        Didn't get the confirmation email, or the link expired?
                      </p>
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendBusy}
                        className="mt-2 text-sm font-medium text-[var(--auth-teal-lt)] underline-offset-4 hover:underline disabled:opacity-60"
                      >
                        {resendBusy ? "Sending…" : "Resend confirmation email"}
                      </button>
                      {resendNote && (
                        <p
                          className={`mt-2 text-xs ${
                            resendNote.ok ? "text-[var(--auth-teal-lt)]" : "text-[var(--auth-danger)]"
                          }`}
                        >
                          {resendNote.text}
                        </p>
                      )}
                    </div>
                  )}
                </form>

                <p className="text-center text-sm text-[var(--auth-muted)] lg:hidden">
                  New to {PRODUCT_NAME}?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-semibold text-[var(--auth-teal-lt)] underline-offset-4 hover:underline"
                  >
                    Create account
                  </button>
                </p>
              </>
            )}

            {mode === "signup" && (
              <>
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-semibold tracking-tight text-[var(--auth-text)]">
                    Create your account
                  </h1>
                  <p className="text-sm text-[var(--auth-muted)]">
                    Start managing programmes, funding and impact in one system.
                  </p>
                </div>

                <GoogleButton onClick={handleGoogle} loading={googleBusy} label="Sign up with Google" />
                {googleError && (
                  <p className="text-xs text-[var(--auth-danger)]">{googleError}</p>
                )}
                <AuthDivider />

                <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                  <AuthInput
                    label="Full name"
                    icon={<User className="h-4 w-4" />}
                    autoComplete="name"
                    placeholder="Your full name"
                    value={suName}
                    error={suErrors.name}
                    onChange={(e) => setSuName(e.target.value)}
                    onBlur={() =>
                      setSuErrors((p) => ({
                        ...p,
                        name:
                          suName.trim().length >= 2 || !suName
                            ? ""
                            : "Full name must be at least 2 characters",
                      }))
                    }
                  />
                  <AuthInput
                    label="Work email"
                    icon={<Mail className="h-4 w-4" />}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@organisation.org"
                    value={suEmail}
                    error={suErrors.email}
                    onChange={(e) => setSuEmail(e.target.value)}
                    onBlur={() =>
                      setSuErrors((p) => ({
                        ...p,
                        email: isEmail(suEmail) || !suEmail ? "" : "Please enter a valid email",
                      }))
                    }
                  />
                  <AuthPasswordInput
                    label="Password"
                    icon={<Lock className="h-4 w-4" />}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    showStrength
                    value={suPassword}
                    error={suErrors.password}
                    onChange={(e) => setSuPassword(e.target.value)}
                  />
                  <AuthPasswordInput
                    label="Confirm password"
                    icon={<Lock className="h-4 w-4" />}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    matchValue={suPassword}
                    value={suConfirm}
                    error={suErrors.confirm}
                    onChange={(e) => setSuConfirm(e.target.value)}
                  />

                  <AuthSubmit>Create account</AuthSubmit>
                  <p className="text-center text-xs text-[var(--auth-muted)]">
                    You&apos;ll create your organisation in the next step.
                  </p>
                </form>

                <p className="text-center text-sm text-[var(--auth-muted)] lg:hidden">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-semibold text-[var(--auth-teal-lt)] underline-offset-4 hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </>
            )}

            {mode === "forgot" && (
              <>
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-semibold tracking-tight text-[var(--auth-text)]">
                    Reset your password
                  </h1>
                  <p className="text-sm text-[var(--auth-muted)]">
                    We&apos;ll email you a secure link to set a new password.
                  </p>
                </div>

                {fpSent ? (
                  <div
                    className="flex items-start gap-3 rounded-xl border p-4 text-sm"
                    style={{
                      borderColor: "var(--auth-teal-lt)",
                      background: "rgba(31,168,145,0.10)",
                      color: "var(--auth-text)",
                    }}
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--auth-teal-lt)]" />
                    <span>
                      If an account exists for that address, we&apos;ve sent a reset link. Check your
                      inbox and spam folder.
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4" noValidate>
                    <AuthInput
                      label="Email"
                      icon={<Mail className="h-4 w-4" />}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@organisation.org"
                      value={fpEmail}
                      error={fpError ?? undefined}
                      onChange={(e) => setFpEmail(e.target.value)}
                      onBlur={() =>
                        setFpError(isEmail(fpEmail) || !fpEmail ? null : "Please enter a valid email")
                      }
                    />
                    <AuthSubmit loading={fpBusy}>
                      {fpBusy ? "Sending…" : "Send reset link"}
                    </AuthSubmit>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setFpSent(false);
                    switchMode("signin");
                  }}
                  className="inline-flex items-center gap-2 text-sm text-[var(--auth-muted)] transition-colors hover:text-[var(--auth-text)]"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </AuthShell>
  );
}
