import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Leaf } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accessToken = useMemo(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    return params.get("access_token") || "";
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!accessToken) {
      toast.error("Reset token missing from link. Please request a new reset email.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ new_password: password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.detail || "Failed to reset password.");
        return;
      }
      toast.success("Password updated. Please login.");
      navigate("/login");
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
        <p className="auth-eyebrow">Set New Password</p>
        <h1 className="auth-title">Reset password</h1>
        <p className="auth-copy">Choose a new password for your account.</p>

        <form onSubmit={onSubmit}>
          <div className="auth-field">
            <label htmlFor="password">New password</label>
            <div className="auth-input-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="confirm">Confirm password</label>
            <div className="auth-input-wrap">
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                className="auth-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Retype password"
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-cta mt-3" disabled={isSubmitting}>
            <KeyRound className="inline-block w-4 h-4 mr-2" />
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>

        <p className="auth-link-row mt-5">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
