import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const IMPERSONATION_KEY = 'fleetwise_impersonated_user';
const ACTIVE_COMPANY_KEY = 'fleetwise_active_company_id';

/**
 * Hook to get the effective company ID for the current user
 * Respects impersonation context for Super Admins
 * 
 * Returns:
 * - effectiveCompanyId: The company ID to use for data fetching
 * - isImpersonating: Whether the user is currently impersonating
 * - impersonatedUser: The impersonated user data if any
 */
export const useEffectiveCompany = () => {
  const { profile, isMasterAdmin } = useAuth();

  const impersonatedUser = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }, []);

  const effectiveCompanyId = useMemo(() => {
    // Check for active company ID in sessionStorage (set during impersonation)
    if (typeof window !== 'undefined') {
      const activeCompanyId = sessionStorage.getItem(ACTIVE_COMPANY_KEY);
      if (activeCompanyId) {
        return activeCompanyId;
      }
      
      // Also check impersonated user data
      if (impersonatedUser?.company_id) {
        return impersonatedUser.company_id;
      }
    }
    
    // Fall back to profile company_id
    return profile?.company_id;
  }, [profile, impersonatedUser]);

  const isImpersonating = !!impersonatedUser;

  return {
    effectiveCompanyId,
    isImpersonating,
    impersonatedUser,
    // For backward compatibility
    companyId: effectiveCompanyId,
  };
};

export default useEffectiveCompany;
