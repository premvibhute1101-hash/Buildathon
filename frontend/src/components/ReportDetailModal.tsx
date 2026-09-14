'use client';

import React from 'react';
import { Report } from '../types';
import { X, Calendar, MapPin, User, FileText, AlertTriangle, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import BoundingBoxOverlay from './BoundingBoxOverlay';

interface ReportDetailModalProps {
  report: Report | null;
  onClose: () => void;
}

export default function ReportDetailModal({ report, onClose }: ReportDetailModalProps) {
  if (!report) return null;

  const hasIssues = report.images.some(img => img.ai_label === 'issue_detected');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasIssues ? 'bg-red-950 text-red-400 border border-red-800/60' : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'}`}>
              {hasIssues ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  Site Report <span className="font-mono text-xs text-slate-400">#{report.id.slice(0, 8)}</span>
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  report.type === 'incident' ? 'bg-red-950 text-red-400 border border-red-800' :
                  report.type === 'inspection' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  'bg-blue-950 text-blue-400 border border-blue-800'
                }`}>
                  {report.type}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged on {new Date(report.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Zone / Area</span>
                <span className="font-semibold">{report.site_name || 'Site Zone'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Reported By</span>
                <span className="font-semibold">{report.user_name || 'Site Personnel'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Created At</span>
                <span className="font-semibold">{new Date(report.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Report Narrative Text */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              Observation Notes
            </h4>
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {report.text}
            </div>
          </div>

          {/* Attached Images & YOLOv8 Detections */}
          {report.images && report.images.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Attached Photos & AI PPE Analysis ({report.images.length})
              </h4>

              <div className="space-y-4">
                {report.images.map((img) => (
                  <BoundingBoxOverlay
                    key={img.id}
                    imageUrl={img.url}
                    detections={img.detections || []}
                    aiLabel={img.ai_label}
                    aiConfidence={img.ai_confidence}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
