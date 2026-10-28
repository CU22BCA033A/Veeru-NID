/**
 * Supabase Auth needs an email, but people sign in with a simple username. Usernames map to
 * an address on a reserved, non-deliverable domain (RFC 2606), e.g. Veeru04 → veeru04@nidprep.example.com.
 */
export const USERNAME_DOMAIN = "nidprep.example.com";
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;

export function loginToEmail(login: string): string {
  const v = login.trim();
  return v.includes("@") ? v.toLowerCase() : `${v.toLowerCase()}@${USERNAME_DOMAIN}`;
}

export function emailToUsername(email: string | undefined): string | null {
  if (!email?.endsWith(`@${USERNAME_DOMAIN}`)) return null;
  return email.slice(0, -USERNAME_DOMAIN.length - 1);
}
