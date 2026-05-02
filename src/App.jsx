import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sparkles, Users, Calendar, ArrowRight, Loader, Eye, EyeOff, Activity } from 'lucide-react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';

const StudentDashboard = lazy(() => import('./components/StudentDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const AuthLayout = ({ children }) => (
  <>
    <div className="background-blobs">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
    </div>
    <header className="glass-header">
      <div className="container">
        <nav>
          <div className="nav-brand">Mechatronian</div>
          <Link to="/" className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', textDecoration: 'none' }}>Home</Link>
        </nav>
      </div>
    </header>
    <main className="container h-screen-center" style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel fade-in-up auth-box" style={{ padding: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center', margin: 'auto' }}>
        <div className="fade-in-up delay-1" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--accent)', color: 'white', padding: '1rem', borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,113,227,0.3)' }}>
            <Sparkles size={32} />
          </div>
        </div>
        {children}
      </div>
    </main>
  </>
);

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWA Install logic
    const installHandler = (e) => {
      // e.preventDefault(); // ALLOW native banner
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', installHandler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', installHandler);
    };
  }, []);
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
  const [initializing, setInitializing] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id).finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      // Prevent unintended flow changes during initialization or signup
      if (authFlow === 'signup' && !isVerified) return;

      if (currentSession) {
        setSession(currentSession);
        fetchProfile(currentSession.user.id);
      } else {
        setSession(null);
        setProfile(null);
        // Only force 'login' if we are explicitly signing out
        if (event === 'SIGNED_OUT') {
          setAuthFlow('login');
          localStorage.removeItem('student_active_tab');
          localStorage.removeItem('admin_active_tab');
          localStorage.removeItem('fresh_login');
          if (window.OneSignal) window.OneSignal.logout();
        }
      }
    });

    // Realtime Notifications for new events/listings
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          showNotification('New Admin Event!', payload.new.title);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_requests' },
        (payload) => {
          showNotification('New Team Request!', 'Someone wants to join a team.');
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_listings' },
        (payload) => {
          showNotification('New Recruitment Post!', payload.new.team_name);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Dedicated Timer Effect
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendTimer]);

  const showNotification = (title, body) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: '/logo.png' });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body, icon: '/logo.png' });
        }
      });
    }
  };



  const fetchProfile = async (userId) => {
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      if (data.is_blocked) {
        await supabase.auth.signOut();
        setProfile(null);
        setErrorMsg('Your account has been suspended by an administrator. Please contact support.');
        setAuthFlow('login');
        setLoadingProfile(false);
        return;
      }
      setProfile(data);

      // OneSignal Identity & Tagging
      try {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(function(OneSignal) {
          OneSignal.login(data.id);
          OneSignal.User.addTags({
            full_name: data.full_name,
            role: data.role,
            branch: data.branch || 'Unknown'
          });
        });
      } catch (e) {
        console.error("OneSignal Tagging Error:", e);
      }
    }
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
          setErrorMsg(''); 
          setResendTimer(120); // Initial 2 min timer
          setResendAttempts(1);
        } else {
          // STEP 2: Verify the OTP
          if (!otp || otp.length < 6) {
            throw new Error('Please enter the full 6-digit verification code.');
          }
          const { error: verifyError } = await supabase.auth.verifyOtp({ 
            email: email.trim(), 
            token: otp.trim(), 
            type: 'signup' 
          });
          if (verifyError) throw verifyError;
          
          setIsVerified(true);
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
    if (resendTimer > 0) return;
    
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });
    
    if (!error) {
      const nextAttempt = resendAttempts + 1;
      setResendAttempts(nextAttempt);
      // Exponential backoff: 120s * 2^(attempts-1)
      setResendTimer(120 * Math.pow(2, resendAttempts)); 
      setErrorMsg('A new code has been dispatched.');
    } else {
      setErrorMsg(error.message);
    }
    setLoading(false);
  };

  if (loadingProfile && session) {
    return (
      <div className="container h-screen-center fade-in-up">
         <Loader size={32} style={{ animation: 'spin 2s linear infinite', color: 'var(--text-secondary)' }} />
         <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const handleInstallClick = async () => {
    setShowInstallBanner(false);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert('To install on iOS:\n1. Tap the Share button in Safari\n2. Scroll down and tap "Add to Home Screen"');
    } else {
      alert('Installation prompt not available. Try adding to home screen via your browser menu.');
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>

      <ErrorBoundary>
      <Suspense fallback={
        <div className="h-screen-center" style={{ 
          background: 'var(--bg-primary)', 
          flexDirection: 'column',
          gap: '1.5rem',
          position: 'fixed',
          inset: 0,
          zIndex: 10000
        }}>
          <div className="premium-loader-container">
            <div className="premium-loader-core">
              <Activity size={48} color="var(--accent)" />
            </div>
            <div className="premium-loader-ring"></div>
            <div className="premium-loader-ring-outer"></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 className="shimmer-text" style={{ 
              fontSize: '1.2rem', 
              fontWeight: 700, 
              margin: 0,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, var(--text-primary), var(--accent), var(--text-primary))',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s linear infinite'
            }}>
              Loading your dashboard
            </h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-secondary)', 
              marginTop: '0.6rem',
              opacity: 0.7,
              fontWeight: 500
            }}>
              Preparing your exclusive experience...
            </p>
          </div>
        </div>
      }>
        {initializing ? (
          <div className="h-screen-center" style={{ background: 'var(--bg-primary)' }}>
            <div className="premium-loader-container">
              <div className="premium-loader-core">
                <Activity size={48} color="var(--accent)" />
              </div>
              <div className="premium-loader-ring"></div>
            </div>
          </div>
        ) : (
          <Routes>
          {/* LANDING PAGE */}
          <Route path="/" element={
            session ? (
              profile?.role === 'admin' ? <Navigate to="/admin/overview" replace /> : <Navigate to="/dashboard/events" replace />
            ) : (
              <>
                <div className="background-blobs">
                  <div className="blob blob-1"></div>
                  <div className="blob blob-2"></div>
                  <div className="blob blob-3"></div>
                </div>
                <header className="glass-header">
                  <div className="container">
                    <nav>
                      <div className="nav-brand">Mechatronian</div>
                      <Link to="/login" className="btn btn-primary" style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem', textDecoration: 'none' }}>Sign In</Link>
                    </nav>
                  </div>
                </header>
                <main className="container h-screen-center" style={{ minHeight: 'calc(100vh - 70px)' }}>
                  <div className="fade-in-up" style={{ paddingBottom: '5rem' }}>
                    <div className="hero-section">
                      <div className="hero-content">
                        <div className="badge fade-in-up delay-1"><Sparkles size={14} /> Official Mechatronian Platform</div>
                        <h1 className="hero-title fade-in-up delay-1">The Future of <span className="text-gradient">Student Innovation.</span></h1>
                        <p className="hero-subtitle fade-in-up delay-2">Find the perfect team, discover cutting-edge campus events, and bring your project ideas to life with our unified mechatronics collaboration engine.</p>
                        <div className="hero-actions fade-in-up delay-3">
                          <Link to="/signup" className="btn btn-primary btn-large" style={{ textDecoration: 'none' }}>Start Your Project <ArrowRight size={20} /></Link>
                          <Link to="/login" className="btn btn-secondary btn-large" style={{ textDecoration: 'none' }}>Sign In</Link>
                          <a href="https://aayush-sharma-beige.vercel.app/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-large" style={{ textDecoration: 'none', border: '1px solid var(--glass-border)' }}>About Developer</a>
                        </div>
                        <div className="hero-credits fade-in-up delay-3">
                          <div className="credit-card">
                            <div className="credit-icon"><Users size={18} /></div>
                            <div className="credit-info"><span className="credit-role">Project Lead</span><strong className="credit-name">Prof. Himanshu Bhiwapurkar</strong></div>
                          </div>
                          <div className="credit-divider"></div>
                          <div className="credit-card">
                            <div className="credit-icon"><Activity size={18} /></div>
                            <div className="credit-info"><span className="credit-role">Lead Developer</span><strong className="credit-name">Aayush Sharma</strong></div>
                          </div>
                        </div>
                      </div>
                      <div className="hero-image-container fade-in-up delay-2">
                        <div className="hero-image-glass"><img src="/hero.png" alt="Collaboration Hub" className="hero-image" /></div>
                        <div className="floating-card card-1"><Users size={18} /> 4 Team Requests</div>
                        <div className="floating-card card-2"><Calendar size={18} /> New Hackathon</div>
                      </div>
                    </div>
                  </div>
                </main>
              </>
            )
          } />

          {/* AUTH ROUTES */}
          <Route path="/login" element={
            session ? <Navigate to="/" replace /> : (
              <AuthLayout>
                <h1 className="title fade-in-up delay-1" style={{ fontSize: '2.5rem' }}>Welcome Back.</h1>
                <p className="subtitle fade-in-up delay-2">Log in to manage teams, vote on polls, and connect with peers.</p>
                <form className="fade-in-up delay-3" onSubmit={(e) => { setAuthFlow('login'); handleAuth(e); }}>
                  {errorMsg && <div className="error-alert">{errorMsg}</div>}
                  <div className="input-group">
                    <label className="input-label">College Email</label>
                    <input type="email" className="glass-input" placeholder="student@acropolis.in" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? "text" : "password"} className="glass-input" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} required />
                      <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>{loading ? 'Signing In...' : 'Sign In'} <ArrowRight size={18} /></button>
                </form>
                <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Don't have an account? <Link to="/signup" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign up here</Link></p>
              </AuthLayout>
            )
          } />

          <Route path="/signup" element={
            session ? <Navigate to="/" replace /> : (
              <AuthLayout>
                {!isOtpSent ? (
                  <>
                    <h1 className="title fade-in-up delay-1" style={{ fontSize: '2.5rem' }}>Join the Hub.</h1>
                    <p className="subtitle fade-in-up delay-2">Connect with the Mechatronics community and start building.</p>
                    <form className="fade-in-up delay-3" onSubmit={(e) => { setAuthFlow('signup'); handleAuth(e); }}>
                      {errorMsg && <div className="error-alert">{errorMsg}</div>}
                      <div className="input-group">
                        <label className="input-label">Full Name</label>
                        <input type="text" className="glass-input" placeholder="John Doe" value={fullName} onChange={(e)=>setFullName(e.target.value)} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">College Email</label>
                        <input type="email" className="glass-input" placeholder="student@acropolis.in" value={email} onChange={(e) => setEmail(e.target.value)} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">WhatsApp Number</label>
                        <input type="tel" className="glass-input" placeholder="+91 00000 00000" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Create Password</label>
                        <div style={{ position: 'relative' }}>
                          <input type={showPassword ? "text" : "password"} className="glass-input" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} required />
                          <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                        </div>
                      </div>
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight size={18} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="fade-in-up">
                    <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                      <Activity size={32} />
                    </div>
                    <h1 className="title" style={{ fontSize: '2rem' }}>Verify Email</h1>
                    <p className="subtitle">We've sent a 6-digit code to <strong>{email}</strong>. Please enter it below.</p>
                    
                    <form onSubmit={(e) => { setAuthFlow('signup'); handleAuth(e); }}>
                      {errorMsg && <div className="error-alert" style={{ marginBottom: '1.5rem' }}>{errorMsg}</div>}
                      <div className="input-group">
                        <input 
                          type="text" 
                          className="glass-input" 
                          placeholder="000000" 
                          value={otp} 
                          onChange={(e)=>setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                          required 
                          style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '1.5rem', fontWeight: 800, padding: '1.2rem' }} 
                        />
                      </div>
                      <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading || otp.length < 6}>
                        {loading ? 'Verifying...' : 'Complete Registration'} <ArrowRight size={18} />
                      </button>
                    </form>
                    
                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Didn't receive code? {resendTimer > 0 ? (
                          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                            Wait {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}s
                          </span>
                        ) : (
                          <span onClick={handleResend} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                            Resend Email
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                         Entered wrong email? <span onClick={() => { setIsOtpSent(false); setResendTimer(0); setResendAttempts(0); }} style={{ color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>Go back</span>
                      </p>
                    </div>
                  </div>
                )}
                <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Log in here</Link></p>
              </AuthLayout>
            )
          } />

          {/* DASHBOARD ROUTES */}
          <Route path="/admin/*" element={
            !session ? <Navigate to="/login" replace /> : (profile?.role === 'admin' ? <AdminDashboard session={session} profile={profile} /> : <Navigate to="/dashboard" replace />)
          } />

          <Route path="/dashboard" element={<Navigate to="/dashboard/events" replace />} />
          <Route path="/dashboard/:tab" element={
            !session ? <Navigate to="/login" replace /> : (profile?.role !== 'admin' ? <StudentDashboard session={session} profile={profile} deferredPrompt={deferredPrompt} isInstalled={isInstalled} /> : <Navigate to="/admin" replace />)
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        )}
      </Suspense>
    </ErrorBoundary>
  </div>
);
}

export default App;


