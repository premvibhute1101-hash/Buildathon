'use client';

import React, { useState, useRef, useEffect } from 'react';
import { queryAssistant, getSites, getReport } from '../lib/api';
import { Site, Report, AssistantSource } from '../types';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  X,
  ExternalLink,
  ShieldAlert,
  FileCheck2,
  HelpCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  referenced_report_ids?: string[];
  sources?: AssistantSource[];
  timestamp: string;
}

interface GenAIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport?: (report: Report) => void;
}

export default function GenAIAssistantDrawer({
  isOpen,
  onClose,
  onSelectReport
}: GenAIAssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your **Site Intelligence AI Assistant**. I analyze real project inspection logs, YOLOv8 PPE visual audits, and contractor incident reports to give you grounded, cited answers.\n\nChoose a quick query below or ask any question about ongoing site activities.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSites().then(setSites).catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

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
    if (!onSelectReport) return;
    try {
      const fullReport = await getReport(reportId);
      onSelectReport(fullReport);
    } catch (e) {
      console.error('Failed to load citation report:', e);
    }
  };

  // Helper to render markdown text and clickable [Report #...] badges
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
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono hover:bg-amber-500/30 hover:underline transition-all"
          >
            <span>Report #{repId.slice(0, 6)}</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Site Intelligence Copilot
              <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/80 text-[10px] font-mono">
                RAG GROUNDED
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Contextual query engine over verified reports</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scope Filter Bar */}
      <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px] font-medium">Scope Focus:</span>
        <select
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-300 text-[11px] focus:outline-none focus:border-amber-500"
        >
          <option value="">All Project Sites & Areas</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Message History */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-indigo-900 text-indigo-300 border border-indigo-700'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[85%] space-y-2`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-amber-500/20 text-slate-100 border border-amber-500/30 rounded-tr-none'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  {renderMessageContent(msg.text)}
                </div>

                {/* Grounded Sources Cards */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Referenced Verified Sources ({msg.sources.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleCitationClick(src.report_id)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors"
                        >
                          <FileCheck2 className="w-3 h-3 text-amber-400" />
                          <span>{src.site_name}</span>
                          <span className="text-slate-500 font-mono text-[9px]">
                            #{src.report_id.slice(0, 4)}
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
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-indigo-300">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Analyzing records & computing citations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Query Chips */}
      <div className="p-3 bg-slate-900/80 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <HelpCircle className="w-3 h-3 text-amber-400" />
          <span>Recommended Prompt Suggestions:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {presetQueries.map((query, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(query)}
              disabled={isLoading}
              className="text-left px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-[11px] text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-all truncate"
            >
              &ldquo;{query}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything about site safety, issues, or progress..."
            className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuery.trim()}
            className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
