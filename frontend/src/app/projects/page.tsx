'use client';

import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import ProjectsView from '../../components/ProjectsView';
import CreateReportModal from '../../components/CreateReportModal';
import ReportDetailModal from '../../components/ReportDetailModal';
import GenAIAssistantDrawer from '../../components/GenAIAssistantDrawer';
import { Report } from '../../types';

export default function ProjectsPage() {
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showAssistantDrawer, setShowAssistantDrawer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar
        onOpenNewReport={() => setShowNewReportModal(true)}
        onOpenAssistant={() => setShowAssistantDrawer(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <ProjectsView
          onOpenNewReport={() => setShowNewReportModal(true)}
          onSelectReport={(rep) => setSelectedReport(rep)}
        />
      </main>

      {showNewReportModal && (
        <CreateReportModal
          onClose={() => setShowNewReportModal(false)}
          onSuccess={() => {}}
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
        onSelectReport={(rep) => setSelectedReport(rep)}
      />
    </div>
  );
}
