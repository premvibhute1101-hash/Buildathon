'use client';

import React, { useState, useEffect } from 'react';
import { getProjects, createProject, getSites, createSite, getReports } from '../lib/api';
import { Project, Site, Report, ProjectStatus } from '../types';
import {
  Building2,
  Plus,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MapPin,
  ChevronRight,
  FolderPlus,
  Loader2
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import Link from 'next/link';

interface ProjectsViewProps {
  onSelectReport: (report: Report) => void;
  onOpenNewReport: () => void;
}

export default function ProjectsView({ onSelectReport, onOpenNewReport }: ProjectsViewProps) {
  const { user, token, isLoading: isAuthLoading, quickDemoLogin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [siteReports, setSiteReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Project Modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<ProjectStatus>('active');

  // New Site Modal state
  const [showNewSiteModal, setShowNewSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProjects = async () => {
    if (!token || !user) return;
    setIsLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      loadProjects();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [user, token, isAuthLoading]);


  useEffect(() => {
    if (selectedProjectId && token) {
      getSites(selectedProjectId)
        .then((sitesData) => {
          setSites(sitesData);
          if (sitesData.length > 0) {
            setSelectedSiteId(sitesData[0].id);
          } else {
            setSelectedSiteId(null);
          }
        })
        .catch(console.error);
    }
  }, [selectedProjectId, token]);

  useEffect(() => {
    if (selectedSiteId && token) {
      getReports({ site_id: selectedSiteId })
        .then(setSiteReports)
        .catch(console.error);
    } else {
      setSiteReports([]);
    }
  }, [selectedSiteId, token]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createProject(newProjectName, newProjectStatus);
      setProjects((prev) => [...prev, created]);
      setSelectedProjectId(created.id);
      setNewProjectName('');
      setShowNewProjectModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !selectedProjectId) return;
    setIsSubmitting(true);
    try {
      const created = await createSite(selectedProjectId, newSiteName);
      setSites((prev) => [...prev, created]);
      setSelectedSiteId(created.id);
      setNewSiteName('');
      setShowNewSiteModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-400" />
            Projects & Construction Site Zones
          </h1>
          <p className="text-xs text-slate-400">
            Manage projects, define hierarchical site areas, and inspect area logs
          </p>
        </div>

        <button
          onClick={() => setShowNewProjectModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Create New Project
        </button>
      </div>

      {!token && !isAuthLoading && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-center space-y-3 shadow-xl">
          <h2 className="text-base font-bold text-slate-100">Sign in to Access Site Zones & Field Reports</h2>
          <p className="text-xs text-slate-400">Choose a quick demo profile or sign in to view live project data:</p>
          <div className="flex flex-wrap justify-center gap-2.5 pt-2">
            <button
              onClick={() => quickDemoLogin('admin')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20"
            >
              Admin (Alexander Vance)
            </button>
            <button
              onClick={() => quickDemoLogin('supervisor')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700"
            >
              Site Supervisor (Marcus Holloway)
            </button>
            <button
              onClick={() => quickDemoLogin('safety')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700"
            >
              Safety Officer (Elena Rostova)
            </button>
          </div>
        </div>
      )}

      {/* Projects List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map((proj) => {
          const isSelected = proj.id === selectedProjectId;
          return (
            <div
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Project
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                  proj.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  proj.status === 'on_hold' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-blue-950 text-blue-400 border border-blue-800'
                }`}>
                  {proj.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="mt-2 text-base font-bold text-slate-100">{proj.name}</h3>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  {proj.sites_count || 0} Site Zones
                </span>
                <span className="text-[11px] font-mono">
                  {new Date(proj.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hierarchical Site Zones & Reports Section */}
      {selectedProject && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          {/* Sites / Areas Column */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                Site Zones / Work Areas ({sites.length})
              </h3>
              <button
                onClick={() => setShowNewSiteModal(true)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Area
              </button>
            </div>

            <div className="space-y-2">
              {sites.map((site) => {
                const isSiteSelected = site.id === selectedSiteId;
                return (
                  <div
                    key={site.id}
                    onClick={() => setSelectedSiteId(site.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSiteSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-slate-100'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold block">{site.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {site.reports_count || 0} Reports logged
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isSiteSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Area Reports Column */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Area Reports: {sites.find(s => s.id === selectedSiteId)?.name || 'Select Zone'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {siteReports.length} reports logged for this specific location
                </p>
              </div>

              <button
                onClick={onOpenNewReport}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                Add Report
              </button>
            </div>

            {siteReports.length > 0 ? (
              <div className="space-y-3">
                {siteReports.map((rep) => {
                  const hasViolation = rep.images.some(img => img.ai_label === 'issue_detected');
                  return (
                    <div
                      key={rep.id}
                      onClick={() => onSelectReport(rep)}
                      className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          rep.type === 'incident' ? 'bg-red-950 text-red-400 border border-red-800' :
                          rep.type === 'inspection' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}>
                          {rep.type}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(rep.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 line-clamp-2">
                        {rep.text}
                      </p>

                      {rep.images && rep.images.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 text-[11px]">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            hasViolation
                              ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          }`}>
                            {hasViolation ? '⚠️ Safety Issue Flagged' : '✅ Compliant'}
                          </span>
                          <span className="text-slate-500 font-mono">
                            {rep.images.length} photo(s) attached
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No reports found for this site zone yet. Click &ldquo;Add Report&rdquo; to log one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Skyline Medical Center"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Site Zone Modal */}
      {showNewSiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Add Site Zone / Work Area</h3>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Zone / Area Name *
                </label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="e.g. Elevator Shaft Core - Level 4"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSiteModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  {isSubmitting ? 'Adding...' : 'Add Zone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
