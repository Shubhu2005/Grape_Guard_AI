// import { Link, Navigate } from 'react-router-dom';
// import { ArrowRight, BarChart3, CheckCircle2, Leaf, Microscope, ShieldCheck } from 'lucide-react';
// import { useAuth } from '@/hooks/useAuth';
// import './landing.css';

// const Landing = () => {
//   const { user, isLoading } = useAuth();

//   if (isLoading) {
//     return (
//       <div className="auth-spinner">
//         <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
//       </div>
//     );
//   }

//   if (user) {
//     return <Navigate to={user.role === 'expert' ? '/expert-dashboard' : '/farmer-dashboard'} replace />;
//   }

//   return (
//     <div className="landing-root">
//       <header className="landing-nav">
//         <div className="landing-brand">
//           <span className="landing-brand-chip">
//             <Leaf size={18} />
//           </span>
//           <span>
//             Grape<span>Guard</span> AI
//           </span>
//         </div>
//         <div className="landing-nav-actions">
//           <Link to="/login" className="landing-cta-sm">
//             Login
//           </Link>
//         </div>
//       </header>

//       <main className="landing-main">
//         <section className="landing-hero">
//           <p className="landing-kicker">Precision viticulture, faster decisions</p>
//           <h1>Detect grape diseases early. Review confidently. Treat precisely.</h1>
//           <p className="landing-subcopy">
//             GrapeGuard AI helps farmers upload leaf images, get rapid AI analysis, and receive expert-approved
//             recommendations before taking action in the field.
//           </p>

//           <div className="landing-hero-actions">
//             <Link to="/signup" className="landing-cta-primary">
//               Create Farmer Account <ArrowRight size={16} />
//             </Link>
//             <Link to="/login?role=farmer&demo=1" className="landing-cta-ghost">
//               Try Farmer Demo
//             </Link>
//           </div>
//         </section>

//         <section className="landing-grid">
//           <article className="landing-card">
//             <div className="landing-card-icon">
//               <Microscope size={18} />
//             </div>
//             <h3>AI Leaf Screening</h3>
//             <p>Upload crop images and get instant disease signals with confidence scoring.</p>
//           </article>
//           <article className="landing-card">
//             <div className="landing-card-icon">
//               <ShieldCheck size={18} />
//             </div>
//             <h3>Expert Verification</h3>
//             <p>Experts validate borderline cases and publish final treatment guidance.</p>
//           </article>
//           <article className="landing-card">
//             <div className="landing-card-icon">
//               <BarChart3 size={18} />
//             </div>
//             <h3>Action Tracking</h3>
//             <p>Monitor status from upload to recommendation so no case is missed.</p>
//           </article>
//         </section>

//         <section className="landing-strip">
//           <p>
//             <CheckCircle2 size={16} />
//             Farmer signup is enabled.
//           </p>
//           <p>
//             <CheckCircle2 size={16} />
//             Expert accounts are admin-managed.
//           </p>
//           <p>
//             <CheckCircle2 size={16} />
//             Demo credentials are prefilled from landing shortcuts.
//           </p>
//         </section>
//       </main>
//     </div>
//   );
// };

// export default Landing;

import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, BarChart3, CheckCircle2, Leaf, Microscope, ShieldCheck, Sprout, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import './landing.css';

