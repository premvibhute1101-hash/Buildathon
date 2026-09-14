export type Role = 'admin' | 'site_user';
export type ProjectStatus = 'active' | 'completed' | 'on_hold';
export type ReportType = 'progress' | 'inspection' | 'incident';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  sites_count?: number;
}

export interface Site {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
  reports_count?: number;
}

export interface Detection {
  id: string;
  class_name: 'hardhat' | 'no_hardhat' | 'vest' | 'no_vest' | string;
  confidence: number;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
}

export interface ImageRecord {
  id: string;
  url: string;
  ai_label?: 'issue_detected' | 'compliant' | string;
  ai_confidence?: number;
  created_at: string;
  detections?: Detection[];
}

export interface Report {
  id: string;
  site_id: string;
  site_name?: string;
  user_id: string;
  user_name?: string;
  type: ReportType;
  text: string;
  created_at: string;
  images: ImageRecord[];
}

export interface DashboardSummary {
  total_reports: number;
  total_issues: number;
  issues_this_week: number;
  compliance_rate: number;
  recent_activity: {
    report_id: string;
    site_name?: string;
    type: string;
    text: string;
    created_at: string;
  }[];
  issues_by_site: {
    site_name: string;
    issue_count: number;
  }[];
  violations_by_class: {
    class_name: string;
    count: number;
  }[];
}

export interface RecurringIssue {
  site_id: string;
  site_name: string;
  class_name: string;
  count: number;
  latest_occurrence: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface AssistantSource {
  report_id: string;
  site_name: string;
  type: string;
  text: string;
  created_at: string;
  has_violations: boolean;
}

export interface AssistantResponse {
  answer: string;
  referenced_report_ids: string[];
  sources?: AssistantSource[];
}
