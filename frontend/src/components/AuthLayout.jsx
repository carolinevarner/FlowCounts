export default function AuthLayout({ title, children, subtitle }) {
  return (
    <div className="auth-wrap">
      {subtitle && <h2 className="auth-subtitle">{subtitle}</h2>}

      <div className="auth-card">
        <div className="auth-logo">
          {<img src="/logo.png" alt="Logo" />}
        </div>

        <h1 className="auth-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
