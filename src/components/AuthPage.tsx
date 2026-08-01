import React, { useState } from 'react';
import { Mail, Sparkles, Lock, ArrowRight, ShieldCheck, User, Building, Briefcase, CheckCircle2 } from 'lucide-react';
import { googleSignIn } from '../lib/firebaseAuth';

interface AuthPageProps {
  onLoginSuccess: (userData: { name: string; email: string; title: string; company: string }, isGoogleGmail?: boolean) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
      const result = await googleSignIn();
      if (result && result.user) {
        onLoginSuccess(
          {
            name: result.user.displayName || result.user.email?.split('@')[0] || 'Gmail User',
            email: result.user.email || 'user@gmail.com',
            title: 'Executive User',
            company: 'Google Workspace',
          },
          true
        );
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setError(err.message || 'Google Sign In failed. Please try again or use Demo mode.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (isSignUp && (!name || !title || !company)) {
      setError('Please fill in all personal details for sign up.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: isSignUp ? name : name || email.split('@')[0].replace('.', ' ') || 'Gaurav Singh',
        email: email,
        title: isSignUp ? title : title || 'Executive Operations',
        company: isSignUp ? company : company || 'Apex Digital Inc.',
      });
    }, 600);
  };

  const handleDemoLogin = (demoName: string, demoEmail: string, demoTitle: string, demoCompany: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: demoName,
        email: demoEmail,
        title: demoTitle,
        company: demoCompany,
      });
    }, 400);
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-0.5 shadow-xl shadow-indigo-500/20 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Mail className="w-7 h-7 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Email Triage AI</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
              v2.4
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Save hours daily with Gemini AI-powered priority scoring, executive summaries & quick replies.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {/* Real Gmail Connection Option */}
          <div>
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isGoogleLoading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-3 border border-slate-200 active:scale-98 disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isGoogleLoading ? 'Connecting to Gmail...' : 'Connect Real Gmail (Sign in with Google)'}</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-1.5 font-medium">
              Live OAuth integration — view & send emails from your real Inbox
            </p>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest absolute">
              Or Local / Demo Account
            </span>
          </div>

          {/* Sign In vs Sign Up Tab Toggle */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                !isSignUp ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                isSignUp ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Job Title</label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Head of Ops"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Company</label>
                    <div className="relative">
                      <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Apex Digital"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Work Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.rivera@apexdigital.io"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 text-xs text-slate-200 placeholder-slate-600 rounded-xl border border-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <Sparkles className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account & Access Triage' : 'Sign In to Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block text-center">
              Or Instant Demo Sign-In
            </span>

            <button
              type="button"
              onClick={() => handleDemoLogin('Alex Rivera', 'alex.rivera@apexdigital.io', 'Head of Operations', 'Apex Digital Inc.')}
              className="w-full p-2.5 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl transition flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
                  AR
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                    Alex Rivera (Executive)
                  </p>
                  <p className="text-[10px] text-slate-500">Head of Ops @ Apex Digital</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Quick Start
              </span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-600 text-center mt-6">
          Protected by Enterprise Grade Encryption & Gemini AI Privacy Controls
        </p>
      </div>
    </div>
  );
};
