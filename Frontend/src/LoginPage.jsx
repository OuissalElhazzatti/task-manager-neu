import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { loginUser } from "./api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    try {
      setLoading(true);

      const result = await loginUser(email.trim(), password);

      // ✅ NUR wenn Backend Login erlaubt
      localStorage.setItem("isAuth", "true");
      localStorage.setItem("userEmail", result.user.email);

      navigate("/");
    } catch (err) {
      setError("E-Mail oder Passwort ist falsch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">📅</div>
          <div>
            <h1 className="login-title">Task Manager</h1>
            <p className="login-subtitle">
              Melde dich an, um deine Tasks zu verwalten.
            </p>
          </div>
        </div>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleLogin} className="login-form">
          <label className="login-label">
            E-Mail
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </label>

          <label className="login-label">
            Passwort
            <div className="login-password-row">
              <input
                className="login-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-showpw"
                onClick={() => setShowPw((p) => !p)}
                aria-label="Passwort anzeigen"
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? "Anmelden..." : "Anmelden"}
          </button>

          <button
  type="button"
  className="login-link"
  onClick={() => navigate("/register")}
>
  Noch kein Konto? Registrieren
</button>
        </form>
      </div>
    </div>
  );
}