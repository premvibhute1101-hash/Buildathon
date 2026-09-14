'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HardHat, ShieldCheck, UserCheck, Lock, Mail, ArrowRight, Loader2, Sparkles, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { login, quickDemoLogin, user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoClick = async (role: 'admin' | 'supervisor' | 'safety' | 'contractor') => {
    setIsLoading(true);
    setError(null);
    try {
      await quickDemoLogin(role);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 shadow-xl shadow-amber-500/20">
          <HardHat className="w-8 h-8 text-slate-950" />
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          SiteSense <span className="text-amber-400">Intelligence</span>
        </h1>
        <p className="text-xs text-slate-400">
          Construction Operations & Computer Vision PPE Safety Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Quick Demo Access Buttons */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                1-Click Quick Demo Sign In:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoClick('admin')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all hover:border-amber-500/50 group"
              >
                <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">
                  Project Director
                </span>
                <span className="text-[10px] text-slate-500 font-mono">admin role</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('safety')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all hover:border-amber-500/50 group"
              >
                <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">
                  Safety Officer
                </span>
                <span className="text-[10px] text-slate-500 font-mono">auditor role</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('supervisor')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all hover:border-amber-500/50 group"
              >
                <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">
                  Site Supervisor
                </span>
                <span className="text-[10px] text-slate-500 font-mono">field logs</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('contractor')}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left transition-all hover:border-amber-500/50 group"
              >
                <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">
                  General Contractor
                </span>
                <span className="text-[10px] text-slate-500 font-mono">trade crew</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="flex-shrink mx-3 text-slate-500 text-[11px] uppercase font-mono">
              Or sign in with email
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Standard Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  Sign In to Command Center
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
