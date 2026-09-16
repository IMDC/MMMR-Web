import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function ProtectedRoute() {
  const status = useAuthStore(s => s.status);
  const user = useAuthStore(s => s.user);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mhmr-bg">
        <Loader2 size={28} className="animate-spin text-mhmr-olive" />
      </div>
    );
  }

  if (status === 'anon') {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but must set a personal password first — send back to login page step 2
  if (user?.mustChangePassword) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
