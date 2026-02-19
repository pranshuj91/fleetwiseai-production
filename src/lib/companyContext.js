import { supabase } from '@/integrations/supabase/client';

const IMPERSONATION_KEY = 'fleetwise_impersonated_user';
const ACTIVE_COMPANY_KEY = 'fleetwise_active_company_id';

/**
 * Get the effective company ID for data fetching
 * This respects the impersonation context:
 * 1. First checks for active impersonation session (highest priority)
 * 2. Falls back to the logged-in user's profile company_id
 * 
 * Use this in all service functions that need to scope data by company.
 */
export const getEffectiveCompanyId = async () => {
  // Check for impersonation first (sessionStorage)
  if (typeof window !== 'undefined') {
    // Check direct active company ID (set during impersonation)
    const activeCompanyId = sessionStorage.getItem(ACTIVE_COMPANY_KEY);
    if (activeCompanyId) {
      console.log('[CompanyContext] Using impersonated company_id:', activeCompanyId);
      return activeCompanyId;
    }
    
    // Also check impersonated user data for company_id
    const impersonatedData = sessionStorage.getItem(IMPERSONATION_KEY);
    if (impersonatedData) {
      try {
        const parsed = JSON.parse(impersonatedData);
        if (parsed?.company_id) {
          console.log('[CompanyContext] Using impersonated user company_id:', parsed.company_id);
          return parsed.company_id;
        }
      } catch (e) {
        console.warn('[CompanyContext] Failed to parse impersonation data:', e);
      }
    }
  }
  
  // Fall back to current user's profile company_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  console.log('[CompanyContext] Using profile company_id:', profile?.company_id);
  return profile?.company_id;
};

/**
 * Check if currently in impersonation mode
 */
export const isImpersonating = () => {
  if (typeof window === 'undefined') return false;
  return !!sessionStorage.getItem(IMPERSONATION_KEY);
};

/**
 * Get the impersonated user data
 */
export const getImpersonatedUser = () => {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(IMPERSONATION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
};

export default {
  getEffectiveCompanyId,
  isImpersonating,
  getImpersonatedUser,
};
