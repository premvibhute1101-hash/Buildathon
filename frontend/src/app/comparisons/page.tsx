'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import SiteComparisonSlider from '../../components/SiteComparisonSlider';
import CreateComparisonModal from '../../components/CreateComparisonModal';
import CreateReportModal from '../../components/CreateReportModal';
import GenAIAssistantDrawer from '../../components/GenAIAssistantDrawer';
import {
  getProjects,
  getComparisons,
  getComparison,
  getSuggestedPairs,
  API_BASE_URL
} from '../../lib/api';
import {
  Project,
  SiteComparisonListItem,
  SiteComparison,
  ComparisonPairSuggestion,
  Report
} from '../../types';
import {
  Layers,
  PlusCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Filter,
  RefreshCw,
  Search,
  X,
  Tag,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

export default function ComparisonsPage() {
  const { user, token, isLoading: isAuthLoading, quickDemoLogin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [comparisons, setComparisons] = useState<SiteComparisonListItem[]>([]);
  const [suggestions, setSuggestions] = useState<ComparisonPairSuggestion[]>([]);
  const [selectedComparison, setSelectedComparison] = useState<SiteComparison | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showNewReportModal, setShowNewReportModal] = useState<boolean>(false);
  const [showAssistantDrawer, setShowAssistantDrawer] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Load Projects
  useEffect(() => {
    async function loadInitialProjects() {
      if (!user || !token) return;
      try {
        const projs = await getProjects();
        setProjects(projs);
        if (projs.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projs[0].id);
        }
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    }
    if (user && token) {
      loadInitialProjects();
    } else if (!isAuthLoading) {
      setLoading(false);
    }
  }, [user, token, isAuthLoading]);

  // Load Comparisons for selected project
  const loadComparisons = async () => {
    if (!user || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getComparisons(selectedProjectId || undefined);
      setComparisons(data);

      if (selectedProjectId) {
        const suggs = await getSuggestedPairs(selectedProjectId);
        setSuggestions(suggs);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Failed to fetch comparisons', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      loadComparisons();
    }
  }, [user, token, selectedProjectId]);


  // Handle clicking a thumbnail card to open full slider
  const handleSelectComparison = async (compListItem: SiteComparisonListItem) => {
    setLoadingDetail(true);
    try {
      const fullDetail = await getComparison(compListItem.id);
      setSelectedComparison(fullDetail);
    } catch (err) {
      console.error('Failed to fetch comparison detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreated = (newComp?: SiteComparison) => {
    setShowCreateModal(false);
    loadComparisons();
    if (newComp) {
      setSelectedComparison(newComp);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Filter comparisons by search query
  const filteredComparisons = comparisons.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.location_tag.toLowerCase().includes(term) ||
      (c.project_name && c.project_name.toLowerCase().includes(term))
    );
  });

  if (!token && !user && !isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-100">Authentication Required</h2>
              <p className="text-xs text-slate-400">
                Please sign in to access visual timeline comparisons and computer vision telemetry.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => quickDemoLogin('admin')}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
              >
                1-Click Demo Login as Admin
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        onOpenNewReport={() => setShowNewReportModal(true)}
        onOpenAssistant={() => setShowAssistantDrawer(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Page Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-slate-800 shadow-xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-[11px] font-bold uppercase tracking-wider">
                Visual Site Intelligence
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                AI Timeline Slider & PPE Auditing
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Site Progress & Safety Comparisons
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Inspect timeline evolution across identical site coordinates with drag-to-reveal before/after photography, YOLOv8 bounding box overlays, and GenAI change synthesis.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              New Site Comparison
            </button>
          </div>
        </div>

        {/* Project Selector & Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-200">
                  All Active Projects
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search location tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-end">
            <span>{filteredComparisons.length} comparison(s) found</span>
            <button
              type="button"
              onClick={loadComparisons}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Refresh comparisons"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* AI Suggested Pairs Ribbon */}
        {suggestions.length > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>AI Pair Recommendations: {suggestions.length} unlinked timeline photos detected</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
              >
                Pair Photos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {suggestions.slice(0, 3).map((sug, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{sug.location_tag}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {sug.date_difference_days} days elapsed between photos
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold shrink-0"
                  >
                    Pair Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comparisons Grid / Thumbnail Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse p-4 space-y-3"
              />
            ))}
          </div>
        ) : filteredComparisons.length === 0 ? (
          /* Graceful Empty State with Prompt */
          <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Layers className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-200">
                No site comparisons created yet
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add an inspection pair or upload two milestone photos to unlock the interactive drag-to-reveal slider and AI change synthesis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <PlusCircle className="w-4 h-4" />
              Upload Comparison Pair
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredComparisons.map((comp) => {
              const beforeImgUrl = comp.before_photo_url.startsWith('http')
                ? comp.before_photo_url
                : `${API_BASE_URL}${comp.before_photo_url}`;
              const afterImgUrl = comp.after_photo_url.startsWith('http')
                ? comp.after_photo_url
                : `${API_BASE_URL}${comp.after_photo_url}`;

              const hasViolations = comp.after_violations_count > 0;

              return (
                <div
                  key={comp.id}
                  onClick={() => handleSelectComparison(comp)}
                  className="group relative rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all duration-200 shadow-lg hover:shadow-2xl overflow-hidden cursor-pointer flex flex-col justify-between"
                >
                  {/* Top Split Preview Container */}
                  <div className="relative w-full h-48 bg-black overflow-hidden flex">
                    {/* Before Half */}
                    <div className="relative w-1/2 h-full overflow-hidden border-r border-amber-400/80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={beforeImgUrl}
                        alt="Before photo preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-[9px] font-bold text-amber-400 uppercase tracking-wider backdrop-blur-sm">
                        Before
                      </div>
                    </div>

                    {/* After Half */}
                    <div className="relative w-1/2 h-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={afterImgUrl}
                        alt="After photo preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-[9px] font-bold text-emerald-400 uppercase tracking-wider backdrop-blur-sm">
                        After
                      </div>
                    </div>

                    {/* Central Hover Prompt */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                      <span className="px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-1.5 transform group-hover:scale-105 transition-transform">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Open Interactive Slider
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                          <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {comp.location_tag}
                        </span>
                        {hasViolations ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800 text-[10px] font-bold shrink-0 uppercase">
                            <ShieldAlert className="w-3 h-3" /> Flagged
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-bold shrink-0 uppercase">
                            <ShieldCheck className="w-3 h-3" /> Compliant
                          </span>
                        )}
                      </div>

                      {comp.project_name && (
                        <p className="text-[11px] text-slate-400 truncate">
                          Project: {comp.project_name}
                        </p>
                      )}
                    </div>

                    {/* Timeline Dates Bar */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        <span>{formatDate(comp.before_date)}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        <span>{formatDate(comp.after_date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FULL COMPARISON SLIDER MODAL */}
      {selectedComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-5xl my-auto">
            {/* Close Button on Modal */}
            <button
              type="button"
              onClick={() => setSelectedComparison(null)}
              className="absolute -top-10 right-0 sm:top-2 sm:right-2 z-50 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <SiteComparisonSlider
              comparison={selectedComparison}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* CREATE COMPARISON MODAL */}
      {showCreateModal && (
        <CreateComparisonModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreated}
          defaultProjectId={selectedProjectId}
        />
      )}

      {/* NEW REPORT MODAL */}
      {showNewReportModal && (
        <CreateReportModal
          onClose={() => setShowNewReportModal(false)}
          onSuccess={() => {
            setShowNewReportModal(false);
            loadComparisons();
          }}
        />
      )}

      {/* GENAI ASSISTANT DRAWER */}
      <GenAIAssistantDrawer
        isOpen={showAssistantDrawer}
        onClose={() => setShowAssistantDrawer(false)}
        onSelectReport={(rep) => setSelectedReport(rep)}
      />
    </div>
  );
}
