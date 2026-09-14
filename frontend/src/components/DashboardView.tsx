'use client';

import React, { useState, useEffect } from 'react';
import {
  getDashboardSummary,
  getRecurringIssues,
  getReports,
  getSites
} from '../lib/api';
import {
  DashboardSummary,
  RecurringIssue,
  Report,
  Site
} from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Building2,
  TrendingUp,
  Activity,
  Calendar,
  Eye,
  PlusCircle,
  HardHat,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Search
} from 'lucide-react';
import BoundingBoxOverlay from './BoundingBoxOverlay';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

interface DashboardViewProps {
  onOpenNewReport: () => void;
  onOpenAssistant: () => void;
  onSelectReport: (report: Report) => void;
}

export default function DashboardView({
  onOpenNewReport,
  onOpenAssistant,
  onSelectReport
}: DashboardViewProps) {
  const { user, token, isLoading: isAuthLoading, quickDemoLogin } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recurringIssues, setRecurringIssues] = useState<RecurringIssue[]>([]);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [sumData, recData, repData, sitesData] = await Promise.all([
        getDashboardSummary(),
        getRecurringIssues(),
        getReports({ limit: 6 as any }),
        getSites()
      ]);
      setSummary(sumData);
      setRecurringIssues(recData);
      setRecentReports(repData);
      setSites(sitesData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [token, isAuthLoading]);

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Authenticating Site Access...</p>
      </div>
    );
  }

  if (!token && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-4">
        <div className="max-w-lg w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <HardHat className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">Authentication Required</h2>
            <p className="text-xs text-slate-400">
              Please sign in to access live site telemetry, AI vision inspection records, and real-time safety audits.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Quick 1-Click Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => quickDemoLogin('admin')}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all hover:border-amber-500/50 group"
              >
                <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">
                  Project Director
                </span>
                <span className="text-[10px] text-slate-500 font-mono">admin@example.com</span>
              </button>
              <button
                onClick={() => quickDemoLogin('safety')}
                className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all hover:border-amber-500/50 group"
              >
                <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">
                  Safety Officer
                </span>
                <span className="text-[10px] text-slate-500 font-mono">safety@example.com</span>
              </button>
            </div>
            <div className="pt-3 border-t border-slate-800">
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
              >
                Go to Sign In Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Loading Site Telemetry & AI Models...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Hero */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Live AI Vision Telemetry Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Site Operations & Safety Command Center
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Automated computer vision PPE audits, real-time safety incident logging, and grounded AI assistant for construction site intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenNewReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Upload Site Photo / Report
            </button>
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 font-semibold text-xs transition-all"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Ask AI Assistant
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Field Logs
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100 font-mono">
              {summary?.total_reports || 0}
            </span>
            <span className="text-[11px] text-slate-400">recorded</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            Active across {sites.length} construction zones
          </p>
        </div>

        {/* Safety Issues Flagged */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Open Safety Violations
            </span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-400 font-mono">
              {summary?.total_issues || 0}
            </span>
            <span className="text-[11px] text-red-400/80 font-medium">
              ({summary?.issues_this_week || 0} this week)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            YOLOv8 detected PPE infractions
          </p>
        </div>

        {/* PPE Compliance Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              PPE Compliance Rate
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {summary?.compliance_rate || 100}%
            </span>
            <span className="text-[11px] text-emerald-500 font-medium">overall</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${summary?.compliance_rate || 100}%` }}
            />
          </div>
        </div>

        {/* Active Sites */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monitored Site Zones
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400 font-mono">
              {sites.length}
            </span>
            <span className="text-[11px] text-slate-400">zones active</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            All sectors reporting daily
          </p>
        </div>
      </div>

      {/* Recurring Issues Risk Highlights */}
      {recurringIssues.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/60 to-slate-900 border border-red-800/60 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-300">
                Critical Safety Alert: Recurring Violations Detected
              </h2>
            </div>
            <span className="text-[11px] font-mono text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
              {recurringIssues.length} HOTSPOTS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {recurringIssues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-red-900/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    {issue.site_name}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px] font-mono font-bold uppercase">
                    {issue.count}x Repeated
                  </span>
                </div>
                <p className="text-xs text-red-300">
                  ⚠️ <span className="font-semibold">{issue.class_name === 'no_hardhat' ? 'Missing Hardhat' : 'Missing Safety Vest'}</span> recorded repeatedly.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Latest: {new Date(issue.latest_occurrence).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues by Site Area */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Safety Issues by Construction Zone</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </h2>

          <div className="space-y-3">
            {summary?.issues_by_site && summary.issues_by_site.length > 0 ? (
              summary.issues_by_site.map((siteItem, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium truncate max-w-[200px]">
                      {siteItem.site_name}
                    </span>
                    <span className="text-red-400 font-mono font-bold">
                      {siteItem.issue_count} issues
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-red-500 h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (siteItem.issue_count / (summary.total_issues || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No site-specific issues recorded.</p>
            )}
          </div>
        </div>

        {/* Violations by PPE Category */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>AI PPE Detection Breakdown</span>
            <HardHat className="w-4 h-4 text-amber-400" />
          </h2>

          <div className="space-y-3">
            {summary?.violations_by_class && summary.violations_by_class.length > 0 ? (
              summary.violations_by_class.map((clsItem, i) => {
                const isViolation = clsItem.class_name.startsWith('no_');
                return (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isViolation ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                        }`}
                      />
                      <span className="font-mono text-slate-200 uppercase">
                        {clsItem.class_name.replace('_', ' ')}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        isViolation
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {clsItem.count} instances
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No PPE data processed yet.</p>
            )}
          </div>
        </div>

        {/* Quick Search Helper */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-amber-400" />
              Natural Filter Query
            </h2>
            <p className="text-xs text-slate-400">
              Try the spec example query:
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-amber-300 font-mono italic">
              &ldquo;Show all safety issues reported in Area B during the last two weeks&rdquo;
            </div>
          </div>

          <a
            href="/search?keyword=Area%20B&ai_label=issue_detected"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            <span>Run Pre-Configured Query</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </a>
        </div>
      </div>

      {/* Live Recent Site Reports & Visual AI Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              Live Site Activity Feed & Photo Audits
            </h2>
            <p className="text-xs text-slate-400">
              Inspections, daily logs, and automatic YOLOv8 bounding box overlays
            </p>
          </div>
          <a
            href="/search"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            View All Reports <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentReports.map((report) => {
            const hasIssue = report.images.some(img => img.ai_label === 'issue_detected');
            return (
              <div
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="group p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all duration-200 shadow-lg cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 truncate max-w-[180px]">
                      {report.site_name || 'Site Area'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      report.type === 'incident' ? 'bg-red-950 text-red-400 border border-red-800' :
                      report.type === 'inspection' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}>
                      {report.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {report.text}
                  </p>
                </div>

                {/* Photo Thumbnail with Overlaid Bounding Box */}
                {report.images && report.images.length > 0 && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 group-hover:border-slate-700">
                    <BoundingBoxOverlay
                      imageUrl={report.images[0].url}
                      detections={report.images[0].detections || []}
                      aiLabel={report.images[0].ai_label}
                      aiConfidence={report.images[0].ai_confidence}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-amber-400 group-hover:underline flex items-center gap-0.5 text-xs font-semibold">
                    Inspect Report <Eye className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
