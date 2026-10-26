
import { useState } from "react";
import { loginUser, registerUser } from "./api";

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const user =
        mode === "login"
          ? await loginUser(email, password)
          : await registerUser(email, password);

      onLogin(user);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="aurora-login" style={styles.page}>
      <div className="aurora-particles" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <form onSubmit={handleSubmit} style={styles.card}>
        <div style={styles.logo}>✦ AURORA</div>
        <p style={styles.eyebrow}>YOUR PERSONAL SPACE</p>

        <h1 style={styles.heading}>
          {mode === "login" ? "Welcome back." : "Create your account."}
        </h1>

        <p style={styles.subtitle}>
          Sign in to access your routines and sync your progress.
        </p>

        <label style={styles.label} htmlFor="aurora-email">
          Email address
        </label>
        <input
          id="aurora-email"
          style={styles.input}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

        <label style={styles.label} htmlFor="aurora-password">
          Password
        </label>
        <input
          id="aurora-password"
          style={styles.input}
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 12 characters"
          minLength={12}
          maxLength={128}
          required
        />

        {error && <p role="alert" style={styles.error}>{error}</p>}

        <button style={styles.button} disabled={busy} type="submit">
          {busy
            ? "Please wait..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        <p style={styles.switchText}>
          {mode === "login" ? "New to AURORA?" : "Already have an account?"}{" "}
          <button
            type="button"
            style={styles.link}
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </form>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(ellipse at top, #172d43 0%, #0b111b 50%, #080b12 100%)",
    color: "#f1f5f9",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 32,
    border: "1px solid rgba(164, 195, 225, .2)",
    borderRadius: 24,
    background: "rgba(20, 30, 45, .86)",
    boxShadow: "0 24px 80px rgba(0,0,0,.3)",
  },
  logo: { fontSize: 23, fontWeight: 800, letterSpacing: 2 },
  eyebrow: { color: "#70dce8", fontSize: 11, letterSpacing: 2 },
  heading: { marginTop: 28, marginBottom: 8, fontSize: 30 },
  subtitle: { color: "#aab8c9", lineHeight: 1.6, marginBottom: 26 },
  label: { display: "block", margin: "16px 0 8px", fontSize: 13 },
  input: {
    boxSizing: "border-box",
    width: "100%",
    padding: "13px 14px",
    border: "1px solid #34465a",
    borderRadius: 10,
    background: "#101925",
    color: "#f1f5f9",
    fontSize: 15,
  },
  button: {
    width: "100%",
    marginTop: 22,
    padding: 14,
    border: 0,
    borderRadius: 10,
    background: "#73dce8",
    color: "#09121c",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  error: { color: "#ff9b9b", fontSize: 13 },
  switchText: { marginTop: 22, textAlign: "center", color: "#aab8c9", fontSize: 13 },
  link: {
    border: 0,
    background: "transparent",
    color: "#73dce8",
    cursor: "pointer",
    font: "inherit",
  },
};
