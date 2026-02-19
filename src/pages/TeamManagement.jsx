import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Users, UserPlus, Search, Edit, Trash2, Shield, Wrench, 
  Mail, Phone, Calendar, CheckCircle, X, Loader2, Building2, Crown,
  UserX, UserCheck, AlertTriangle, ClipboardList, CheckCircle2, Eye,
  RefreshCw, Link2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client.js';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { useImpersonation } from '../hooks/useImpersonation';
import { toast } from 'sonner';
import { getCleanFetch } from '@/lib/cleanFetch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const TeamManagement = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isMasterAdmin, isAdmin, isActualMasterAdmin, isOfficeManager, hasPermission, getRole, isImpersonating } = usePermissions();
  const { canImpersonate, startImpersonation, isImpersonatingUser, impersonatedUser } = useImpersonation();
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [memberToImpersonate, setMemberToImpersonate] = useState(null);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null); // {name, role, email}

  // Get effective role - respects impersonation
  const effectiveRole = getRole();
  
  // Check if user can manage team (only company_admin+ or actual master_admin not impersonating)
  const canManageTeam = hasPermission('team', 'manage');
  
  // Check if user should see the team management page at all
  // Non-admin users can see their own profile card
  const canViewTeamPage = effectiveRole === 'master_admin' || 
                          effectiveRole === 'company_admin' || 
                          effectiveRole === 'shop_supervisor' ||
                          effectiveRole === 'office_manager';
  
  // Non-admin impersonated users (like technicians) see only their own card
  const isNonAdminImpersonatedUser = isImpersonatingUser && !canViewTeamPage;

  // Get effective company ID - for super admins, check if they're impersonating
  const getEffectiveCompanyId = () => {
    // Check for impersonation in sessionStorage
    const impersonatedCompanyId = typeof window !== 'undefined' 
      ? sessionStorage.getItem('fleetwise_active_company_id') 
      : null;
    
    // When actually impersonating as master_admin
    if (isActualMasterAdmin() && impersonatedCompanyId) {
      return impersonatedCompanyId;
    }
    
    return profile?.company_id;
  };

  const effectiveCompanyId = getEffectiveCompanyId();
  
  // Super Admin global view = actual master admin not currently impersonating
  const isActualSuperAdminNotImpersonating = isActualMasterAdmin() && !isImpersonatingUser;

  // Default role for new team members
  const getDefaultRole = () => {
    return 'technician';
  };

  const [newMember, setNewMember] = useState({
    full_name: '',
    username: '',
    email: '',
    role: 'technician',
    phone: '',
    company_id: ''
  });

  const [validationErrors, setValidationErrors] = useState({});

  const roles = [
    { value: 'master_admin', label: 'Super Admin', color: 'bg-amber-500', icon: Crown, adminOnly: true },
    { value: 'company_admin', label: 'Company Admin', color: 'bg-purple-500', icon: Shield, adminOnly: false },
    { value: 'office_manager', label: 'Office Manager', color: 'bg-blue-500', icon: Building2, adminOnly: false },
    { value: 'shop_supervisor', label: 'Shop Supervisor', color: 'bg-teal-500', icon: Users, adminOnly: false },
    { value: 'technician', label: 'Technician', color: 'bg-green-500', icon: Wrench, adminOnly: false }
  ];

  // Filter roles based on user permissions
  // Actual Super Admins (not impersonating) can add any role type
  const getAvailableRoles = () => {
    return roles.filter(role => {
      if (role.adminOnly && !isActualMasterAdmin()) return false;
      return true;
    });
  };

  const availableRoles = getAvailableRoles();

  // Fetch companies list for Super Admin dropdown (only when actual master admin)
  const fetchCompanies = async () => {
    if (!isActualMasterAdmin()) return;
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching companies:', error);
        return;
      }
      
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  useEffect(() => {
    // For Super Admin not impersonating, fetch other Super Admins
    // Otherwise, fetch team members for the effective company
    if (profile !== undefined) {
      fetchTeamMembers();
      // Actual Super Admins need the companies list for user creation
      if (isActualMasterAdmin()) {
        fetchCompanies();
      }
    }
  }, [effectiveCompanyId, profile]);

  // Real-time subscription for team member updates with deduplication
  useEffect(() => {
    if (profile === undefined) return;

    let lastFetchTime = 0;
    const DEBOUNCE_MS = 1000; // Debounce rapid changes

    const debouncedFetch = () => {
      const now = Date.now();
      if (now - lastFetchTime > DEBOUNCE_MS) {
        lastFetchTime = now;
        fetchTeamMembers();
      }
    };

    // Subscribe to profiles changes with company filter when applicable
    const profilesChannel = supabase
      .channel(`team-profiles-changes-${effectiveCompanyId || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          ...(effectiveCompanyId && !isActualSuperAdminNotImpersonating ? { filter: `company_id=eq.${effectiveCompanyId}` } : {}),
        },
        (payload) => {
          console.log('Profiles change detected:', payload);
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        console.log('Profiles subscription status:', status);
      });

    // Subscribe to user_roles changes
    const rolesChannel = supabase
      .channel(`team-roles-changes-${effectiveCompanyId || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles',
          ...(effectiveCompanyId && !isActualSuperAdminNotImpersonating ? { filter: `company_id=eq.${effectiveCompanyId}` } : {}),
        },
        (payload) => {
          console.log('User roles change detected:', payload);
          debouncedFetch();
        }
      )
      .subscribe((status) => {
        console.log('Roles subscription status:', status);
      });

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, [profile, effectiveCompanyId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);

      // Actual Super Admin NOT impersonating - show ALL users across ALL companies
      if (isActualSuperAdminNotImpersonating) {
        // 1) Fetch ALL profiles globally with their companies
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            *,
            companies(id, name)
          `)
          .order('created_at', { ascending: false });

        // 2) Fetch ALL roles globally
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role, company_id');

        // 3) Fetch ALL work order task stats globally
        const { data: tasksData, error: tasksError } = await supabase
          .from('work_order_tasks')
          .select('assigned_to, status')
          .not('assigned_to', 'is', null);

        if (profilesError) {
          console.error('Error fetching team members:', profilesError);
          toast.error('Failed to load team members');
          setLoading(false);
          return;
        }

        if (rolesError) {
          console.warn('Error fetching user roles:', rolesError);
        }

        if (tasksError) {
          console.warn('Error fetching task stats:', tasksError);
        }

        const rolesByUserId = (rolesData || []).reduce((acc, row) => {
          acc[row.user_id] = row.role;
          return acc;
        }, {});

        // Calculate task stats per user
        const taskStats = (tasksData || []).reduce((acc, task) => {
          const userId = task.assigned_to;
          if (!acc[userId]) {
            acc[userId] = { active: 0, completed: 0 };
          }
          if (task.status === 'completed') {
            acc[userId].completed += 1;
          } else {
            acc[userId].active += 1;
          }
          return acc;
        }, {});

        const transformedData = (profilesData || []).map((member) => ({
          ...member,
          role: rolesByUserId[member.user_id] || member.role || 'technician',
          company: member.companies,
          taskStats: taskStats[member.user_id] || { active: 0, completed: 0 },
        }));

        setTeamMembers(transformedData);
        setLoading(false);
        return;
      }

      // Regular flow: Company Admin or Super Admin impersonating
      if (!effectiveCompanyId) {
        setLoading(false);
        return;
      }

      const companyId = effectiveCompanyId;

      // 1) Fetch profiles scoped by company
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          companies(id, name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // 2) Fetch roles for this company
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('company_id', companyId);

      // 3) Fetch work order task stats for this company
      const { data: tasksData, error: tasksError } = await supabase
        .from('work_order_tasks')
        .select('assigned_to, status')
        .eq('company_id', companyId)
        .not('assigned_to', 'is', null);

      if (profilesError) {
        console.error('Error fetching team members:', profilesError);
        toast.error('Failed to load team members');
        return;
      }

      if (rolesError) {
        console.warn('Error fetching user roles:', rolesError);
      }

      if (tasksError) {
        console.warn('Error fetching task stats:', tasksError);
      }

      const rolesByUserId = (rolesData || []).reduce((acc, row) => {
        acc[row.user_id] = row.role;
        return acc;
      }, {});

      // Calculate task stats per user
      const taskStats = (tasksData || []).reduce((acc, task) => {
        const userId = task.assigned_to;
        if (!acc[userId]) {
          acc[userId] = { active: 0, completed: 0 };
        }
        if (task.status === 'completed') {
          acc[userId].completed += 1;
        } else {
          acc[userId].active += 1;
        }
        return acc;
      }, {});

      const transformedData = (profilesData || []).map((member) => ({
        ...member,
        role: rolesByUserId[member.user_id] || member.role || 'technician',
        company: member.companies,
        taskStats: taskStats[member.user_id] || { active: 0, completed: 0 },
      }));

      setTeamMembers(transformedData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    (member.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (member.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (member.role?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj?.color || 'bg-gray-500';
  };

  const getRoleIcon = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj?.icon || Shield;
  };

  const getRoleLabel = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj?.label || role;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!newMember.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }
    
    if (!newMember.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(newMember.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!newMember.role) {
      errors.role = 'Role is required';
    }

    // Super Admins adding other Super Admins don't need a company_id
    const isAddingSuperAdmin = newMember.role === 'master_admin';
    const targetCompanyId = effectiveCompanyId || newMember.company_id;
    if (!targetCompanyId && !isAddingSuperAdmin) {
      errors.company_id = 'Please select a company';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddMember = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    // Use the selected company from dropdown if explicitly set, otherwise fall back to effective company ID
    // For Super Admin role, company_id can be null
    const isAddingSuperAdmin = newMember.role === 'master_admin';
    // Priority: explicitly selected company from dropdown > effective company ID
    const targetCompanyId = isAddingSuperAdmin ? null : (newMember.company_id || effectiveCompanyId);

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to add team members');
      }

      const cleanFetch = getCleanFetch();
      const response = await cleanFetch(
        `https://jdiowphmzsqvpizlwlzn.supabase.co/functions/v1/manage-users/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkaW93cGhtenNxdnBpemx3bHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODcxOTIsImV4cCI6MjA4MTM2MzE5Mn0.t2aOo0bUrWtdFEBCeHbGcjn-IAQvoPqDm-PPnOR5D44',
          },
          body: JSON.stringify({
            email: newMember.email.trim(),
            full_name: newMember.full_name.trim(),
            username: newMember.username.trim() || undefined,
            phone: newMember.phone.trim() || undefined,
            role: newMember.role,
            company_id: targetCompanyId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (result.error?.includes('already registered') || result.error?.includes('already exists')) {
          throw new Error('A user with this email already exists');
        }
        throw new Error(result.error || 'Failed to create user');
      }

      // Immediately add the new member to local state for instant feedback
      const newMemberData = {
        id: result.user?.id || crypto.randomUUID(),
        user_id: result.user?.id,
        full_name: newMember.full_name.trim(),
        username: newMember.username.trim() || null,
        email: newMember.email.trim(),
        role: newMember.role,
        company_id: targetCompanyId,
        created_at: new Date().toISOString(),
        is_disabled: true,
        taskStats: { active: 0, completed: 0 },
      };

      // Only add to local state if it would be visible in current view
      // Super Admin with company sees their company team, so new members in that company are visible
      const superAdminWithCompany = isActualMasterAdmin() && !isImpersonatingUser && profile?.company_id;
      const shouldBeVisible = 
        (superAdminWithCompany && targetCompanyId === profile.company_id) ||
        (isActualMasterAdmin() && !isImpersonatingUser && !profile?.company_id && newMember.role === 'master_admin') ||
        ((!isActualMasterAdmin() || isImpersonatingUser) && targetCompanyId === effectiveCompanyId);

      if (shouldBeVisible) {
        setTeamMembers(prev => [newMemberData, ...prev]);
      }

      const roleLabels = {
        master_admin: 'Super Admin',
        company_admin: 'Company Admin',
        office_manager: 'Office Manager',
        shop_supervisor: 'Shop Supervisor',
        technician: 'Technician'
      };
      
      setShowAddModal(false);
      setInviteSuccess({
        name: newMember.full_name.trim(),
        role: roleLabels[newMember.role] || newMember.role,
        email: newMember.email.trim()
      });
      setNewMember({
        full_name: '',
        username: '',
        email: '',
        role: 'technician',
        phone: '',
        company_id: ''
      });
      setValidationErrors({});
      
      // Refetch to ensure data consistency and get any missing fields
      setTimeout(() => fetchTeamMembers(), 500);
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error(error.message || 'Failed to add team member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditMember = async () => {
    if (!editingMember) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const cleanFetch = getCleanFetch();
      const response = await cleanFetch(
        `https://jdiowphmzsqvpizlwlzn.supabase.co/functions/v1/manage-users/update`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkaW93cGhtenNxdnBpemx3bHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODcxOTIsImV4cCI6MjA4MTM2MzE5Mn0.t2aOo0bUrWtdFEBCeHbGcjn-IAQvoPqDm-PPnOR5D44',
          },
          body: JSON.stringify({
            user_id: editingMember.user_id,
            full_name: editingMember.full_name,
            username: editingMember.username,
            role: editingMember.role,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      toast.success('Team member updated successfully');
      setShowEditModal(false);
      setEditingMember(null);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error(error.message || 'Failed to update team member');
    } finally {
      setActionLoading(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (member) => {
    setMemberToDelete(member);
    setShowDeleteDialog(true);
  };

  // Perform the actual delete after confirmation
  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    
    setShowDeleteDialog(false);
    setActionLoading(true);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('You must be logged in to delete team members');
      }

      console.log('Deleting member:', memberToDelete.user_id, memberToDelete.full_name);
      
      // Use POST with action in body for more reliable cross-browser support
      const cleanFetch = getCleanFetch();
      const response = await cleanFetch(
        `https://jdiowphmzsqvpizlwlzn.supabase.co/functions/v1/manage-users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkaW93cGhtenNxdnBpemx3bHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODcxOTIsImV4cCI6MjA4MTM2MzE5Mn0.t2aOo0bUrWtdFEBCeHbGcjn-IAQvoPqDm-PPnOR5D44',
          },
          body: JSON.stringify({
            action: 'delete',
            user_id: memberToDelete.user_id,
          }),
        }
      );

      console.log('Delete response status:', response.status);
      
      const result = await response.json();
      console.log('Delete response body:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      // CRITICAL: Immediately update local state for instant UI feedback
      setTeamMembers(prevMembers => prevMembers.filter(m => m.user_id !== memberToDelete.user_id));
      
      toast.success('Team member removed successfully');
      
      // Also refetch to ensure consistency with database
      await fetchTeamMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error(error.message || 'Failed to remove team member');
    } finally {
      setActionLoading(false);
      setMemberToDelete(null);
    }
  };

  const handleToggleStatus = async (member) => {
    const newStatus = !member.is_disabled;
    const actionText = newStatus ? 'disable' : 'enable';
    
    if (!window.confirm(`Are you sure you want to ${actionText} ${member.full_name || member.email}?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const cleanFetch = getCleanFetch();
      const response = await cleanFetch(
        `https://jdiowphmzsqvpizlwlzn.supabase.co/functions/v1/manage-users/toggle-status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkaW93cGhtenNxdnBpemx3bHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODcxOTIsImV4cCI6MjA4MTM2MzE5Mn0.t2aOo0bUrWtdFEBCeHbGcjn-IAQvoPqDm-PPnOR5D44',
          },
          body: JSON.stringify({
            user_id: member.user_id,
            is_disabled: newStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${actionText} user`);
      }

      toast.success(`Team member ${newStatus ? 'disabled' : 'enabled'} successfully`);
      fetchTeamMembers();
    } catch (error) {
      console.error(`Error ${actionText}ing member:`, error);
      toast.error(error.message || `Failed to ${actionText} team member`);
    } finally {
      setActionLoading(false);
    }
  };
  const handleResendInvite = async (member) => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const cleanFetch = getCleanFetch();
      const response = await cleanFetch(
        `https://jdiowphmzsqvpizlwlzn.supabase.co/functions/v1/manage-users/resend-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkaW93cGhtenNxdnBpemx3bHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODcxOTIsImV4cCI6MjA4MTM2MzE5Mn0.t2aOo0bUrWtdFEBCeHbGcjn-IAQvoPqDm-PPnOR5D44',
          },
          body: JSON.stringify({
            user_id: member.user_id,
            email: member.email,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend invite');
      }
      toast.success(`Invite email resent to ${member.email}`);
    } catch (error) {
      console.error('Error resending invite:', error);
      toast.error(error.message || 'Failed to resend invite email');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (member) => {
    setEditingMember({
      user_id: member.user_id,
      full_name: member.full_name || '',
      username: member.username || '',
      email: member.email || '',
      role: member.role || 'technician',
    });
    setShowEditModal(true);
  };

  // Super Admin viewing context - global view when actual master admin and not impersonating
  const isSuperAdminGlobalView = isActualSuperAdminNotImpersonating;

  // Stats calculations
  const totalMembers = teamMembers.length;
  const technicianCount = teamMembers.filter(m => m.role === 'technician').length;
  const companyAdminCount = teamMembers.filter(m => m.role === 'company_admin').length;
  const superAdminCount = teamMembers.filter(m => m.role === 'master_admin').length;
  
  // Count unique companies from team members
  const uniqueCompanyIds = new Set(teamMembers.map(m => m.company_id).filter(Boolean));
  const totalCompanies = isSuperAdminGlobalView ? companies.length : 1;
  
  // Workers = all non-company_admin and non-master_admin users
  const otherWorkersCount = teamMembers.filter(m => 
    !['master_admin', 'company_admin'].includes(m.role)
  ).length;
  
  // Aggregate work order stats (for company view)
  const totalActiveTasks = teamMembers.reduce((sum, m) => sum + (m.taskStats?.active || 0), 0);
  const totalCompletedTasks = teamMembers.reduce((sum, m) => sum + (m.taskStats?.completed || 0), 0);

  // For non-admin impersonated users (like technicians), show their own profile card
  if (!canViewTeamPage) {
    // Get impersonated user's profile info
    const userProfile = impersonatedUser || profile;
    const RoleIcon = getRoleIcon(effectiveRole);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
              <Users className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8 text-[#124481] flex-shrink-0" />
              <span className="truncate">My Profile</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Your team member profile
            </p>
          </div>
          
          {/* User's own profile card */}
          <Card className="max-w-lg hover:shadow-lg transition-shadow">
            <CardContent className="pt-6 pb-4">
              {/* Header with avatar, name */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <RoleIcon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {userProfile?.full_name || 'No name'}
                  </h3>
                  {userProfile?.username && (
                    <p className="text-sm text-gray-500">@{userProfile.username}</p>
                  )}
                  <Badge className={`mt-1 ${getRoleBadgeColor(effectiveRole)} text-white text-xs`}>
                    {getRoleLabel(effectiveRole)}
                  </Badge>
                  {userProfile?.company_name && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {userProfile.company_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{userProfile?.email || 'No email'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                <Users className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8 text-[#124481] flex-shrink-0" />
                <span className="truncate">{isSuperAdminGlobalView ? 'User Management' : 'Team Management'}</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {isSuperAdminGlobalView 
                  ? 'Viewing all users across all companies' 
                  : isImpersonatingUser 
                    ? 'Managing team for impersonated company' 
                    : 'Manage technicians and staff members'}
              </p>
            </div>
            {(isAdmin() || isOfficeManager()) && (
              <Button 
                onClick={() => {
                  setNewMember(prev => ({ ...prev, role: 'technician' }));
                  setShowAddModal(true);
                }}
                className="bg-[#124481] hover:bg-[#1E7083] w-full sm:w-auto flex-shrink-0"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {isSuperAdminGlobalView ? 'Add User' : 'Add Team Member'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats - Different views for Super Admin vs Company Admin */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {isSuperAdminGlobalView ? (
            <>
              {/* Super Admin Global View Stats */}
              <Card className="border-l-4 border-l-[#124481]">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Total Users</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalMembers}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-[#124481] flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Total Companies</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">{totalCompanies}</p>
                    </div>
                    <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Company Admins</p>
                      <p className="text-xl sm:text-2xl font-bold text-amber-600">{companyAdminCount}</p>
                    </div>
                    <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-teal-500">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Other Workers</p>
                      <p className="text-xl sm:text-2xl font-bold text-teal-600">{otherWorkersCount}</p>
                    </div>
                    <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-teal-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Company Admin / Impersonating View Stats */}
              <Card className="border-l-4 border-l-[#124481]">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Total Team Members</p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalMembers}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-[#124481] flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Technicians</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">{technicianCount}</p>
                    </div>
                    <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-teal-500">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Active Tasks</p>
                      <p className="text-xl sm:text-2xl font-bold text-teal-600">{totalActiveTasks}</p>
                    </div>
                    <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-teal-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">Completed Total</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{totalCompletedTasks}</p>
                    </div>
                    <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <Card>
            <CardContent className="py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#124481]" />
            <span className="ml-2 text-gray-600">Loading team members...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first team member'}
            </p>
            {(isAdmin() || isOfficeManager()) && !searchTerm && (
              <Button onClick={() => setShowAddModal(true)} className="bg-[#124481] hover:bg-[#1E7083]">
                <UserPlus className="mr-2 h-4 w-4" />
                {isSuperAdminGlobalView ? 'Add User' : 'Add Team Member'}
              </Button>
            )}
          </Card>
        ) : (
          /* Team Members Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredMembers.map(member => {
              const RoleIcon = getRoleIcon(member.role);
              return (
                <Card key={member.id} className={`hover:shadow-lg transition-shadow ${member.is_disabled ? 'opacity-60 bg-gray-50' : ''}`}>
                  <CardContent className="pt-6 pb-4">
                    {/* Header with avatar, name, actions */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 ${member.is_disabled ? 'bg-gray-200' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
                          <RoleIcon className={`h-5 w-5 ${member.is_disabled ? 'text-gray-400' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-semibold ${member.is_disabled ? 'text-gray-500' : 'text-gray-900'}`}>
                              {member.full_name || 'No name'}
                            </h3>
                            {member.is_disabled && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          {member.username && (
                            <p className="text-sm text-gray-500">@{member.username}</p>
                          )}
                          <Badge className={`mt-1 ${getRoleBadgeColor(member.role)} text-white text-xs`}>
                            {getRoleLabel(member.role)}
                          </Badge>
                          {member.company?.name && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {member.company.name}
                            </p>
                          )}
                        </div>
                      </div>
                      {(isAdmin() || isOfficeManager()) && (
                        <div className="flex gap-1">
                          {/* Impersonate button - Super Admin only, can't impersonate other Super Admins */}
                          {canImpersonate(member) && !isImpersonatingUser && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setMemberToImpersonate(member);
                                setShowImpersonateDialog(true);
                              }}
                              className="text-amber-600 border-amber-300 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400 text-xs px-2 h-7"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Impersonate
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditModal(member)}
                            title="Edit"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4 text-gray-500" />
                          </Button>
                          {/* Super Admin users cannot be deleted - protected role */}
                          {member.role !== 'master_admin' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openDeleteDialog(member)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              disabled={actionLoading}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Contact info */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{member.email}</span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {isImpersonating && member.company && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span>{member.company.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Work order stats */}
                    <div className="flex gap-6 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Assigned</p>
                        <p className="text-sm font-semibold text-teal-600">{member.taskStats?.active || 0} active</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Completed</p>
                        <p className="text-sm font-semibold text-green-600">{member.taskStats?.completed || 0} total</p>
                      </div>
                      {/* Super Admin users cannot be disabled - protected role */}
                      {(isAdmin() || isOfficeManager()) && member.role !== 'master_admin' && (
                        <div className="ml-auto flex items-center gap-1">
                          {member.is_disabled && member.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvite(member)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                              disabled={actionLoading}
                            >
                              <Mail className="h-3 w-3 mr-1" /> Resend Invite
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggleStatus(member)}
                            className={`text-xs ${member.is_disabled ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}`}
                            disabled={actionLoading}
                          >
                            {member.is_disabled ? (
                              <><UserCheck className="h-3 w-3 mr-1" /> Enable</>
                            ) : (
                              <><UserX className="h-3 w-3 mr-1" /> Disable</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Member Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <UserPlus className="mr-2 h-5 w-5" />
                    {isSuperAdminGlobalView ? 'Add User' : 'Add Team Member'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddModal(false);
                      setValidationErrors({});
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <Input
                    value={newMember.full_name}
                    onChange={(e) => {
                      setNewMember({...newMember, full_name: e.target.value});
                      if (validationErrors.full_name) {
                        setValidationErrors({...validationErrors, full_name: ''});
                      }
                    }}
                    placeholder="John Doe"
                    className={validationErrors.full_name ? 'border-red-500' : ''}
                  />
                  {validationErrors.full_name && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.full_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <Input
                    value={newMember.username}
                    onChange={(e) => setNewMember({...newMember, username: e.target.value})}
                    placeholder="johndoe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => {
                      setNewMember({...newMember, email: e.target.value});
                      if (validationErrors.email) {
                        setValidationErrors({...validationErrors, email: ''});
                      }
                    }}
                    placeholder="john@example.com"
                    className={validationErrors.email ? 'border-red-500' : ''}
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role *</label>
                  <select
                    value={newMember.role}
                    onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    {availableRoles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                {/* Company selection - Show for actual Super Admins when NOT impersonating and role is not master_admin */}
                {isActualMasterAdmin() && !isImpersonatingUser && newMember.role !== 'master_admin' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Company *
                      <span className="text-xs text-muted-foreground ml-1">(Required for this role)</span>
                    </label>
                    <select
                      value={newMember.company_id}
                      onChange={(e) => {
                        setNewMember({...newMember, company_id: e.target.value});
                        if (validationErrors.company_id) {
                          setValidationErrors({...validationErrors, company_id: ''});
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-md bg-background ${validationErrors.company_id ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select a company...</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                    {validationErrors.company_id && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.company_id}</p>
                    )}
                  </div>
                )}

                {/* Info message for master_admin role */}
                {isActualMasterAdmin() && !isImpersonatingUser && newMember.role === 'master_admin' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800 flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Super Admins have global access and don't require a company assignment.
                    </p>
                  </div>
                )}

                {/* Invite info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    An invite link will be generated. Share it with the user to set up their password.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setValidationErrors({});
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMember}
                    disabled={actionLoading}
                    className="flex-1 bg-[#124481] hover:bg-[#1E7083]"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Send Invite'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* Invite Success Confirmation Modal */}
        {inviteSuccess && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-sm text-center shadow-2xl border-0 overflow-hidden">
              <div className="pt-8 pb-4 px-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-1">Invite Sent Successfully</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  A magic link email has been sent.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 mb-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium text-foreground">{inviteSuccess.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Role</span>
                    <Badge variant="outline" className="text-xs">{inviteSuccess.role}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium text-foreground text-xs">{inviteSuccess.email}</span>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2">
                <Button
                  onClick={() => setInviteSuccess(null)}
                  className="w-full bg-[#124481] hover:bg-[#1E7083]"
                >
                  Done
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Edit Member Modal */}
        {showEditModal && editingMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Edit className="mr-2 h-5 w-5" />
                    Edit Team Member
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowEditModal(false); setEditingMember(null); }}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <Input
                    value={editingMember.full_name}
                    onChange={(e) => setEditingMember({...editingMember, full_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <Input
                    value={editingMember.username}
                    onChange={(e) => setEditingMember({...editingMember, username: e.target.value})}
                    placeholder="johndoe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={editingMember.email}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={editingMember.role}
                    onChange={(e) => setEditingMember({...editingMember, role: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {availableRoles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => { setShowEditModal(false); setEditingMember(null); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleEditMember}
                    disabled={actionLoading}
                    className="flex-1 bg-[#124481] hover:bg-[#1E7083]"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {memberToDelete?.full_name || memberToDelete?.email}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteMember}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Impersonation Confirmation Dialog */}
        <AlertDialog open={showImpersonateDialog} onOpenChange={setShowImpersonateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-amber-500" />
                Impersonate User
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  You are about to impersonate <strong className="text-foreground">{memberToImpersonate?.full_name || memberToImpersonate?.email}</strong>.
                </p>
                <p>
                  You will view the app exactly as this user sees it, with their role and permissions.
                </p>
                {memberToImpersonate?.company?.name && (
                  <p className="text-sm">
                    Company: <span className="font-medium">{memberToImpersonate.company.name}</span>
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMemberToImpersonate(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (memberToImpersonate) {
                    startImpersonation(memberToImpersonate);
                  }
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Eye className="h-4 w-4 mr-2" />
                Start Impersonation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default TeamManagement;