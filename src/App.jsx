import React, { useState, useEffect } from 'react';
import { Sparkles, Users, Calendar, ArrowRight, Loader, Eye, EyeOff, Activity } from 'lucide-react';
import { supabase } from './lib/supabase';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [authFlow, setAuthFlow] = useState('landing'); // 'landing', 'login', 'signup', 'verify_otp', 'forgot_password', 'verify_forgot', 'reset_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // If we are in the signup flow and not verified yet, don't set the session
      // This prevents the dashboard from showing up automatically
      if (authFlow === 'signup' && !isVerified) {
        return;
      }
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        localStorage.removeItem('student_active_tab');
        localStorage.removeItem('admin_active_tab');
        localStorage.removeItem('fresh_login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [authFlow, isVerified]);



  const fetchProfile = async (userId) => {
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data);
    setLoadingProfile(false);
  };





  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (authFlow === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setAuthFlow('verify_otp');
            setErrorMsg('Your email is not verified. Please enter the OTP sent to your email.');
            return;
          }
          throw error;
        }
        localStorage.setItem('fresh_login', 'true');
      } 
      else if (authFlow === 'signup') {
        if (!isOtpSent) {
          // STEP 1: Create the user account
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, whatsapp_no: whatsapp } }
          });
          if (error) throw error;
          
          setIsOtpSent(true);
          setErrorMsg('Verification code sent! Check your email.');
        } else if (!isVerified) {
          // STEP 2: Verify the OTP
          if (!otp || otp.length < 8) {
            throw new Error('Please enter the full 8-digit verification code.');
          }
          const { error: verifyError } = await supabase.auth.verifyOtp({ 
            email: email.trim(), 
            token: otp.trim(), 
            type: 'signup' 
          });
          if (verifyError) throw verifyError;
          
          setIsVerified(true);
          setErrorMsg('Email verified! You can now access your dashboard.');
        } else {
          // STEP 3: Final step - now we allow the session to be set
          const { data: { session: newSession } } = await supabase.auth.getSession();
          setSession(newSession);
          if (newSession) fetchProfile(newSession.user.id);
        }
      }
      else if (authFlow === 'verify_otp') {
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
        if (error) throw error;
      }
      else if (authFlow === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        
        setAuthFlow('verify_forgot');
        setErrorMsg('Password reset OTP sent to your email.');
      }
      else if (authFlow === 'verify_forgot') {
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
        if (error) throw error;
        setAuthFlow('reset_password');
        setErrorMsg('OTP verified! Please enter your new password.');
      }
      else if (authFlow === 'reset_password') {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setAuthFlow('login');
        setErrorMsg('Password successfully updated! You can now log in.');
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const type = authFlow === 'verify_otp' ? 'signup' : 'recovery';
      const { error } = await supabase.auth.resend({ type, email });
      if (error) throw error;
      setErrorMsg('New OTP sent to your email!');
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    if (loadingProfile || !profile) {
      return (
        <div className="container h-screen-center fade-in-up">
           <Loader size={32} style={{ animation: 'spin 2s linear infinite', color: 'var(--text-secondary)' }} />
           <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
        </div>
      );
    }

    return (
      <ErrorBoundary>
        {profile.role === 'admin' ? (
          <AdminDashboard session={session} profile={profile} />
        ) : (
          <StudentDashboard session={session} profile={profile} />
        )}
      </ErrorBoundary>
    );
  }

  return (
    <>
      {/* Animated Background Blobs */}
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Navigation Header */}
      <header className="glass-header">
        <div className="container">
          <nav>
            <div className="nav-brand">Mechatronics</div>
            {authFlow !== 'landing' && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                onClick={() => {
                  setAuthFlow('landing');
                  setErrorMsg('');
                }}
              >
                Home
              </button>
            )}
            {authFlow === 'landing' && (
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem' }}
                onClick={() => setAuthFlow('login')}
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container h-screen-center" style={{ minHeight: 'calc(100vh - 70px)' }}>
        
        {authFlow === 'landing' && (
          <div className="fade-in-up" style={{ paddingBottom: '5rem' }}>
            {/* HERO SECTION */}
            <div className="hero-section">
              <div className="hero-content">
                <div className="badge fade-in-up delay-1">
                  <Sparkles size={14} /> Official Mechatronics Platform
                </div>
                <h1 className="hero-title fade-in-up delay-1">
                  The Future of <span className="text-gradient">Student Innovation.</span>
                </h1>
                <p className="hero-subtitle fade-in-up delay-2">
                  Find the perfect team, discover cutting-edge campus events, and bring your project ideas to life with our unified mechatronics collaboration engine.
                </p>
                <div className="hero-actions fade-in-up delay-3">
                  <button className="btn btn-primary btn-large" onClick={() => setAuthFlow('signup')}>
                    Start Your Project <ArrowRight size={20} />
                  </button>
                  <button className="btn btn-secondary btn-large" onClick={() => setAuthFlow('login')}>
                    Sign In
                  </button>
                </div>
                <div className="hero-credits fade-in-up delay-3">
                  <div className="credit-card">
                    <div className="credit-icon"><Users size={18} /></div>
                    <div className="credit-info">
                      <span className="credit-role">Project Lead</span>
                      <strong className="credit-name">Prof. Himanshu Bhiwapurkar</strong>
                    </div>
                  </div>
                  <div className="credit-divider"></div>
                  <div className="credit-card">
                    <div className="credit-icon"><Activity size={18} /></div>
                    <div className="credit-info">
                      <span className="credit-role">Lead Developer</span>
                      <strong className="credit-name">Aayush Sharma</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-image-container fade-in-up delay-2">
                <div className="hero-image-glass">
                  <img src="/hero.png" alt="Collaboration Hub" className="hero-image" />
                </div>
                <div className="floating-card card-1">
                  <Users size={18} /> 4 Team Requests
                </div>
                <div className="floating-card card-2">
                  <Calendar size={18} /> New Hackathon
                </div>
              </div>
            </div>

            {/* FEATURES GRID */}
            <div style={{ textAlign: 'center', marginTop: '6rem' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Engineered for Collaboration</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 4rem auto' }}>Everything you need to manage your engineering projects and campus life in one beautiful place.</p>
              
              <div className="features-grid">
                <div className="glass-panel feature-card">
                  <div className="feature-icon icon-blue"><Calendar size={24} /></div>
                  <h3>Campus Events</h3>
                  <p>Stay ahead with real-time updates on hackathons, workshops, and deadlines.</p>
                </div>
                <div className="glass-panel feature-card">
                  <div className="feature-icon icon-green"><Users size={24} /></div>
                  <h3>Team Finder</h3>
                  <p>Smart matching helps you find developers, designers, and specialists with ease.</p>
                </div>
                <div className="glass-panel feature-card">
                  <div className="feature-icon icon-purple"><Sparkles size={24} /></div>
                  <h3>Unified Dashboard</h3>
                  <p>Manage multiple events and team requests from a single, high-speed interface.</p>
                </div>
              </div>
            </div>

            {/* HOW IT WORKS */}
            <div className="how-it-works">
              <div className="step">
                <div className="step-number">01</div>
                <h4>Create Account</h4>
                <p>Join the community and verify your student status.</p>
              </div>
              <div className="step">
                <div className="step-number">02</div>
                <h4>Find Partners</h4>
                <p>Search for students by skills or branch for your team.</p>
              </div>
              <div className="step">
                <div className="step-number">03</div>
                <h4>Win Together</h4>
                <p>Collaborate, participate in events, and build the future.</p>
              </div>
            </div>
          </div>
        )}

        {authFlow !== 'landing' && (
          <div className="glass-panel fade-in-up" style={{ padding: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
            
            <div className="fade-in-up delay-1" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--accent)', color: 'white', padding: '1rem', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,113,227,0.3)' }}>
                <Sparkles size={32} />
              </div>
            </div>

            <h1 className="title fade-in-up delay-1" style={{ fontSize: '2.5rem' }}>
              {authFlow === 'login' ? 'Welcome Back.' : 
               authFlow === 'signup' ? 'Create Account.' :
               authFlow === 'verify_otp' || authFlow === 'verify_forgot' ? 'Enter OTP.' :
               authFlow === 'reset_password' ? 'New Password.' : 'Reset Password.'}
            </h1>
            <p className="subtitle fade-in-up delay-2">
              {authFlow === 'login' ? 'Log in to manage teams, vote on polls, and connect with peers.' : 
               authFlow === 'signup' ? 'Join the platform to discover events and build your perfect team.' :
               authFlow === 'verify_otp' ? 'Check your email for the verification code to activate your account.' :
               authFlow === 'forgot_password' ? 'Enter your email and we will send you a code to reset your password.' :
               authFlow === 'verify_forgot' ? 'Enter the recovery code sent to your email.' :
               'Please enter your new, secure password.'}
            </p>

            <form className="fade-in-up delay-3" onSubmit={handleAuth}>
              
              {errorMsg && (
                <div style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255,59,48,0.3)', color: '#ff3b30', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {errorMsg}
                </div>
              )}

              {authFlow === 'signup' && (
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input type="text" className="glass-input" placeholder="John Doe" value={fullName} onChange={(e)=>setFullName(e.target.value)} required disabled={isOtpSent} />
                </div>
              )}

              <div className="input-group">
                <label className="input-label">College Email</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="email" 
                    className="glass-input" 
                    placeholder="student@acropolis.in" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    disabled={isOtpSent} 
                    style={{ flex: 1, opacity: isOtpSent ? 0.7 : 1 }} 
                  />
                  {authFlow === 'signup' && !isOtpSent && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => handleAuth({ preventDefault: () => {} })} 
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} 
                      disabled={loading || !email}
                    >
                      {loading ? '...' : 'Get OTP'}
                    </button>
                  )}
                </div>
              </div>

              {isOtpSent && !isVerified && (
                <div className="fade-in-up" style={{ padding: '1rem', background: 'rgba(0,113,227,0.05)', borderRadius: '12px', border: '1px solid rgba(0,113,227,0.1)', marginBottom: '1.5rem' }}>
                  <label className="input-label" style={{ textAlign: 'center', display: 'block' }}>Enter 8-Digit Verification Code</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input type="text" className="glass-input" placeholder="00000000" value={otp} onChange={(e)=>setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))} required style={{ textAlign: 'center', letterSpacing: '0.2em', flex: 1 }} />
                    <button type="button" className="btn btn-primary" onClick={() => handleAuth({ preventDefault: () => {} })} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} disabled={loading || otp.length < 8}>
                      {loading ? '...' : 'Verify'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                    Check your email. <span onClick={handleResend} style={{ color: 'var(--accent)', cursor: 'pointer' }}>Resend?</span>
                  </p>
                </div>
              )}

              {isVerified && (
                <div className="fade-in-up" style={{ textAlign: 'center', padding: '0.5rem', color: '#34C759', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
                  ✓ Email Verified Successfully
                </div>
              )}

              {authFlow === 'signup' && (
                <div className="input-group">
                  <label className="input-label">WhatsApp Number</label>
                  <input type="tel" className="glass-input" placeholder="+91 00000 00000" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} required disabled={isOtpSent && !isVerified} />
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword ? "text" : "password"} className="glass-input" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} required disabled={isOtpSent && !isVerified} />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>




              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', background: (authFlow === 'signup' && !isVerified) ? '' : (isVerified || authFlow === 'login') ? '#34C759' : '' }} disabled={(authFlow === 'signup' && !isVerified) || loading}>
                {loading ? 'Processing...' : (
                  authFlow === 'login' ? 'Sign In' : 
                  authFlow === 'signup' ? (isVerified ? 'Create Account' : 'Verify Email Above') :
                  authFlow === 'forgot_password' ? 'Send OTP' :
                  'Update Password'
                )} 
                {!loading && <ArrowRight size={18} />}
              </button>
              
              {(authFlow === 'verify_otp' || authFlow === 'forgot_password' || authFlow === 'verify_forgot' || authFlow === 'reset_password') && (
                <button 
                  type="button"
                  className="btn" 
                  style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.85rem' }} 
                  onClick={() => setAuthFlow('login')}
                >
                  Cancel and return to Login
                </button>
              )}
            </form>

            {(authFlow === 'login' || authFlow === 'signup') && (
              <p className="fade-in-up delay-3" style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {authFlow === 'login' ? "Don't have an account? " : "Already have an account? "}
                <span 
                  style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setAuthFlow(authFlow === 'login' ? 'signup' : 'login');
                    setErrorMsg('');
                  }}
                >
                  {authFlow === 'login' ? 'Sign up here' : 'Log in here'}
                </span>
              </p>
            )}
          </div>
        )}

      </main>
    </>
  );
}

export default App;
