import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading, needsPasswordChange } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Force password change for users who haven't changed their temporary password
  if (needsPasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" state={{ mandatory: true, firstLogin: true }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (role === 'teacher') {
      return <Navigate to="/teacher" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
