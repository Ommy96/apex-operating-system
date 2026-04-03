// Super Admin Configuration
// Email is read from environment variable to avoid hardcoded credentials in source code.
// Set VITE_SUPER_ADMIN_EMAIL in your .env or Supabase project settings.

export const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';

export function isSuperAdmin(email: string | undefined | null): boolean {
  if (!SUPER_ADMIN_EMAIL) return false;
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}
