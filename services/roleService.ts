import { User, getIdTokenResult } from 'firebase/auth';
import type { AppRole } from '../types/user';

const normalizeClaimRole = (claims: Record<string, unknown>): AppRole | null => {
  if (claims.role === 'student' || claims.role === 'lecturer' || claims.role === 'admin') {
    return claims.role;
  }

  if (claims.admin === true) {
    return 'admin';
  }

  return null;
};

export const getUserClaimRole = async (user: User): Promise<AppRole | null> => {
  const tokenResult = await getIdTokenResult(user, true);
  return normalizeClaimRole(tokenResult.claims);
};

export const assertRoleAccess = async (
  user: User,
  expectedRole: AppRole,
  fallbackRole?: AppRole | null
) => {
  const claimRole = await getUserClaimRole(user);

  if (claimRole && claimRole !== expectedRole) {
    throw new Error(`This account is not allowed to access the ${expectedRole} portal.`);
  }

  if (!claimRole && fallbackRole && fallbackRole !== expectedRole) {
    throw new Error(`This account is not configured as a ${expectedRole}.`);
  }
};
