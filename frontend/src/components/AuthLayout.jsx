export default function AuthLayout({ title, children, subtitle }) {
  return (
    <div className="auth-wrap">
      {subtitle && <h2 className="auth-subtitle">{subtitle}</h2>}
      <div className="auth-card">
        <h1 className="auth-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
