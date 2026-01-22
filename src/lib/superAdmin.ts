// Super Admin Configuration
// Only this email has access to the Infera System Administration

export const SUPER_ADMIN_EMAIL = 'inferatechsolutions@gmail.com';

export function isSuperAdmin(email: string | undefined | null): boolean {
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}
