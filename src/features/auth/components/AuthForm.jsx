import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, provider as googleProvider } from '../../../firebase';
import logoImg from '../../../assets/logo.png';
import bgChart from '../../../assets/bg-chart.jpg';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Mail, Lock, Eye, EyeOff, Shield, User, Building2, Phone, Zap, Cpu, Globe } from 'lucide-react';

const FEATURE_BADGES = [
  { label: 'REAL-TIME SYNC', Icon: Zap },
  { label: 'ISO CERTIFIED', Icon: Shield },
  { label: 'AI INTELLIGENCE', Icon: Cpu },
  { label: 'GLOBAL LEDGER', Icon: Globe }
];

const AuthForm = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberStation, setRememberStation] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const heading = useMemo(
    () => (isLogin ? 'Sign in to MunafaOS' : 'Initialize Your Ecosystem'),
    [isLogin]
  );

  const submitLabel = useMemo(
    () => (loading ? 'Processing...' : isLogin ? 'LAUNCH MUNAFAOS >' : 'INITIALIZE ACCOUNT >'),
    [loading, isLogin]
  );

  const ensureUserProfile = useCallback(async (user) => {
    if (!user?.uid) return;

    const userRef = doc(db, 'users', user.uid);
    const existingProfile = await getDoc(userRef);

    if (!existingProfile.exists()) {
      await setDoc(userRef, {
        email: user.email || '',
        role: 'owner',
        workspaceId: user.uid,
        createdAt: serverTimestamp()
      });
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard', { replace: true });
      } else {
        if (password !== confirmPassword) {
          alert('Access Keys do not match.');
          setLoading(false);
          return;
        }

        const signupResult = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUserProfile(signupResult.user);
        if (signupResult.user) {
          await sendEmailVerification(signupResult.user);
        }
        await signOut(auth);
        alert('Account initialized! Please check your email (and spam folder) for the verification link before signing in.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      setError(String(err?.message || '').replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserProfile(result.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err?.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
      } else {
        setError(String(err?.message || 'Google sign-in failed'));
      }
    }
  };

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await ensureUserProfile(result.user);
          navigate('/dashboard', { replace: true });
        }
      })
      .catch((err) => {
        setError(String(err?.message || 'Google sign-in failed'));
      });
  }, [ensureUserProfile, navigate]);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      alert('Please enter your business email first.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      alert('Reset link dispatched to your email.');
    } catch (err) {
      if (err?.code === 'auth/user-not-found') {
        alert('No account found with this email.');
      } else {
        alert(err?.message || 'Password reset failed.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      <section
        className="relative lg:w-[40%] text-white px-8 sm:px-12 py-12 lg:py-16 flex flex-col justify-between overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${bgChart})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 bg-slate-950/90" />

        <div>
          <div className="relative z-10 flex items-center gap-3">
            <img src={logoImg} alt="MunafaOS" className="w-8 h-8 rounded object-cover" />
            <div className="flex flex-col">
              <h1 className="text-white font-extrabold text-2xl leading-none">MunafaOS</h1>
              <span className="text-emerald-500 text-[10px] font-bold tracking-[0.2em] uppercase">
                PROFIT OPTIMIZER
              </span>
            </div>
          </div>

          <h1 className="relative z-10 mt-8 text-4xl sm:text-5xl font-extrabold leading-tight">
            <span className="text-white">Scale </span>
            <span className="text-emerald-500">Profit</span>{' '}
            <span className="text-white font-serif italic font-semibold">Effortlessly.</span>
          </h1>

          <p className="relative z-10 mt-5 max-w-xl text-slate-300 text-sm sm:text-base">
            The only operating system designed for enterprise-grade financial optimization and growth hacking.
          </p>
        </div>

        <div className="relative z-10 mt-10 grid grid-cols-2 gap-3 max-w-md">
          {FEATURE_BADGES.map(({ label, Icon }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-[11px] sm:text-xs font-semibold tracking-[0.08em] text-slate-200"
            >
              <Icon className="h-3.5 w-3.5 text-emerald-400" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lg:w-[60%] bg-white px-6 sm:px-10 py-10 sm:py-14 flex items-center justify-center">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-slate-900">{heading}</h2>
          <p className="text-gray-500 text-sm mt-2">Optimize your profits with real-time data orchestration</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block uppercase text-[11px] tracking-[0.08em] font-bold text-slate-600">
                    FIRST NAME
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block uppercase text-[11px] tracking-[0.08em] font-bold text-slate-600">
                    LAST NAME
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="mb-2 block uppercase text-[11px] tracking-[0.08em] font-bold text-slate-600">
                  BUSINESS NAME
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="mb-2 block uppercase text-[11px] tracking-[0.08em] font-bold text-slate-600">
                  PHONE NUMBER
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block uppercase text-[11px] tracking-[0.08em] font-bold text-slate-600">
                BUSINESS EMAIL
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block uppercase text-[11px] tracking-[0.08em] font-bold text-slate-600">
                  ACCESS KEY
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[11px] font-bold tracking-[0.08em] text-slate-500 hover:text-emerald-600"
                  >
                    RESET KEY
                  </button>
                )}
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-11 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="mb-2 block uppercase text-[11px] tracking-[0.08em] font-bold text-slate-600">
                  CONFIRM ACCESS KEY
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            {isLogin ? (
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberStation}
                    onChange={(e) => setRememberStation(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-semibold tracking-[0.08em] text-slate-600">
                    REMEMBER STATION
                  </span>
                </label>

                <span
                  title="End-to-End Encrypted Authentication"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-emerald-700 transition hover:bg-green-50"
                >
                  <Shield className="h-3.5 w-3.5" />
                  SECURE
                </span>
              </div>
            ) : (
              <div className="flex justify-end">
                <span
                  title="End-to-End Encrypted Authentication"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-emerald-700 transition hover:bg-green-50"
                >
                  <Shield className="h-3.5 w-3.5" />
                  SECURE
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-extrabold tracking-wide text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </form>

          <div className="mt-7">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[11px] font-bold tracking-[0.08em] text-slate-400">
                  ENTERPRISE SSO
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-bold tracking-wide text-slate-700 transition hover:bg-slate-50"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.31-1.03 2.41-2.16 3.14v2.6h3.5c2.05-1.89 3.23-4.67 3.23-7.75z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.5-2.6c-.98.66-2.23 1.06-3.78 1.06-2.9 0-5.36-1.96-6.24-4.6H2.14v2.73C3.97 20.53 7.71 23 12 23z"/><path fill="#FBBC05" d="M5.76 14.2A6.976 6.976 0 0 1 5.4 12c0-.76.13-1.51.36-2.2v-2.73H2.14A10.997 10.997 0 0 0 1 12c0 1.77.42 3.45 1.14 4.93l3.62-2.73z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.71 1 3.97 3.47 2.14 7.07l3.62 2.73c.88-2.64 3.34-4.42 6.24-4.42z"/></svg>
                {isLogin ? 'Log in with Google' : 'Sign up with Google'}
              </button>
            </div>
          </div>

          <div className="mt-7 text-center text-sm text-slate-600">
            {isLogin ? 'Need workspace access?' : 'Already provisioned?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin((prev) => !prev);
                setError('');
                setShowPassword(false);
                setConfirmPassword('');
              }}
              className="text-emerald-600 hover:text-emerald-500 font-semibold cursor-pointer bg-transparent border-0 p-0 outline-none focus:outline-none"
            >
              {isLogin ? 'Initialize Account' : 'Sign In'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuthForm;
