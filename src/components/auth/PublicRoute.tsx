import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to admin dashboard
  if (user) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}