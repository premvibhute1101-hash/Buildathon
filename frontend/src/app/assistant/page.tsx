'use client';

import React, { useState, useRef, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import ReportDetailModal from '../../components/ReportDetailModal';
import CreateReportModal from '../../components/CreateReportModal';
import { queryAssistant, getSites, getReport } from '../../lib/api';
import { Site, Report, AssistantSource } from '../../types';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  HelpCircle,
  HardHat,
  Database
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  referenced_report_ids?: string[];
  sources?: AssistantSource[];
  timestamp: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: '### 🏗️ Welcome to the AI Construction Site Intelligence Copilot\n\nI am grounded in your **active project database**, querying real-time inspection records, YOLOv8 PPE detection results, and contractor logs.\n\nAsk me any operational question or select one of the core queries below.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSites().then(setSites).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const presetQueries = [
    'Summarize the problems reported this week',
    'What safety issues were found in Area B?',
    'Which issues have occurred repeatedly?',
    'Generate a weekly site progress report'
  ];

  const handleSend = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await queryAssistant(queryText, selectedSiteId || undefined);
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        referenced_report_ids: res.referenced_report_ids,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Query Error**: ${err.message || 'Could not retrieve project intelligence.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitationClick = async (reportId: string) => {
    try {
      const fullReport = await getReport(reportId);
      setSelectedReport(fullReport);
    } catch (e) {
      console.error('Failed to load citation report:', e);
    }
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\[Report\s*#[a-f0-9-]+\])/gi);
    return parts.map((part, index) => {
      const match = part.match(/\[Report\s*#([a-f0-9-]+)\]/i);
      if (match) {
        const repId = match[1];
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleCitationClick(repId)}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono hover:bg-amber-500/30 hover:underline transition-all"
          >
            <span>Report #{repId.slice(0, 6)}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar onOpenNewReport={() => setShowNewReportModal(true)} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4">
        {/* Header card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                GenAI Construction Intelligence Assistant
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
                  RAG CONNECTED
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Grounded strictly in project inspections, YOLO detections, and contractor logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Scope:</span>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Project Sites & Areas</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Stream Window */}
        <div className="flex-1 min-h-[460px] p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-5 pr-2">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${
                      isUser
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-indigo-900 text-indigo-300 border border-indigo-700'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="max-w-[85%] space-y-2">
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-amber-500/20 text-slate-100 border border-amber-500/30 rounded-tr-none'
                          : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none whitespace-pre-wrap'
                      }`}
                    >
                      {renderMessageContent(msg.text)}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-amber-400" />
                          Grounded Citations & Source Records ({msg.sources.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((src, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleCitationClick(src.report_id)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors"
                            >
                              <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>{src.site_name}</span>
                              <span className="text-slate-500 font-mono text-[10px]">
                                #{src.report_id.slice(0, 6)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] text-slate-500 block px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3.5">
                <div className="w-8 h-8 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs sm:text-sm text-indigo-300">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Synthesizing intelligence & validating citations against database records...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestion Chips */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              Required Evaluation Queries:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presetQueries.map((query, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(query)}
                  disabled={isLoading}
                  className="text-left px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-all truncate"
                >
                  &ldquo;{query}&rdquo;
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(inputQuery);
              }}
              className="flex items-center gap-2 pt-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about recurring issues, safety audits, progress summaries..."
                className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputQuery.trim()}
                className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {showNewReportModal && (
        <CreateReportModal
          onClose={() => setShowNewReportModal(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
}
