"use client";

import React from 'react';
import { Report, User } from '@/app/types/fir';
import {
  WorkflowStepper,
  ReportHeader,
  ReportMeta,
  DescriptionSection,
  WorkflowActivity,
  ReportActions,
  MessageTimeline,
} from './detail';

interface ReportDetailProps {
  report: Report;
  onUpdate: (updatedReport: Report) => void;
  currentUser: User;
}

/**
 * ReportDetail - Refactored with CRM-like messaging
 * 
 * Sub-components extracted to /detail folder:
 * - ReportHeader.tsx: PriorityBadge, CategoryBadge, WorkflowStepper, ReportHeader, ReportMeta
 * - ReportContent.tsx: DescriptionSection, AttachmentGrid, WorkflowActivity
 * - ReportActions.tsx: Action footer with toast notifications
 * - MessageTimeline.tsx: Real-time conversation thread
 */
export const ReportDetail: React.FC<ReportDetailProps> = ({ report, onUpdate, currentUser }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 md:rounded-l-none md:rounded-r-2xl overflow-hidden shadow-xl md:shadow-none">
      {/* Header Section */}
      <div className="p-6 border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-20">
        <ReportHeader report={report} />
        <WorkflowStepper report={report} currentUser={currentUser} />
        <ReportMeta report={report} />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-gray-900">
        {/* Description & Attachments */}
        <DescriptionSection report={report} />

        {/* Workflow Activity (responses, decisions) */}
        <WorkflowActivity report={report} />

        {/* CRM-like Message Timeline */}
        <MessageTimeline reportId={report.id} currentUser={currentUser} />
      </div>

      {/* Footer Action Area */}
      <ReportActions
        report={report}
        currentUser={currentUser}
        onUpdate={onUpdate}
      />
    </div>
  );
};