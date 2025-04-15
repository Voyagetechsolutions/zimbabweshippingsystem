
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRole } from '@/contexts/RoleContext';

interface AuthProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<AuthProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    if (!loading && !user && !hasShownToast) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page.",
        variant: "destructive",
      });
      setHasShownToast(true);
    }
  }, [user, loading, toast, hasShownToast]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export const RequireAdmin: React.FC<AuthProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { hasPermission, loading: roleLoading } = useRole();
  const { toast } = useToast();
  const [hasShownToast, setHasShownToast] = useState(false);
  
  const isAdmin = hasPermission('admin');

  useEffect(() => {
    if (!loading && !roleLoading && !isAdmin && user && !hasShownToast) {
      toast({
        title: "Admin access required",
        description: "You do not have permission to access this page.",
        variant: "destructive",
      });
      setHasShownToast(true);
    }
  }, [user, loading, roleLoading, isAdmin, toast, hasShownToast]);

  if (loading || roleLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const RedirectIfAuthenticated: React.FC<AuthProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

interface RequireRoleProps {
  children: React.ReactNode;
  requiredRole: string;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();
  const { hasPermission, loading: roleLoading } = useRole();
  const { toast } = useToast();
  const [hasShownToast, setHasShownToast] = useState(false);
  
  const hasRequiredRole = hasPermission(requiredRole);

  useEffect(() => {
    if (!loading && !roleLoading && !hasRequiredRole && user && !hasShownToast) {
      toast({
        title: "Access denied",
        description: `You need '${requiredRole}' role to access this page.`,
        variant: "destructive",
      });
      setHasShownToast(true);
    }
  }, [user, loading, roleLoading, hasRequiredRole, requiredRole, toast, hasShownToast]);

  if (loading || roleLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
