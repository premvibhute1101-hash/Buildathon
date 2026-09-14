'use client';

import React, { useState, useEffect } from 'react';
import { Site, ReportType } from '../types';
import { getSites, createReport, detectPPE } from '../lib/api';
import { X, UploadCloud, AlertCircle, Loader2, HardHat, Camera, CheckCircle2 } from 'lucide-react';

interface CreateReportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateReportModal({ onClose, onSuccess }: CreateReportModalProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>('inspection');
  const [text, setText] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time detection state
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [preDetectionResult, setPreDetectionResult] = useState<any | null>(null);

  useEffect(() => {
    getSites()
      .then((data) => {
        setSites(data);
        if (data.length > 0) {
          setSelectedSiteId(data[0].id);
        }
      })
      .catch((err) => {
        setError('Failed to load sites.');
      });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      
      const urls = filesArray.map(f => URL.createObjectURL(f));
      setPreviewUrls(urls);

      // Run live detection on the first image for immediate preview feedback!
      if (filesArray[0]) {
        setAnalyzingImage(true);
        try {
          const det = await detectPPE(filesArray[0]);
          setPreDetectionResult(det);
        } catch (err) {
          console.error("Live detection preview error:", err);
        } finally {
          setAnalyzingImage(false);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) {
      setError('Please select a site area.');
      return;
    }
    if (!text.trim()) {
      setError('Please enter report observations.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createReport(selectedSiteId, reportType, text, selectedFiles);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Submit Site Report</h3>
              <p className="text-xs text-slate-400">Log observations and run automatic YOLOv8 PPE detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/80 text-red-300 border border-red-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Site Selection & Report Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Site / Construction Zone *
              </label>
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                required
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Report Classification *
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="inspection">Safety & Compliance Inspection</option>
                <option value="progress">Daily Work Progress Log</option>
                <option value="incident">Safety Incident / Hazard</option>
              </select>
            </div>
          </div>

          {/* Observations Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Field Observations / Details *
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe work completed, safety conditions observed, contractors present, or hazards noted..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
              required
            />
          </div>

          {/* Photo Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Attach Site Photographs (with auto-PPE analysis)
            </label>
            <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-6 text-center bg-slate-950/40 transition-colors cursor-pointer group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 flex items-center justify-center transition-colors">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    Click to browse or drag & drop site photos
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    JPG, PNG, WebP supported • Real-time YOLOv8 PPE detection applied on upload
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Image Pre-Detection Results */}
          {analyzingImage && (
            <div className="flex items-center gap-2 p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-amber-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing photo with YOLOv8 PPE model...</span>
            </div>
          )}

          {preDetectionResult && !analyzingImage && (
            <div className="p-3 bg-slate-950/90 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Live AI Pre-Analysis:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  preDetectionResult.ai_label === 'issue_detected'
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {preDetectionResult.ai_label === 'issue_detected' ? 'Safety Issue Flagged' : 'Compliant'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {preDetectionResult.detections?.map((d: any, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-850 border border-slate-700 text-slate-300 font-mono">
                    {d.class_name}: {(d.confidence * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving & Processing...
                </>
              ) : (
                'Publish Site Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
