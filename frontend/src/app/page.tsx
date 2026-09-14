'use client';

import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import DashboardView from '../components/DashboardView';
import CreateReportModal from '../components/CreateReportModal';
import ReportDetailModal from '../components/ReportDetailModal';
import GenAIAssistantDrawer from '../components/GenAIAssistantDrawer';
import { Report } from '../types';

export default function HomePage() {
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showAssistantDrawer, setShowAssistantDrawer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReportCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        onOpenNewReport={() => setShowNewReportModal(true)}
        onOpenAssistant={() => setShowAssistantDrawer(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <DashboardView
          key={refreshKey}
          onOpenNewReport={() => setShowNewReportModal(true)}
          onOpenAssistant={() => setShowAssistantDrawer(true)}
          onSelectReport={(rep) => setSelectedReport(rep)}
        />
      </main>

      {/* Floating Action / Assistant trigger on mobile */}
      <button
        onClick={() => setShowAssistantDrawer(true)}
        className="fixed bottom-6 right-6 z-30 sm:hidden p-3.5 rounded-full bg-amber-500 text-slate-950 font-bold shadow-2xl shadow-amber-500/30 flex items-center justify-center"
      >
        Ask AI
      </button>

      {/* Modals & Drawers */}
      {showNewReportModal && (
        <CreateReportModal
          onClose={() => setShowNewReportModal(false)}
          onSuccess={handleReportCreated}
        />
      )}

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      <GenAIAssistantDrawer
        isOpen={showAssistantDrawer}
        onClose={() => setShowAssistantDrawer(false)}
        onSelectReport={(rep) => {
          setSelectedReport(rep);
        }}
      />
    </div>
  );
}
