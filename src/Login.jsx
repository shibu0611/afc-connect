// src/Login.jsx
import React, { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function Login() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stateMsg, setStateMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setStateMsg("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      setStateMsg("Logged in");
    } catch (err) {
      setStateMsg("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!email) return setStateMsg("Enter email to reset password");
    try {
      await resetPassword(email.trim());
      setStateMsg("Password reset email sent");
    } catch (err) {
      setStateMsg("Reset failed: " + err.message);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "30px auto", padding: 20 }}>
      <h2 style={{ marginBottom: 10 }}>Sign in</h2>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" style={{ width: "100%", padding: 8, marginBottom: 12 }} />

        <label style={{ display: "block", marginBottom: 6 }}>Password</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="password" style={{ width: "100%", padding: 8, marginBottom: 12 }} />

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={loading} style={{ padding: "8px 14px" }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <button type="button" onClick={handleReset} style={{ padding: "8px 14px" }}>
            Reset password
          </button>
        </div>
      </form>
      <div style={{ marginTop: 12, color: "#b00" }}>{stateMsg}</div>
    </div>
  );
}
