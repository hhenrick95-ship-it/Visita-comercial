import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isRestrictedMerchanPath, isRestrictedMerchanUser } from "@/lib/restrictedFormAccess";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "admin" | "gestor" | "any";
}

export const ProtectedRoute = ({ children, requireRole = "any" }: ProtectedRouteProps) => {
  const { user, role, isApproved, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isApproved) {
    return <Navigate to="/pending" replace />;
  }

  if (isRestrictedMerchanUser(user.email) && !isRestrictedMerchanPath(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  if (requireRole === "admin" && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
