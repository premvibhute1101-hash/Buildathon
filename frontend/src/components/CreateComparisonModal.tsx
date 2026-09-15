'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Layers,
  Sparkles,
  Calendar,
  Tag,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  Image as ImageIcon
} from 'lucide-react';
import {
  getProjects,
  getReports,
  createComparison,
  uploadComparison,
  getSuggestedPairs,
  API_BASE_URL
} from '../lib/api';
import { Project, Report, ImageRecord, ComparisonPairSuggestion, SiteComparison } from '../types';

interface CreateComparisonModalProps {
  onClose: () => void;
  onSuccess: (comparison?: SiteComparison) => void;
  defaultProjectId?: string;
  defaultLocationTag?: string;
}

export default function CreateComparisonModal({
  onClose,
  onSuccess,
  defaultProjectId,
  defaultLocationTag = ''
}: CreateComparisonModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'pair'>('upload');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId || '');
  const [locationTag, setLocationTag] = useState<string>(defaultLocationTag);

  // Upload Form State
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [beforeDate, setBeforeDate] = useState<string>('');
  const [afterDate, setAfterDate] = useState<string>('');
  const [beforeNotes, setBeforeNotes] = useState<string>('');
  const [afterNotes, setAfterNotes] = useState<string>('');

  // Pairing Existing Photos State
  const [availableImages, setAvailableImages] = useState<ImageRecord[]>([]);
  const [selectedBeforeImgId, setSelectedBeforeImgId] = useState<string>('');
  const [selectedAfterImgId, setSelectedAfterImgId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<ComparisonPairSuggestion[]>([]);

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPairs, setLoadingPairs] = useState<boolean>(false);

  // Load projects on mount
  useEffect(() => {
    async function loadInitial() {
      try {
        const projs = await getProjects();
        setProjects(projs);
        if (!selectedProjectId && projs.length > 0) {
          setSelectedProjectId(projs[0].id);
        }
      } catch (e: any) {
        console.error('Failed to load projects', e);
      }
    }
    loadInitial();
  }, [selectedProjectId]);

  // When project or tab changes, load project photos and suggestions
  useEffect(() => {
    if (!selectedProjectId) return;

    async function loadProjectData() {
      setLoadingPairs(true);
      try {
        // Fetch project reports to extract images
        const reports = await getReports({ project_id: selectedProjectId, limit: 100 });
        const allImgs: ImageRecord[] = [];
        reports.forEach((r) => {
          (r.images || []).forEach((img) => {
            allImgs.push({
              ...img,
              location_tag: img.location_tag || r.site_name || 'Site Area'
            });
          });
        });
        setAvailableImages(allImgs);

        // Fetch suggested pairs
        const suggs = await getSuggestedPairs(selectedProjectId);
        setSuggestions(suggs);
      } catch (e: any) {
        console.error('Failed to load project photos', e);
      } finally {
        setLoadingPairs(false);
      }
    }

    loadProjectData();
  }, [selectedProjectId]);

  // File Handlers with Preview
  const handleBeforeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBeforeFile(file);
      setBeforePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAfterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAfterFile(file);
      setAfterPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  // Submit Direct Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }
    if (!locationTag.trim()) {
      setError('Please provide a location tag (e.g. "North Wing — Level 2")');
      return;
    }
    if (!beforeFile || !afterFile) {
      setError('Please select both a BEFORE photo and an AFTER photo');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('project_id', selectedProjectId);
      formData.append('location_tag', locationTag.trim());
      formData.append('before_file', beforeFile);
      formData.append('after_file', afterFile);
      if (beforeDate) formData.append('before_date', new Date(beforeDate).toISOString());
      if (afterDate) formData.append('after_date', new Date(afterDate).toISOString());
      if (beforeNotes) formData.append('before_notes', beforeNotes);
      if (afterNotes) formData.append('after_notes', afterNotes);

      const result = await uploadComparison(formData);
      onSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Failed to create comparison');
    } finally {
      setLoading(false);
    }
  };

  // Submit Pairing of Existing Photos
  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }
    if (!locationTag.trim()) {
      setError('Please provide a location tag for this comparison');
      return;
    }
    if (!selectedBeforeImgId || !selectedAfterImgId) {
      setError('Please choose both a Before photo and an After photo');
      return;
    }
    if (selectedBeforeImgId === selectedAfterImgId) {
      setError('Before photo and After photo must be different photos');
      return;
    }

    setLoading(true);
    try {
      const result = await createComparison({
        project_id: selectedProjectId,
        location_tag: locationTag.trim(),
        before_photo_id: selectedBeforeImgId,
        after_photo_id: selectedAfterImgId
      });
      onSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Failed to pair photos');
    } finally {
      setLoading(false);
    }
  };

  // Quick Select from Suggestion
  const handleApplySuggestion = (sug: ComparisonPairSuggestion) => {
    setLocationTag(sug.location_tag);
    setSelectedBeforeImgId(sug.before_photo.id);
    setSelectedAfterImgId(sug.after_photo.id);
    setActiveTab('pair');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                New Site Comparison
              </h2>
              <p className="text-xs text-slate-400">
                Compare progress & safety evolution at a specific site location
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Two New Photos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pair')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'pair'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Pair Existing Site Photos
            {suggestions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                {suggestions.length} suggested
              </span>
            )}
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-950/70 border border-red-800/80 flex items-start gap-2.5 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: UPLOAD TWO PHOTOS */}
        {activeTab === 'upload' && (
          <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
            {/* Project & Location Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Project *
                </label>
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Location Tag / Milestone *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={locationTag}
                    onChange={(e) => setLocationTag(e.target.value)}
                    placeholder="e.g. North Wing — Level 2 Framing"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Side-by-Side Dual Photo Uploaders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BEFORE PHOTO UPLOADER */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    1. Before Photo *
                  </span>
                  {beforeFile && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  )}
                </div>

                <label className="block relative border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-lg p-3 text-center cursor-pointer transition-colors bg-slate-900/40">
                  {beforePreview ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={beforePreview}
                        alt="Before Preview"
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <span className="text-[11px] text-amber-400 underline block">
                        Change Before Image
                      </span>
                    </div>
                  ) : (
                    <div className="py-6 space-y-1">
                      <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                      <p className="text-xs font-medium text-slate-300">
                        Upload earlier inspection photo
                      </p>
                      <p className="text-[10px] text-slate-500">JPG, PNG up to 10MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBeforeFileChange}
                    className="sr-only"
                  />
                </label>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Date Taken (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={beforeDate}
                    onChange={(e) => setBeforeDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* AFTER PHOTO UPLOADER */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    2. After Photo *
                  </span>
                  {afterFile && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  )}
                </div>

                <label className="block relative border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-lg p-3 text-center cursor-pointer transition-colors bg-slate-900/40">
                  {afterPreview ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={afterPreview}
                        alt="After Preview"
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <span className="text-[11px] text-emerald-400 underline block">
                        Change After Image
                      </span>
                    </div>
                  ) : (
                    <div className="py-6 space-y-1">
                      <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                      <p className="text-xs font-medium text-slate-300">
                        Upload follow-up / recent photo
                      </p>
                      <p className="text-[10px] text-slate-500">JPG, PNG up to 10MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAfterFileChange}
                    className="sr-only"
                  />
                </label>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Date Taken (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={afterDate}
                    onChange={(e) => setAfterDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !beforeFile || !afterFile}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10"
              >
                {loading ? (
                  <>Processing AI Detections...</>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Timeline Comparison
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: PAIR EXISTING PHOTOS */}
        {activeTab === 'pair' && (
          <form onSubmit={handlePairSubmit} className="p-6 space-y-5">
            {/* Auto-suggested Pairs ribbon */}
            {suggestions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Auto-Suggested Pairs for this Project:</span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {suggestions.map((sug, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => handleApplySuggestion(sug)}
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left shrink-0 text-xs transition-all hover:border-amber-400/60"
                    >
                      <div className="font-semibold text-slate-200">{sug.location_tag}</div>
                      <div className="text-[10px] text-amber-400/90 font-mono">
                        {sug.date_difference_days} days apart
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Project & Location Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Project *
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Location Tag *
                </label>
                <input
                  type="text"
                  value={locationTag}
                  onChange={(e) => setLocationTag(e.target.value)}
                  placeholder="e.g. North Wing — Level 2 Framing"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Photo Selection Grid */}
            {loadingPairs ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading project photos...</div>
            ) : availableImages.length < 2 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <ImageIcon className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">
                  Only {availableImages.length} photo available for this project.
                </p>
                <p className="text-[11px] text-slate-400">
                  Switch to the &quot;Upload Two New Photos&quot; tab to upload before and after images.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Upload Photos Instead
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Before Image */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Select Before Photo
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-slate-950/70 border border-slate-800 rounded-lg">
                    {availableImages.map((img) => {
                      const isSelected = selectedBeforeImgId === img.id;
                      const isSame = selectedAfterImgId === img.id;
                      const url = img.url.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`;
                      return (
                        <div
                          key={img.id}
                          onClick={() => !isSame && setSelectedBeforeImgId(img.id)}
                          className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-amber-400 ring-2 ring-amber-400/30'
                              : isSame
                              ? 'border-slate-800 opacity-30 cursor-not-allowed'
                              : 'border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="Candidate" className="w-full h-20 object-cover" />
                          <div className="p-1 bg-slate-950/90 text-[10px] text-slate-300 truncate">
                            {img.location_tag || 'Site Area'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Select After Image */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Select After Photo
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 bg-slate-950/70 border border-slate-800 rounded-lg">
                    {availableImages.map((img) => {
                      const isSelected = selectedAfterImgId === img.id;
                      const isSame = selectedBeforeImgId === img.id;
                      const url = img.url.startsWith('http') ? img.url : `${API_BASE_URL}${img.url}`;
                      return (
                        <div
                          key={img.id}
                          onClick={() => !isSame && setSelectedAfterImgId(img.id)}
                          className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                              : isSame
                              ? 'border-slate-800 opacity-30 cursor-not-allowed'
                              : 'border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="Candidate" className="w-full h-20 object-cover" />
                          <div className="p-1 bg-slate-950/90 text-[10px] text-slate-300 truncate">
                            {img.location_tag || 'Site Area'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedBeforeImgId || !selectedAfterImgId || availableImages.length < 2}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10"
              >
                {loading ? 'Pairing Photos...' : 'Create Comparison'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
