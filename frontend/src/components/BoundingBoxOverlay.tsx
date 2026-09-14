'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Detection } from '../types';
import { ShieldAlert, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';

interface BoundingBoxOverlayProps {
  imageUrl: string;
  detections?: Detection[];
  aiLabel?: string;
  aiConfidence?: number;
  className?: string;
}

export default function BoundingBoxOverlay({
  imageUrl,
  detections = [],
  aiLabel,
  aiConfidence,
  className = ''
}: BoundingBoxOverlayProps) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [hoveredDet, setHoveredDet] = useState<Detection | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 640, height: 640 });
  const imgRef = useRef<HTMLImageElement>(null);

  const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`;

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({
      width: img.naturalWidth || 640,
      height: img.naturalHeight || 640
    });
  };

  const getClassStyles = (className: string) => {
    switch (className) {
      case 'no_hardhat':
        return {
          stroke: '#ef4444',
          fill: 'rgba(239, 68, 68, 0.25)',
          bg: 'bg-red-600',
          text: 'text-red-100',
          label: 'NO HARDHAT VIOLATION',
          badgeClass: 'border-red-500 text-red-400 bg-red-950/60'
        };
      case 'no_vest':
        return {
          stroke: '#f97316',
          fill: 'rgba(249, 115, 22, 0.25)',
          bg: 'bg-orange-600',
          text: 'text-orange-100',
          label: 'NO VEST VIOLATION',
          badgeClass: 'border-orange-500 text-orange-400 bg-orange-950/60'
        };
      case 'hardhat':
        return {
          stroke: '#10b981',
          fill: 'rgba(16, 185, 129, 0.15)',
          bg: 'bg-emerald-600',
          text: 'text-emerald-100',
          label: 'Hardhat Compliant',
          badgeClass: 'border-emerald-500 text-emerald-400 bg-emerald-950/60'
        };
      case 'vest':
        return {
          stroke: '#3b82f6',
          fill: 'rgba(59, 130, 246, 0.15)',
          bg: 'bg-blue-600',
          text: 'text-blue-100',
          label: 'Safety Vest Compliant',
          badgeClass: 'border-blue-500 text-blue-400 bg-blue-950/60'
        };
      default:
        return {
          stroke: '#eab308',
          fill: 'rgba(234, 179, 8, 0.2)',
          bg: 'bg-yellow-600',
          text: 'text-yellow-100',
          label: className,
          badgeClass: 'border-yellow-500 text-yellow-400 bg-yellow-950/60'
        };
    }
  };

  const hasViolations = aiLabel === 'issue_detected' || detections.some(d => d.class_name === 'no_hardhat' || d.class_name === 'no_vest');

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950/90 shadow-2xl flex flex-col ${className}`}>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          {hasViolations ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/60 font-semibold uppercase tracking-wider text-[10px]">
              <ShieldAlert className="w-3.5 h-3.5" />
              Safety Issue Flagged
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold uppercase tracking-wider text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              PPE Compliant
            </span>
          )}
          {aiConfidence !== undefined && (
            <span className="text-slate-400 text-[11px] font-mono">
              AI Conf: {(aiConfidence * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {detections.length > 0 && (
          <button
            type="button"
            onClick={() => setShowBoxes(!showBoxes)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-[11px]"
          >
            {showBoxes ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3 text-slate-400" />}
            {showBoxes ? 'Hide Overlays' : 'Show Overlays'} ({detections.length})
          </button>
        )}
      </div>

      {/* Image & SVG Overlay Container */}
      <div className="relative w-full overflow-hidden bg-black flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={fullUrl}
          alt="Site inspection photo"
          onLoad={handleImageLoaded}
          className="w-full h-auto block object-contain max-h-[460px]"
        />

        {showBoxes && detections.length > 0 && (
          <svg
            viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
            className="absolute inset-0 w-full h-full pointer-events-auto"
            preserveAspectRatio="none"
          >
            {detections.map((det, idx) => {
              const styles = getClassStyles(det.class_name);
              const isHovered = hoveredDet === det;

              return (
                <g
                  key={det.id || idx}
                  onMouseEnter={() => setHoveredDet(det)}
                  onMouseLeave={() => setHoveredDet(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  <rect
                    x={det.bbox_x}
                    y={det.bbox_y}
                    width={det.bbox_w}
                    height={det.bbox_h}
                    fill={isHovered ? styles.fill.replace('0.25', '0.45').replace('0.15', '0.35') : styles.fill}
                    stroke={styles.stroke}
                    strokeWidth={isHovered ? 4 : 2.5}
                    rx={4}
                  />
                  {/* Tag label above box */}
                  <rect
                    x={det.bbox_x}
                    y={Math.max(0, det.bbox_y - 24)}
                    width={Math.max(120, det.bbox_w * 0.9)}
                    height={22}
                    fill={styles.stroke}
                    rx={3}
                  />
                  <text
                    x={det.bbox_x + 6}
                    y={Math.max(15, det.bbox_y - 8)}
                    fill="#ffffff"
                    fontSize="13"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {styles.label.toUpperCase()} ({Math.round(det.confidence * 100)}%)
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Detection summary pills below image */}
      {detections.length > 0 && (
        <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-slate-400 mr-1 font-medium">Detected:</span>
          {detections.map((d, i) => {
            const st = getClassStyles(d.class_name);
            return (
              <span
                key={i}
                onMouseEnter={() => setHoveredDet(d)}
                onMouseLeave={() => setHoveredDet(null)}
                className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-transform cursor-pointer ${
                  st.badgeClass
                } ${hoveredDet === d ? 'scale-105 ring-1 ring-amber-400' : ''}`}
              >
                {st.label} {(d.confidence * 100).toFixed(0)}%
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
