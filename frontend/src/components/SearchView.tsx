'use client';

import React, { useState, useEffect } from 'react';
import { getReports, getSites } from '../lib/api';
import { Report, Site } from '../types';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Eye,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  X
} from 'lucide-react';
import BoundingBoxOverlay from './BoundingBoxOverlay';
import { useAuth } from '../context/AuthContext';

interface SearchViewProps {
  onSelectReport: (report: Report) => void;
  initialQuery?: string;
}

export default function SearchView({ onSelectReport, initialQuery = '' }: SearchViewProps) {
  const { user, token, isLoading: isAuthLoading } = useAuth();

  const [sites, setSites] = useState<Site[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState(initialQuery);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedAiLabel, setSelectedAiLabel] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState('all');

  useEffect(() => {
    if (user && token) {
      getSites().then(setSites).catch(console.error);
    }
  }, [user, token]);

  const executeSearch = async () => {
    if (!token || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let date_from: string | undefined;
      const now = new Date();

      if (dateRangePreset === '7d') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        date_from = d.toISOString();
      } else if (dateRangePreset === '14d') {
        const d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        date_from = d.toISOString();
      } else if (dateRangePreset === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        date_from = d.toISOString();
      }

      const results = await getReports({
        keyword: keyword || undefined,
        site_id: selectedSiteId || undefined,
        type: selectedType || undefined,
        ai_label: selectedAiLabel || undefined,
        date_from
      });
      setReports(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    executeSearch();
  }, [token, selectedSiteId, selectedType, selectedAiLabel, dateRangePreset]);

  // Apply natural prompt preset: "Show all safety issues reported in Area B during the last two weeks"
  const applyPresetAreaBSafety = () => {
    const areaBSite = sites.find(s => s.name.toLowerCase().includes('area b') || s.name.toLowerCase().includes('framing'));
    if (areaBSite) {
      setSelectedSiteId(areaBSite.id);
    } else {
      setKeyword('Area B');
    }
    setSelectedAiLabel('issue_detected');
    setDateRangePreset('14d');
  };

  const clearFilters = () => {
    setKeyword('');
    setSelectedSiteId('');
    setSelectedType('');
    setSelectedAiLabel('');
    setDateRangePreset('all');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Title & Preset Helper */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <Search className="w-6 h-6 text-amber-400" />
            Site Intelligence Search & Reports Discovery
          </h1>
          <p className="text-xs text-slate-400">
            Query across historical inspections, safety incidents, and computer vision flags
          </p>
        </div>

        {/* Quick Natural Preset Button */}
        <button
          onClick={applyPresetAreaBSafety}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Quick Filter: Safety in Area B (Last 2 Weeks)</span>
        </button>
      </div>

      {/* Filter Control Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        {/* Text Search Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search by keywords, contractor name, equipment, or observation notes..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
          >
            Search
          </button>
        </form>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          {/* Site / Zone Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Construction Zone / Area
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Zones & Sectors</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Report Classification Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Report Classification
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Report Types</option>
              <option value="inspection">Inspection Only</option>
              <option value="incident">Incident / Hazard Only</option>
              <option value="progress">Daily Progress Log Only</option>
            </select>
          </div>

          {/* AI PPE Detection Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              AI PPE Compliance Status
            </label>
            <select
              value={selectedAiLabel}
              onChange={(e) => setSelectedAiLabel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Compliance States</option>
              <option value="issue_detected">Safety Issues Only (Violations)</option>
              <option value="compliant">Compliant Audits Only</option>
            </select>
          </div>

          {/* Date Range Preset Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Date Period
            </label>
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Time Records</option>
              <option value="7d">Last 7 Days (This Week)</option>
              <option value="14d">Last 14 Days (Last 2 Weeks)</option>
              <option value="30d">Last 30 Days (Past Month)</option>
            </select>
          </div>
        </div>

        {/* Active Filters Clear Button */}
        {(keyword || selectedSiteId || selectedType || selectedAiLabel || dateRangePreset !== 'all') && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>Filtering active</span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-slate-200">
          Showing {reports.length} matching site log(s)
        </span>
      </div>

      {/* Results Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-mono text-slate-400">Querying project repository...</p>
        </div>
      ) : reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((report) => {
            const hasIssue = report.images.some(img => img.ai_label === 'issue_detected');
            return (
              <div
                key={report.id}
                onClick={() => onSelectReport(report)}
                className="group p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all shadow-lg cursor-pointer flex flex-col justify-between space-y-3"
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

                  <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                    {report.text}
                  </p>
                </div>

                {report.images && report.images.length > 0 && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-800">
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
      ) : (
        <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          No reports match the current query criteria. Try clearing or relaxing the filters.
        </div>
      )}
    </div>
  );
}
