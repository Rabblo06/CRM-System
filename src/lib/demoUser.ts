const DEMO_USER_KEY = 'crm_demo_user_email';

export function getDemoUserEmail(): string {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem(DEMO_USER_KEY) || 'default';
}

export function setDemoUserEmail(email: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_USER_KEY, email.trim().toLowerCase());
}

/** Returns a user-scoped localStorage key so each account has isolated data */
export function userKey(baseKey: string): string {
  const email = getDemoUserEmail();
  const slug = email.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${baseKey}__${slug}`;
}

/** True when no real user is logged in (anonymous demo mode) */
export function isAnonymousUser(): boolean {
  return getDemoUserEmail() === 'default';
}
