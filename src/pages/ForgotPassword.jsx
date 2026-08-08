import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Leaf } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          redirect_url: `${window.location.origin}/reset-password`,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.detail || "Failed to send reset email.");
        return;
      }
      toast.success("Reset email sent. Please check your inbox.");
      setEmail("");
    } catch {
      toast.error("Unable to reach backend server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-root min-h-screen flex items-center justify-center p-4">
      <div className="auth-card w-full max-w-md">
        <div className="auth-brand mb-5">
          <div className="auth-brand-chip">
            <Leaf className="h-5 w-5 text-white" />
          </div>
          <p className="auth-brand-text">
            Grape<span>Guard</span>
          </p>
        </div>
        <p className="auth-eyebrow">Password Recovery</p>
        <h1 className="auth-title">Forgot password?</h1>
        <p className="auth-copy">Enter your account email. We will send you a reset link.</p>

        <form onSubmit={onSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <div className="auth-input-wrap">
              <input
                id="email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <button type="submit" className="auth-cta mt-3" disabled={isSubmitting}>
            <Mail className="inline-block w-4 h-4 mr-2" />
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="auth-link-row mt-5">
          Remembered password? <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
