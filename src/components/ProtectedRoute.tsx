import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    selectedOrganization,
    loading: orgLoading
  } = useOrganization();

  const [passwordResetCheck, setPasswordResetCheck] = useState<{
    loading: boolean;
  }>({ loading: true });

  // Check if user needs to reset/set password (for new users)
  useEffect(() => {
    const checkPasswordResetRequired = async () => {
      if (!user) {
        setPasswordResetCheck({ loading: false });
        return;
      }

      try {
        const currentPath = location.pathname;

        // If user is on the reset password page, always allow access
        if (currentPath === '/reset-password') {
          console.log('[ProtectedRoute] User is on reset password page, allowing access');
          setPasswordResetCheck({ loading: false });
          return; // EXIT EARLY - Don't do any other checks
        }

        // Check if user is in password reset mode
        const isInPasswordResetMode = sessionStorage.getItem('password-reset-mode') === 'true';

        if (isInPasswordResetMode) {
          console.log('[ProtectedRoute] User is in password reset mode, blocking access to:', currentPath);
          // Block access to other routes and redirect to reset password
          navigate('/reset-password', { replace: true });
          return;
        }

        // Check if this is a new user who hasn't set their password yet
        const isNewUser = !user.last_sign_in_at || user.last_sign_in_at === user.created_at;

        if (isNewUser) {
          console.log('[ProtectedRoute] New user detected');

          // Check if there are recovery tokens in the URL (user might have just landed from email)
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const hasRecoveryToken = urlParams.get('type') === 'recovery' ||
            hashParams.get('type') === 'recovery';

          if (hasRecoveryToken) {
            console.log('[ProtectedRoute] Recovery tokens detected, redirecting to reset password');
            navigate('/reset-password' + window.location.search + window.location.hash, { replace: true });
            return;
          }

          // Only sign out and redirect if they're not coming from a recovery flow
          console.log('[ProtectedRoute] New user without recovery tokens, signing out');
          await supabase.auth.signOut();
          navigate('/login', {
            state: { message: 'Please use the password reset link from your email to set your password.' },
            replace: true
          });
          return;
        }

        // All other cases - user is good to go
        setPasswordResetCheck({ loading: false });

      } catch (error) {
        console.error('[ProtectedRoute] Error checking password reset requirement:', error);
        setPasswordResetCheck({ loading: false });
      }
    };

    if (!authLoading) {
      checkPasswordResetRequired();
    } else {
      setPasswordResetCheck({ loading: false });
    }
  }, [user, authLoading, location.pathname, navigate]);

  // Enhanced debugging
  useEffect(() => {
    const storedOrgRaw = sessionStorage.getItem('selectedOrganization');
    const storedOrg = storedOrgRaw ? JSON.parse(storedOrgRaw) : null;

    console.log('[ProtectedRoute] Path:', location.pathname);
    console.log('[ProtectedRoute] Auth available:', !!user);
    console.log('[ProtectedRoute] Context Org:', selectedOrganization ? selectedOrganization.name : false);
    console.log('[ProtectedRoute] Storage Org:', storedOrg ? storedOrg.name : false);
    console.log('[ProtectedRoute] Password reset check:', passwordResetCheck);
  }, [location.pathname, user, selectedOrganization, passwordResetCheck]);

  // Show loading indicator during initial load
  if (authLoading || orgLoading || passwordResetCheck.loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For admin routes, check if organization is selected
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSelectOrgRoute = location.pathname === '/select-organization';

  // If on an admin route and no organization is selected, redirect to selector
  if (isAdminRoute && !selectedOrganization && !isSelectOrgRoute) {
    console.log('[ProtectedRoute] No org selected, redirecting to selector');
    return <Navigate to="/select-organization" replace />;
  }

  // If on the selector page but already have an org selected, go to admin
  if (isSelectOrgRoute && selectedOrganization) {
    console.log('[ProtectedRoute] Org already selected, redirecting to admin');
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}