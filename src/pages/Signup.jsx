import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import './auth.css';
const Signup = () => {
    const navigate = useNavigate();
    const { user, isLoading, register, login } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (!phone.trim() || !location.trim()) {
            setError('Phone number and location are required.');
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await register({
                name: fullName.trim(),
                email: email.trim(),
                password,
                role: 'farmer',
                phone: phone.trim(),
                location: location.trim(),
            });
            if (!result.success) {
                setError(result.error || 'Signup failed. Please try again.');
                return;
            }
            const loginResult = await login(email.trim(), password, 'farmer');
            if (!loginResult.success) {
                toast.success('Farmer account created. Please sign in.');
                navigate('/login');
                return;
            }
            toast.success('Farmer account created.');
            navigate('/farmer-dashboard');
        }
        catch {
            setError('Signup failed. Please try again.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="auth-root">
      <div className="auth-layout">
        <section className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-chip">
              <Leaf className="h-5 w-5 text-white"/>
            </div>
            <p className="auth-brand-text">
              Grape<span>Guard</span>
            </p>
          </div>

          <h1 className="auth-heading">
            Build your <em>farmer</em> account in minutes
          </h1>
          <p className="auth-sub">
            Sign up once and upload disease samples, track expert reviews, and apply recommended treatments confidently.
          </p>

          <div className="auth-bullets">
            <div className="auth-bullet">
              <span className="auth-bullet-dot"/>
              Farmer signup enabled here.
            </div>
            <div className="auth-bullet">
              <span className="auth-bullet-dot"/>
              Expert accounts are admin-created.
            </div>
            <div className="auth-bullet">
              <span className="auth-bullet-dot"/>
              Role is locked to farmer at registration.
            </div>
          </div>
        </section>

        <section className="auth-right">
          <div className="auth-card">
            <p className="auth-eyebrow">Create Account</p>
            <h2 className="auth-title">Farmer signup</h2>
            <p className="auth-copy">Expert accounts must be created manually by your team.</p>

            <div className="auth-info">This page only registers farmers.</div>
            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={onSubmit} autoComplete="off">
              <div className="auth-field">
                <label htmlFor="fullName">Full name</label>
                <input id="fullName" type="text" className="auth-input" placeholder="Enter full name" value={fullName} onChange={(event) => setFullName(event.target.value)} required/>
              </div>

              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" className="auth-input" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="off"/>
              </div>

              <div className="auth-field auth-grid-two">
                <div>
                  <label htmlFor="phone">Phone number</label>
                  <input id="phone" type="tel" className="auth-input" placeholder="9876543210" value={phone} onChange={(event) => setPhone(event.target.value)} required autoComplete="tel"/>
                </div>

                <div>
                  <label htmlFor="location">Location</label>
                  <input id="location" type="text" className="auth-input" placeholder="Nashik, Maharashtra" value={location} onChange={(event) => setLocation(event.target.value)} required autoComplete="address-level2"/>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="password">Password</label>
                <div className="auth-input-wrap">
                  <input id="password" type={showPassword ? 'text' : 'password'} className="auth-input" placeholder="Minimum 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="off"/>
                  <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input id="confirmPassword" type={showPassword ? 'text' : 'password'} className="auth-input" placeholder="Retype password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="off"/>
              </div>

              <button type="submit" className="auth-cta" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create Farmer Account'}
              </button>
            </form>

            <p className="auth-link-row">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </div>);
};
export default Signup;
