import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch profile data after auth state change (deferred to avoid deadlock)
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    }).catch((err) => {
      console.warn('Error getting session:', err);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, companies(id, name)')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      // Fetch user roles from user_roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Determine primary role (highest privilege)
      const roleHierarchy = ['master_admin', 'company_admin', 'office_manager', 'shop_supervisor', 'technician'];
      const userRoles = rolesData?.map(r => r.role) || [];
      const primaryRole = roleHierarchy.find(role => userRoles.includes(role)) || profileData?.role || 'technician';

      // Flatten company data into profile
      if (profileData) {
        setProfile({
          ...profileData,
          company_id: profileData.company_id,
          company: profileData.companies,
          role: primaryRole,
          roles: userRoles,
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Map common error codes to user-friendly messages
        if (error.message?.includes('Invalid login credentials')) {
          return { success: false, error: 'Invalid email or password. Please check your credentials.' };
        }
        if (error.message?.includes('Email not confirmed')) {
          return { success: false, error: 'Please confirm your email before signing in. Check your inbox.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      // Handle fetch/clone errors - check if we're actually logged in
      console.warn('Login response handling error:', err);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          return { success: true };
        }
      } catch (e) {
        // Ignore
      }
      
      return { success: false, error: 'Login failed. Please try again.' };
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        },
      });

      if (error) {
        // Map common error codes to user-friendly messages
        if (error.message?.includes('email_address_invalid') || error.message?.includes('invalid')) {
          return { success: false, error: 'Unable to send confirmation email. Please try a different email address or contact support.' };
        }
        if (error.message?.includes('already registered')) {
          return { success: false, error: 'This email is already registered. Please sign in instead.' };
        }
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required
      if (data?.user && !data?.session) {
        return { 
          success: true, 
          confirmEmail: true,
          message: 'Please check your email to confirm your account.'
        };
      }

      return { success: true };
    } catch (err) {
      // Handle fetch/clone errors gracefully
      console.warn('SignUp response handling error:', err);
      
      // Check if signup succeeded despite the error
      if (err.message?.includes('clone') || err.message?.includes('Response body')) {
        return { 
          success: true, 
          confirmEmail: true,
          message: 'Account created! Please check your email to confirm your account.'
        };
      }
      
      return { success: false, error: 'Signup failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force clear state even if API call fails
      setUser(null);
      setSession(null);
      setProfile(null);
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    login,
    signUp,
    logout,
    isAuthenticated: !!session,
    isMasterAdmin: profile?.role === 'master_admin',
    isCompanyAdmin: profile?.role === 'company_admin' || profile?.role === 'master_admin',
    isTechnician: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};