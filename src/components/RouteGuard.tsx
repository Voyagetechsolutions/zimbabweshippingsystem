
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import React from 'react';
import { useToast } from '@/hooks/use-toast';

// Use React.memo to prevent unnecessary re-renders
export const RequireAuth = React.memo(({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  if (isLoading) {
    // Show loading state if auth is still being checked
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

  return children;
});

export const RequireAdmin = React.memo(({ children }: { children: JSX.Element }) => {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  if (isLoading) {
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

  if (!isAdmin) {
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
