'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { HardHat, LogOut, Search, MessageSquareCode, Building2, LayoutDashboard, PlusCircle, Shield, User as UserIcon, Layers } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  onOpenNewReport?: () => void;
  onOpenAssistant?: () => void;
}

export default function Navbar({ onOpenNewReport, onOpenAssistant }: NavbarProps) {
  const { user, logout, quickDemoLogin } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/projects', label: 'Projects & Sites', icon: Building2 },
    { href: '/comparisons', label: 'Site Comparisons', icon: Layers },
    { href: '/search', label: 'Search & Reports', icon: Search },
    { href: '/assistant', label: 'AI Site Intelligence', icon: MessageSquareCode },
  ];


  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <HardHat className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-100 tracking-tight text-base sm:text-lg">
                    SITE<span className="text-amber-400">SENSE</span>
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    AI PRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                  Construction Intelligence Platform
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Action Buttons & Profile */}
          <div className="flex items-center gap-3">
            {onOpenNewReport && (
              <button
                type="button"
                onClick={onOpenNewReport}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/10 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                New Site Report
              </button>
            )}

            {onOpenAssistant && (
              <button
                type="button"
                onClick={onOpenAssistant}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 font-medium text-xs transition-all"
              >
                <MessageSquareCode className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Ask AI Assistant</span>
              </button>
            )}

            {/* Quick Demo Switcher / User Profile */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                  <span className="text-[10px] font-mono text-amber-400/90 uppercase tracking-wider">
                    {user.role === 'admin' ? 'Project Director' : 'Site Officer'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => quickDemoLogin('admin')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium"
                >
                  Demo Login
                </button>
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
