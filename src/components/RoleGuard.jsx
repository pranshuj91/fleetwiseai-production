import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

/**
 * RoleGuard Component
 * Protects routes based on user roles and permissions
 * 
 * Usage:
 * <RoleGuard allowedRoles={['technician', 'shop_supervisor']}>
 *   <ComponentToProtect />
 * </RoleGuard>
 * 
 * OR with permissions:
 * <RoleGuard requiredPermission={{ resource: 'projects', action: 'create' }}>
 *   <ComponentToProtect />
 * </RoleGuard>
 */
const RoleGuard = ({ 
  children, 
  allowedRoles = [], 
  requiredPermission = null,
  redirectTo = '/'
}) => {
  const { user } = useAuth();
  const { hasPermission, getRole } = usePermissions();
  
  const userRole = getRole();
  
  // Check role-based access
  if (allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      console.warn(`Access denied: User role "${userRole}" not in allowed roles [${allowedRoles.join(', ')}]`);
      return <Navigate to={redirectTo} replace />;
    }
  }
  
  // Check permission-based access
  if (requiredPermission) {
    const { resource, action } = requiredPermission;
    if (!hasPermission(resource, action)) {
      console.warn(`Access denied: User lacks permission "${action}" on "${resource}"`);
      return <Navigate to={redirectTo} replace />;
    }
  }
  
  // Access granted
  return children;
};

export default RoleGuard;
