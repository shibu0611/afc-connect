// src/ProtectedRoute.jsx
import React from "react";
import { useAuth } from "./AuthProvider";

/**
 * Wrap a component to require login and optionally requiredRole.
 * Usage: <ProtectedRoute requiredRole="super-admin"><AdminPage/></ProtectedRoute>
 */
export default function ProtectedRoute({ children, requiredRole = null }) {
  const { user, role, loading } = useAuth();

  if (loading) return null; // or a spinner
  if (!user) return <div style={{ padding: 20 }}>Please sign in to access this page.</div>;
  if (requiredRole && role !== requiredRole && (!Array.isArray(requiredRole) || !requiredRole.includes(role))) {
    return <div style={{ padding: 20 }}>You do not have permission to access this page.</div>;
  }
  return children;
}
