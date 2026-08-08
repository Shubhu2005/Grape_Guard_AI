import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import './auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading, login } = useAuth();
  const [selectedRole, setSelectedRole] = useState('farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('last_login_role');
    if (role === 'farmer' || role === 'expert') {
      setSelectedRole(role);
    }
  }, []);

  useEffect(() => {
    const roleFromQuery = searchParams.get('role');
    const demoFromQuery = searchParams.get('demo');

    if (roleFromQuery === 'farmer' || roleFromQuery === 'expert') {
      setSelectedRole(roleFromQuery);
    }

    if (demoFromQuery !== '1') {
      return;
    }

    if (roleFromQuery === 'expert') {
      setEmail('expert@gmail.com');
      setPassword('Expert@123');
      return;
    }

    setEmail('farmer@gmail.com');
    setPassword('Farmer@123');
  }, [searchParams]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (user) {
      navigate(user.role === 'expert' ? '/expert-dashboard' : '/farmer-dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    setIsSubmitting(true);

    try {
      const result = await login(email.trim(), password, selectedRole);
      if (!result.success) {
        setError(result.error || 'Login failed. Please try again.');
        return;
      }
      localStorage.setItem('last_login_role', selectedRole);
      toast.success('Logged in successfully');
      navigate(selectedRole === 'expert' ? '/expert-dashboard' : '/farmer-dashboard');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-layout">
        <section className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-chip">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <p className="auth-brand-text">
              Grape<span>Guard</span>
            </p>
          </div>

          <h1 className="auth-heading">
            Smart farming starts with <em>early</em> detection
          </h1>
          <p className="auth-sub">
            AI-powered grape disease analysis and expert-verified recommendations for faster, safer field decisions.
          </p>

          <div className="auth-bullets">
            <div className="auth-bullet">
              <span className="auth-bullet-dot" />
              Instant leaf disease screening.
            </div>
            <div className="auth-bullet">
              <span className="auth-bullet-dot" />
              Expert validation before farmer action.
            </div>
            <div className="auth-bullet">
              <span className="auth-bullet-dot" />
              Field-ready pesticide guidance.
            </div>
          </div>
        </section>

        <section className="auth-right">
          <div className="auth-card">
            <p className="auth-eyebrow">Welcome Back</p>
            <h2 className="auth-title">Sign in to your account</h2>
            <p className="auth-copy">Farmer and expert log in from the same page.</p>

            <div className="auth-role-grid">
              <button
                type="button"
                className={`auth-role-button ${selectedRole === 'farmer' ? 'active' : ''}`}
                onClick={() => setSelectedRole('farmer')}
              >
                <span>Farmer</span>
                <small>Upload and track</small>
              </button>
              <button
                type="button"
                className={`auth-role-button ${selectedRole === 'expert' ? 'active' : ''}`}
                onClick={() => setSelectedRole('expert')}
              >
                <span>Expert</span>
                <small>Review and approve</small>
              </button>
            </div>

            {selectedRole === 'expert' && (
              <div className="auth-info">
                Expert accounts are created manually by admin. Use your assigned credentials.
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={onSubmit} autoComplete="off">
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <div className="auth-input-wrap">
                  <input
                    id="email"
                    type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="password">Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-cta" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <p className="auth-link-row mt-2">
              <Link to="/forgot-password">Forgot password?</Link>
            </p>

            {selectedRole === 'farmer' ? (
              <p className="auth-link-row">
                Farmer only: <Link to="/signup">Create account</Link>
              </p>
            ) : (
              <p className="auth-link-row">Expert signup is disabled. Contact admin to create your account.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
