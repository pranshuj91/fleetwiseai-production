import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const IMPERSONATION_KEY = 'fleetwise_impersonated_user';

/**
 * User Impersonation Hook
 * Allows Super Admins to impersonate other users
 * Stores impersonation state in sessionStorage
 * 
 * Note: This hook checks the actual profile role directly,
 * NOT the effective role from usePermissions, to avoid circular dependencies.
 */
export const useImpersonation = () => {
  const { profile: currentProfile } = useAuth();
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  // Load impersonation state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(IMPERSONATION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setImpersonatedUser(parsed);
        } catch (e) {
          console.warn('Failed to parse impersonated user:', e);
          sessionStorage.removeItem(IMPERSONATION_KEY);
        }
      }
    }
  }, []);

  /**
   * Start impersonating a user
   * Uses isActualMasterAdmin to check the real logged-in user's role
   * @param {Object} user - The user to impersonate (must have user_id, full_name, email, role, company_id)
   */
  const startImpersonation = useCallback((user) => {
    // Use the actual role check, not the effective role
    const actualRole = currentProfile?.role;
    if (actualRole !== 'master_admin') {
      console.warn('Only Super Admins can impersonate users');
      return false;
    }

    // Don't allow impersonating yourself
    if (user.user_id === currentProfile?.user_id) {
      console.warn('Cannot impersonate yourself');
      return false;
    }

    // Don't allow impersonating other Super Admins
    if (user.role === 'master_admin') {
      console.warn('Cannot impersonate Super Admin users');
      return false;
    }

    const impersonationData = {
      user_id: user.user_id,
      full_name: user.full_name || user.email?.split('@')[0] || 'User',
      email: user.email,
      role: user.role,
      company_id: user.company_id,
      company_name: user.company?.name || user.company_name || null,
      started_at: new Date().toISOString(),
    };

    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impersonationData));
    
    // Also set the company impersonation for data scoping
    if (user.company_id) {
      sessionStorage.setItem('fleetwise_active_company_id', user.company_id);
    }

    setImpersonatedUser(impersonationData);

    // Reload the page to apply impersonation across all components
    window.location.reload();

    return true;
  }, [currentProfile]);

  /**
   * Stop impersonating and return to Super Admin view
   */
  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem(IMPERSONATION_KEY);
    sessionStorage.removeItem('fleetwise_active_company_id');
    setImpersonatedUser(null);

    // Reload the page to clear impersonation state
    window.location.reload();
  }, []);

  /**
   * Check if currently impersonating a user
   */
  const isImpersonatingUser = !!impersonatedUser;

  /**
   * Get the effective user profile (impersonated or current)
   */
  const getEffectiveProfile = useCallback(() => {
    if (impersonatedUser) {
      return {
        ...currentProfile,
        // Override with impersonated user's data
        user_id: impersonatedUser.user_id,
        full_name: impersonatedUser.full_name,
        email: impersonatedUser.email,
        role: impersonatedUser.role,
        company_id: impersonatedUser.company_id,
        company_name: impersonatedUser.company_name,
        _isImpersonated: true,
        _originalProfile: currentProfile,
      };
    }
    return currentProfile;
  }, [impersonatedUser, currentProfile]);

  /**
   * Check if a user can be impersonated
   * Uses actual role, not effective role
   */
  const canImpersonate = useCallback((user) => {
    const actualRole = currentProfile?.role;
    if (actualRole !== 'master_admin') return false;
    if (user.user_id === currentProfile?.user_id) return false;
    if (user.role === 'master_admin') return false;
    return true;
  }, [currentProfile]);

  return {
    impersonatedUser,
    isImpersonatingUser,
    startImpersonation,
    stopImpersonation,
    getEffectiveProfile,
    canImpersonate,
  };
};

export default useImpersonation;
