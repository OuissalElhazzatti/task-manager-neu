import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "./api";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
  e.preventDefault();
  setError("");

  try {
    const res = await fetch("http://127.0.0.1:5000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registrierung fehlgeschlagen");
      return;
    }

    // nach erfolgreicher Registrierung → Login
    navigate("/login");
  } catch (err) {
    setError("Server nicht erreichbar");
  }
};

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">📅</div>
          <div>
            <h1 className="login-title">Registrieren</h1>
            <p className="login-subtitle">Erstelle deinen Account.</p>
          </div>
        </div>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleRegister} className="login-form">
          <label className="login-label">
            Username
            <input
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="z.B. ouissal"
            />
          </label>

          <label className="login-label">
            E-Mail
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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
              />
              <button
                type="button"
                className="login-showpw"
                onClick={() => setShowPw((p) => !p)}
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? "Registriere..." : "Registrieren"}
          </button>

          <button
            type="button"
            className="login-link"
            onClick={() => navigate("/login")}
          >
            Schon ein Konto? Login
          </button>
        </form>
      </div>
    </div>
  );
}