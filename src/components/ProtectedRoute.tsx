import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const {
    selectedOrganization,
    loading: orgLoading
  } = useOrganization();

  // Enhanced debugging
  useEffect(() => {
    // Only log on protected routes for clarity
    const storedOrgRaw = sessionStorage.getItem('selectedOrganization');
    const storedOrg = storedOrgRaw ? JSON.parse(storedOrgRaw) : null;

    console.log('[ProtectedRoute] Path:', location.pathname);
    console.log('[ProtectedRoute] Auth available:', !!user);
    console.log('[ProtectedRoute] Context Org:', selectedOrganization ? selectedOrganization.name : false);
    console.log('[ProtectedRoute] Storage Org:', storedOrg ? storedOrg.name : false);
  }, [location.pathname, user, selectedOrganization]);

  // Show loading indicator during initial load
  if (authLoading || orgLoading) {
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