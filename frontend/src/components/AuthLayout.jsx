export default function AuthLayout({ title, children, subtitle }) {
  return (
    <div className="auth-wrap">
      {subtitle && <h2 className="auth-subtitle">{subtitle}</h2>}

      <div className="auth-card">
        {/* Small centered placeholder logo (replace with your real /logo.png later) */}
        <div className="auth-logo">
          {/* If you drop a real image at /public/logo.png, switch to this:  */}
          {<img src="/logo.png" alt="Logo" />}
        </div>

        <h1 className="auth-title">{title}</h1>
        {children}
      </div>
    </div>
  );
}
