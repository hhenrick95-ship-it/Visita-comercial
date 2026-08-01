import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "admin" | "gestor" | "any";
}

export const ProtectedRoute = ({ children, requireRole = "any" }: ProtectedRouteProps) => {
  const { user, role, isApproved, loading } = useAuth();

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

  if (requireRole === "admin" && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
