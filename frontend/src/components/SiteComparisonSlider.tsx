'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SiteComparison, Detection } from '../types';
import { API_BASE_URL } from '../lib/api';
import {
  Calendar,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Maximize2,
  Minimize2,
  Info,
  Tag
} from 'lucide-react';

interface SiteComparisonSliderProps {
  comparison: SiteComparison;
  onRefreshSummary?: () => void;
  className?: string;
  initialSliderPosition?: number; // 0 to 100
}

export default function SiteComparisonSlider({
  comparison,
  className = '',
  initialSliderPosition = 50
}: SiteComparisonSliderProps) {
  const [sliderPos, setSliderPos] = useState<number>(initialSliderPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredDet, setHoveredDet] = useState<Detection | null>(null);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number }>({ width: 640, height: 640 });

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const beforeUrl = comparison.before_photo.url.startsWith('http')
    ? comparison.before_photo.url
    : `${API_BASE_URL}${comparison.before_photo.url}`;

  const afterUrl = comparison.after_photo.url.startsWith('http')
    ? comparison.after_photo.url
    : `${API_BASE_URL}${comparison.after_photo.url}`;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImgNaturalSize({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    }
  };

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches.length > 0) {
      updatePosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        updatePosition(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, updatePosition]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPos((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPos((prev) => Math.min(100, prev + 5));
    }
  };

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getClassStyles = (className: string) => {
    switch (className) {
      case 'no_hardhat':
        return { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.25)', label: 'NO HARDHAT', badge: 'bg-red-950/80 text-red-400 border-red-800' };
      case 'no_vest':
        return { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.25)', label: 'NO VEST', badge: 'bg-orange-950/80 text-orange-400 border-orange-800' };
      case 'hardhat':
        return { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)', label: 'Hardhat', badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-800' };
      case 'vest':
        return { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)', label: 'Vest', badge: 'bg-blue-950/80 text-blue-400 border-blue-800' };
      default:
        return { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.2)', label: className, badge: 'bg-yellow-950/80 text-yellow-400 border-yellow-800' };
    }
  };

  const renderDetectionsSvg = (detections: Detection[] = []) => {
    if (!showOverlays || detections.length === 0) return null;
    return (
      <svg
        viewBox={`0 0 ${imgNaturalSize.width} ${imgNaturalSize.height}`}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        preserveAspectRatio="none"
      >
        {detections.map((det, idx) => {
          const st = getClassStyles(det.class_name);
          const isHov = hoveredDet === det;
          return (
            <g
              key={det.id || idx}
              onMouseEnter={() => setHoveredDet(det)}
              onMouseLeave={() => setHoveredDet(null)}
              className="cursor-pointer transition-all"
            >
              <rect
                x={det.bbox_x}
                y={det.bbox_y}
                width={det.bbox_w}
                height={det.bbox_h}
                fill={isHov ? st.fill.replace('0.25', '0.45') : st.fill}
                stroke={st.stroke}
                strokeWidth={isHov ? 3.5 : 2}
                rx={3}
              />
              <rect
                x={det.bbox_x}
                y={Math.max(0, det.bbox_y - 20)}
                width={Math.max(90, det.bbox_w * 0.8)}
                height={18}
                fill={st.stroke}
                rx={2}
              />
              <text
                x={det.bbox_x + 4}
                y={Math.max(13, det.bbox_y - 6)}
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {st.label} {(det.confidence * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const safetyDiff = comparison.safety_diff;
  const beforeDets = comparison.before_photo.detections || [];
  const afterDets = comparison.after_photo.detections || [];

  return (
    <div
      ref={wrapperRef}
      className={`bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md flex flex-col ${className}`}
    >
      {/* Top Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
            <Tag className="w-3.5 h-3.5" />
            <span data-testid="location-tag">{comparison.location_tag}</span>
          </span>
          {comparison.project_name && (
            <span className="text-slate-400 text-xs font-medium">
              in <span className="text-slate-200">{comparison.project_name}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* YOLO Overlay Toggle */}
          {(beforeDets.length > 0 || afterDets.length > 0) && (
            <button
              type="button"
              onClick={() => setShowOverlays(!showOverlays)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                showOverlays
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              {showOverlays ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>YOLO AI Overlays</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle fullscreen"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Comparison Slider */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 overflow-hidden select-none cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      >
        {/* AFTER IMAGE (Bottom Layer) */}
        <div className="absolute inset-0 w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={afterUrl}
            alt="Site inspection - After photo"
            onLoad={handleImageLoad}
            className="w-full h-full object-contain pointer-events-none"
            data-testid="after-image"
          />
          {renderDetectionsSvg(afterDets)}
        </div>

        {/* BEFORE IMAGE (Top Layer with dynamic CSS clip-path) */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeUrl}
            alt="Site inspection - Before photo"
            className="w-full h-full object-contain pointer-events-none"
            data-testid="before-image"
          />
          {renderDetectionsSvg(beforeDets)}
        </div>

        {/* FLOATING DATE LABEL PILLS */}
        {/* BEFORE PILL (Left) */}
        <div
          className="absolute top-3 left-3 z-20 pointer-events-none transition-opacity duration-200"
          style={{ opacity: sliderPos < 15 ? 0.2 : 1 }}
        >
          <div
            data-testid="before-pill"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 border border-slate-700/80 backdrop-blur-md text-[11px] font-semibold text-slate-200 shadow-xl"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 font-bold uppercase tracking-wider">BEFORE</span>
            <span className="text-slate-400">—</span>
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{formatDate(comparison.before_date)}</span>
          </div>
        </div>

        {/* AFTER PILL (Right) */}
        <div
          className="absolute top-3 right-3 z-20 pointer-events-none transition-opacity duration-200"
          style={{ opacity: sliderPos > 85 ? 0.2 : 1 }}
        >
          <div
            data-testid="after-pill"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 border border-slate-700/80 backdrop-blur-md text-[11px] font-semibold text-slate-200 shadow-xl"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold uppercase tracking-wider">AFTER</span>
            <span className="text-slate-400">—</span>
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{formatDate(comparison.after_date)}</span>
          </div>
        </div>

        {/* VERTICAL DIVIDER LINE & DRAGGABLE HANDLE */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Vertical Glowing Line */}
          <div className="absolute top-0 bottom-0 -left-[1.5px] w-[3px] bg-gradient-to-b from-amber-400 via-amber-300 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />

          {/* Central Grip Knob */}
          <div className="absolute top-1/2 -left-5 -translate-y-1/2 w-10 h-10 rounded-full bg-amber-500 border-2 border-slate-950 text-slate-950 shadow-2xl flex items-center justify-center pointer-events-auto cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
            <div className="flex items-center gap-0.5">
              <div className="w-0.5 h-4 bg-slate-950 rounded-full" />
              <div className="w-0.5 h-4 bg-slate-950 rounded-full" />
            </div>
          </div>

          {/* Drag percentage indicator */}
          <div className="absolute bottom-3 -left-7 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-amber-400 shadow">
            {Math.round(sliderPos)}%
          </div>
        </div>
      </div>

      {/* QUICK DRAG SLIDER HELPER BAR */}
      <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1 hidden sm:inline">
          <Layers className="w-3 h-3 text-amber-400" />
          Drag slider or use Left / Right arrow keys
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSliderPos(0)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
              sliderPos === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            100% After
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="w-full sm:w-40 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <button
            type="button"
            onClick={() => setSliderPos(100)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
              sliderPos === 100 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            100% Before
          </button>
        </div>
      </div>

      {/* AI DIFFERENCES & INSIGHTS CARD */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-900 to-slate-950 border-t border-slate-800 space-y-4">
        {/* GenAI Natural Language Change Summary */}
        {comparison.ai_summary && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent border border-amber-500/30 flex items-start gap-3 shadow-inner">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-400">
                  AI Timeline Intelligence Synthesis
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed" data-testid="ai-summary-text">
                {comparison.ai_summary}
              </p>
            </div>
          </div>
        )}

        {/* Safety & Detection Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Safety Status Change */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-400">Safety Trend</span>
              {safetyDiff?.status_change === 'improved' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase">
                  <TrendingUp className="w-3 h-3" /> Improved
                </span>
              )}
              {safetyDiff?.status_change === 'degraded' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold uppercase">
                  <TrendingDown className="w-3 h-3" /> Flagged
                </span>
              )}
              {safetyDiff?.status_change === 'stable' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-bold uppercase">
                  <Activity className="w-3 h-3" /> Stable
                </span>
              )}
            </div>
            <div className="text-base font-bold text-slate-100 flex items-baseline gap-2">
              <span>{safetyDiff?.after_violations_count || 0} active flags</span>
              <span className="text-xs font-normal text-slate-400">
                (was {safetyDiff?.before_violations_count || 0})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {safetyDiff?.status_change === 'improved'
                ? 'PPE compliance improved across time interval.'
                : safetyDiff?.status_change === 'degraded'
                ? `${safetyDiff?.diff_count} new hazard(s) flagged on site.`
                : 'Safety status remained consistent.'}
            </p>
          </div>

          {/* Card 2: Before Photo Safety State */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-400">Before Inspection</span>
              <span className="text-[10px] font-mono text-amber-400 font-semibold">
                {formatDate(comparison.before_date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {beforeDets.some((d) => d.class_name === 'no_hardhat' || d.class_name === 'no_vest') ? (
                <span className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" /> Issues Flagged
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> PPE Compliant
                </span>
              )}
              <span className="text-xs text-slate-500 font-mono">({beforeDets.length} objects)</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {beforeDets.slice(0, 3).map((d, i) => {
                const st = getClassStyles(d.class_name);
                return (
                  <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${st.badge}`}>
                    {st.label}
                  </span>
                );
              })}
              {beforeDets.length > 3 && (
                <span className="text-[9px] text-slate-400 font-mono">+{beforeDets.length - 3} more</span>
              )}
            </div>
          </div>

          {/* Card 3: After Photo Safety State */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-400">After Inspection</span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                {formatDate(comparison.after_date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {afterDets.some((d) => d.class_name === 'no_hardhat' || d.class_name === 'no_vest') ? (
                <span className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" /> Issues Flagged
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> PPE Compliant
                </span>
              )}
              <span className="text-xs text-slate-500 font-mono">({afterDets.length} objects)</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {afterDets.slice(0, 3).map((d, i) => {
                const st = getClassStyles(d.class_name);
                return (
                  <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${st.badge}`}>
                    {st.label}
                  </span>
                );
              })}
              {afterDets.length > 3 && (
                <span className="text-[9px] text-slate-400 font-mono">+{afterDets.length - 3} more</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
