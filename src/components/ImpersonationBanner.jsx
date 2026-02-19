import React from 'react';
import { Button } from './ui/button';
import { UserCheck, X, ShieldAlert } from 'lucide-react';
import { useImpersonation } from '../hooks/useImpersonation';
import { usePermissions } from '../hooks/usePermissions';

/**
 * Impersonation Banner Component
 * Displays when a Super Admin is impersonating another user
 * Shows the impersonated user's name and an option to exit
 * 
 * Uses isActualMasterAdmin() to check the real user's role,
 * since isMasterAdmin() returns the impersonated role.
 */
const ImpersonationBanner = () => {
  const { impersonatedUser, isImpersonatingUser, stopImpersonation } = useImpersonation();
  const { isActualMasterAdmin } = usePermissions();

  // Only show for actual Super Admins who are impersonating
  if (!isActualMasterAdmin() || !isImpersonatingUser || !impersonatedUser) {
    return null;
  }

  const displayName = impersonatedUser.full_name || impersonatedUser.email?.split('@')[0] || 'User';
  const companyName = impersonatedUser.company_name;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5" />
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span className="font-medium">
            Impersonating: <strong>{displayName}</strong>
            {companyName && (
              <span className="opacity-90 ml-1">
                ({companyName})
              </span>
            )}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={stopImpersonation}
        className="text-white hover:bg-amber-600 hover:text-white gap-2"
      >
        <X className="h-4 w-4" />
        Exit Impersonation
      </Button>
    </div>
  );
};

export default ImpersonationBanner;
