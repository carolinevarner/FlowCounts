import { Navigate } from "react-router-dom";

export default function Protected({ children, roles }) {
  const access = localStorage.getItem("access");
  const raw = localStorage.getItem("user");
  if (!access || !raw) return <Navigate to="/login" replace />;

  const user = JSON.parse(raw);
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}
