
import { useAuth } from '@/contexts/AuthContext';
import { useRole, UserRoleType } from '@/contexts/RoleContext';
import { Navigate, useLocation } from 'react-router-dom';
import React from 'react';
import { useToast } from '@/hooks/use-toast';

interface RequireAuthProps {
  children: JSX.Element;
  requiredRole?: UserRoleType;
}

// Use React.memo to prevent unnecessary re-renders
export const RequireAuth = React.memo(({ children, requiredRole }: RequireAuthProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { role, isLoading: roleLoading, hasPermission } = useRole();
  const location = useLocation();
  const { toast } = useToast();

  // Show loading state if auth or role is still being checked
  if (authLoading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  if (!user) {
    // Show toast when redirecting to login
    toast({
      title: "Authentication required",
      description: "Please sign in to access this page",
    });
    
    // Redirect to login if not authenticated
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If a specific role is required, check permissions
  if (requiredRole && !hasPermission(requiredRole)) {
    toast({
      title: "Access denied",
      description: `You don't have ${requiredRole} permissions required to access this page`,
      variant: "destructive",
    });
    
    // Redirect to dashboard if user doesn't have required role
    return <Navigate to="/dashboard" replace />;
  }

  return children;
});

export const RequireAdmin = React.memo(({ children }: { children: JSX.Element }) => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const { role, isLoading: roleLoading, hasPermission } = useRole();
  const location = useLocation();
  const { toast } = useToast();

  if (authLoading || roleLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  if (!user) {
    toast({
      title: "Authentication required",
      description: "Please sign in to access admin area",
    });
    // Redirect to login if not authenticated
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check both the original isAdmin flag (for backwards compatibility) and the new role system
  if (!isAdmin && !hasPermission('admin')) {
    toast({
      title: "Access denied",
      description: "You don't have permission to access the admin area",
      variant: "destructive",
    });
    // Redirect to dashboard if user is not an admin
    return <Navigate to="/dashboard" replace />;
  }

  return children;
});

export const RequireRole = React.memo(({ children, requiredRole }: { children: JSX.Element, requiredRole: UserRoleType }) => {
  return <RequireAuth requiredRole={requiredRole}>{children}</RequireAuth>;
});

export const RedirectIfAuthenticated = React.memo(({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  // Get the intended destination from state, or default to home page
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
      </div>
    );
  }

  if (user) {
    // Redirect to home if already authenticated
    return <Navigate to={from} replace />;
  }

  return children;
});