const Landing = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-spinner">
        <div className="spinner-ring" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'expert' ? '/expert-dashboard' : '/farmer-dashboard'} replace />;
  }

  return (
    <div className="landing-root">
      {/* Ambient background layers */}
      <div className="landing-bg" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-grid" />
        <div className="bg-noise" />
        <div className="bg-scanline" />
      </div>

      {/* NAV */}
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-chip">
            <Leaf size={16} />
          </span>
          <span className="brand-text">
            Grape<em>Guard</em> <span className="brand-ai">AI</span>
          </span>
        </div>

        <nav className="landing-nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How it works</a>
        </nav>

        <div className="landing-nav-actions">
          <Link to="/login" className="btn-ghost-sm">Sign in</Link>
          <Link to="/signup" className="btn-primary-sm">Get started <ArrowRight size={13} /></Link>
        </div>
      </header>

      <main className="landing-main">

        {/* HERO */}
        <section className="landing-hero" id="hero">
          <div className="hero-left">
            <div className="hero-badge">
              <Zap size={11} />
              <span>Powered by computer vision</span>
            </div>

            <h1 className="hero-title">
              <span className="title-line-1">Catch disease</span>
              <span className="title-line-2">before the harvest</span>
              <span className="title-line-3">pays the price.</span>
            </h1>

            <p className="hero-sub">
              GrapeGuard AI gives farmers instant AI-powered leaf analysis, then routes uncertain cases to
              certified experts — so treatments are precise, not guesswork.
            </p>

            <div className="hero-actions">
              <Link to="/signup" className="btn-primary">
                Start for free <ArrowRight size={15} />
              </Link>
              <Link to="/login?role=farmer&demo=1" className="btn-outline">
                <span className="demo-dot" />
                Live demo
              </Link>
            </div>

            <div className="hero-trust">
              <div className="trust-item">
                <CheckCircle2 size={13} />
                <span>No credit card required</span>
              </div>
              <div className="trust-divider" />
              <div className="trust-item">
                <CheckCircle2 size={13} />
                <span>Expert-verified results</span>
              </div>
              <div className="trust-divider" />
              <div className="trust-item">
                <CheckCircle2 size={13} />
                <span>Free farmer accounts</span>
              </div>
            </div>
          </div>

          <div className="hero-right" aria-hidden="true">
            <div className="mockup-card">
              <div className="mockup-header">
                <span className="mockup-dot red" /><span className="mockup-dot yellow" /><span className="mockup-dot green" />
                <span className="mockup-title">Analysis · Leaf #2847</span>
              </div>
              <div className="mockup-body">
                <div className="mockup-img-area">
                  <div className="mockup-leaf-icon"><Leaf size={32} /></div>
                  <div className="mockup-scan-line" />
                </div>
                <div className="mockup-results">
                  <div className="result-row">
                    <span>Downy Mildew</span>
                    <div className="result-bar-wrap">
                      <div className="result-bar" style={{ '--w': '87%', '--clr': '#f87171' }} />
                    </div>
                    <span className="result-pct">87%</span>
                  </div>
                  <div className="result-row">
                    <span>Powdery Mildew</span>
                    <div className="result-bar-wrap">
                      <div className="result-bar" style={{ '--w': '9%', '--clr': '#fb923c' }} />
                    </div>
                    <span className="result-pct">9%</span>
                  </div>
                  <div className="result-row">
                    <span>Healthy</span>
                    <div className="result-bar-wrap">
                      <div className="result-bar" style={{ '--w': '4%', '--clr': '#4ade80' }} />
                    </div>
                    <span className="result-pct">4%</span>
                  </div>
                </div>
                <div className="mockup-status expert">
                  <ShieldCheck size={12} />
                  <span>Routed to expert review</span>
                </div>
              </div>
            </div>

            <div className="mockup-float-badge">
              <Sprout size={14} />
              <div>
                <p className="float-label">Cases resolved today</p>
                <p className="float-value">1,284</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="landing-features" id="features">
          <div className="section-label">
            <span className="section-tag">Core features</span>
          </div>
          <h2 className="section-title">Everything the vineyard needs</h2>

          <div className="features-grid">
            <article className="feature-card feature-card--accent">
              <div className="feature-icon-wrap">
                <Microscope size={20} />
              </div>
              <h3>AI Leaf Screening</h3>
              <p>Upload crop images and get instant disease signals with confidence scoring across 12 common pathogen types.</p>
              <div className="feature-glow" />
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrap">
                <ShieldCheck size={20} />
              </div>
              <h3>Expert Verification</h3>
              <p>Borderline cases are automatically escalated to certified plant pathologists who publish final treatment guidance.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrap">
                <BarChart3 size={20} />
              </div>
              <h3>Action Tracking</h3>
              <p>Monitor every case from upload to closed recommendation. Nothing falls through the cracks.</p>
            </article>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="landing-how" id="how-it-works">
          <div className="section-label">
            <span className="section-tag">Workflow</span>
          </div>
          <h2 className="section-title">From field to fix in minutes</h2>

          <div className="steps-row">
            <div className="step">
              <div className="step-number">01</div>
              <h4>Upload</h4>
              <p>Photograph a suspicious leaf and upload it in seconds from any device.</p>
            </div>
            <div className="step-connector" />
            <div className="step">
              <div className="step-number">02</div>
              <h4>AI Analysis</h4>
              <p>Our model returns a disease probability breakdown with confidence scores in under 5 seconds.</p>
            </div>
            <div className="step-connector" />
            <div className="step">
              <div className="step-number">03</div>
              <h4>Expert Review</h4>
              <p>Low-confidence results are routed to a certified expert who validates and annotates findings.</p>
            </div>
            <div className="step-connector" />
            <div className="step">
              <div className="step-number">04</div>
              <h4>Treat</h4>
              <p>Receive a precise, expert-approved treatment recommendation and act with confidence.</p>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="landing-cta-section">
          <div className="cta-inner">
            <div className="cta-orb" aria-hidden="true" />
            <p className="cta-kicker">Ready to protect your vines?</p>
            <h2>Start detecting diseases today.</h2>
            <p className="cta-sub">Free farmer accounts. Expert accounts are admin-managed. Demo credentials are prefilled.</p>
            <div className="cta-actions">
              <Link to="/signup" className="btn-primary btn-lg">
                Create free account <ArrowRight size={16} />
              </Link>
              <Link to="/login?role=farmer&demo=1" className="btn-outline btn-lg">
                Try demo instead
              </Link>
            </div>
          </div>
        </section>

      </main>

      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="landing-brand">
            <span className="landing-brand-chip">
              <Leaf size={14} />
            </span>
            <span className="brand-text">Grape<em>Guard</em> <span className="brand-ai">AI</span></span>
          </div>
          <p className="footer-copy">© {new Date().getFullYear()} GrapeGuard AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;