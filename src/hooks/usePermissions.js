import { useAuth } from '../contexts/AuthContext';

/**
 * Permission Management Hook
 * Provides role-based access control for UI elements and routes
 * Uses profile.role for role determination with safe fallbacks
 * 
 * IMPERSONATION SUPPORT:
 * When a Super Admin is impersonating a user, all role checks use the
 * impersonated user's role instead of the actual user's role.
 * Use isActualMasterAdmin() to check the real role when needed.
 */

const PERMISSIONS = {
  master_admin: {
    companies: ['create', 'read', 'update', 'delete'],
    users: ['create', 'read', 'update', 'delete'],
    trucks: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete', 'assign'],
    diagnostics: ['read', 'generate'],
    summaries: ['read', 'generate'],
    warranty: ['read', 'analyze'],
    customers: ['create', 'read', 'update', 'delete'],
    estimates: ['create', 'read', 'update', 'delete', 'approve'],
    invoices: ['create', 'read', 'update', 'delete'],
    parts: ['create', 'read', 'update', 'delete', 'order', 'approve'],
    pricing: ['read', 'update'],
    reports: ['read', 'generate'],
    knowledge: ['read', 'curate'],
    safety: ['create', 'read', 'update', 'delete'],
    team: ['read', 'manage'],
    allCompanies: true
  },
  company_admin: {
    companies: ['read', 'update'],
    users: ['create', 'read', 'update'],
    trucks: ['create', 'read', 'update', 'delete'],
    projects: ['create', 'read', 'update', 'delete', 'assign'],
    diagnostics: ['read', 'generate'],
    summaries: ['read', 'generate'],
    warranty: ['read', 'analyze'],
    customers: ['create', 'read', 'update', 'delete'],
    estimates: ['create', 'read', 'update', 'delete', 'approve'],
    invoices: ['create', 'read', 'update', 'delete'],
    parts: ['create', 'read', 'update', 'delete', 'order', 'approve'],
    pricing: ['read', 'update'],
    reports: ['read', 'generate'],
    knowledge: ['create', 'read', 'update', 'delete', 'curate', 'submit'],
    safety: ['create', 'read', 'update', 'delete'],
    team: ['read', 'manage'],
    allCompanies: false
  },
  office_manager: {
    companies: ['read'],
    users: ['create', 'read'],
    trucks: ['create', 'read', 'update'],
    projects: ['create', 'read', 'update', 'assign'],
    diagnostics: ['read'],
    summaries: ['read'],
    warranty: ['read'],
    customers: ['create', 'read', 'update'],
    estimates: ['create', 'read', 'update', 'approve'],
    invoices: ['create', 'read', 'update'],
    parts: ['create', 'read', 'update', 'order'],
    pricing: ['read', 'update'],
    reports: ['read', 'generate'],
    knowledge: ['read', 'submit', 'curate'],
    safety: ['read'],
    team: ['read', 'manage'],
    allCompanies: false
  },
  shop_supervisor: {
    companies: ['read'],
    users: ['read'],
    trucks: ['create', 'read', 'update'],
    projects: ['create', 'read', 'update', 'assign'],
    diagnostics: ['read', 'generate'],
    summaries: ['read', 'generate'],
    warranty: ['read'],
    customers: ['read'],
    estimates: ['read'],
    invoices: ['read'],
    parts: ['create', 'read', 'update', 'approve'],
    pricing: ['read'],
    reports: ['read'],
    knowledge: ['create', 'read', 'submit'],
    safety: ['create', 'read', 'update', 'delete'],
    team: ['read', 'manage'],
    allCompanies: false
  },
  technician: {
    companies: ['read'],
    users: ['read'],
    trucks: ['read'],
    projects: ['create', 'read', 'update'],
    diagnostics: ['read', 'generate'],
    summaries: ['read'],
    warranty: ['read'],
    customers: ['read'],
    estimates: ['read'],
    invoices: ['read'],
    parts: ['read'],
    pricing: [],
    reports: [],
    knowledge: ['create', 'read', 'submit'],
    safety: ['read'],
    team: ['read'],
    allCompanies: false
  }
};

// Get impersonation state from sessionStorage
const getImpersonatedUser = () => {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem('fleetwise_impersonated_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
};

export const usePermissions = () => {
  const { user, profile } = useAuth();
  
  // Get impersonated user data if any
  const impersonatedUser = getImpersonatedUser();
  const isImpersonating = !!impersonatedUser;
  
  // The actual role of the logged-in user (ignores impersonation)
  const actualRole = profile?.role || (user ? 'company_admin' : null);
  
  // The effective role - uses impersonated role when impersonating
  const role = isImpersonating ? impersonatedUser.role : actualRole;
  
  const hasPermission = (resource, action) => {
    // If no role determined, allow basic access for authenticated users
    if (!role) return !!user;
    
    const rolePermissions = PERMISSIONS[role] || PERMISSIONS['company_admin'] || {};
    const resourcePermissions = rolePermissions[resource] || [];
    
    return resourcePermissions.includes(action);
  };
  
  const canAccessAllCompanies = () => {
    if (!role) return false;
    return PERMISSIONS[role]?.allCompanies || false;
  };
  
  const isAdmin = () => {
    // When impersonating, use impersonated role
    return user && (role === 'master_admin' || role === 'company_admin' || (!isImpersonating && !profile?.role));
  };
  
  const isTechnician = () => {
    return user && role === 'technician';
  };
  
  const isMasterAdmin = () => {
    // When impersonating, this returns false (we're acting as the impersonated user)
    return user && role === 'master_admin';
  };
  
  // Check if the ACTUAL logged-in user is a master admin (ignores impersonation)
  // Use this for impersonation banner and exit functionality
  const isActualMasterAdmin = () => {
    return user && actualRole === 'master_admin';
  };
  
  const isOfficeManager = () => {
    return user && role === 'office_manager';
  };
  
  const isShopSupervisor = () => {
    return user && role === 'shop_supervisor';
  };
  
  const isCompanyAdmin = () => {
    return user && role === 'company_admin';
  };
  
  const getRole = () => {
    return role;
  };
  
  // Get the actual role of the logged-in user (ignores impersonation)
  const getActualRole = () => {
    return actualRole;
  };
  
  return {
    hasPermission,
    canAccessAllCompanies,
    isAdmin,
    isTechnician,
    isMasterAdmin,
    isActualMasterAdmin,
    isOfficeManager,
    isShopSupervisor,
    isCompanyAdmin,
    getRole,
    getActualRole,
    isImpersonating,
  };
};
