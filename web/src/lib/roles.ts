import { WEB_ROLES, type Role } from '@shared/constants';

/** manager / owner use the website; everyone else (and no role) gets the wrong-role page. */
export function isWebRole(role: Role | null | undefined): boolean {
  return role != null && (WEB_ROLES as readonly Role[]).includes(role);
}
