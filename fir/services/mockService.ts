import { Report, ReportStatus, Priority, Category, User, Comment, Attachment } from '../types';
import { supabase } from './supabase';

// Mock Users (Keep for fallbacks/owners)
export const USERS: Record<string, User> = {
  reporter1: { id: 'u1', name: 'Alex Worker', role: 'Reporter', avatar: 'https://ui-avatars.com/api/?name=Alex+Worker' },
  manager1: { id: 'u2', name: 'Sarah Lead', role: 'Line Manager', avatar: 'https://ui-avatars.com/api/?name=Sarah+Lead' },
  senior1: { id: 'u3', name: 'Mike Director', role: 'Manager', avatar: 'https://ui-avatars.com/api/?name=Mike+Director' },
  admin1: { id: 'u4', name: 'System Admin', role: 'Super Admin', avatar: 'https://ui-avatars.com/api/?name=System+Admin' },
};

class ReportService {

  async getReports(): Promise<Report[]> {
    try {
      // Fetch from Supabase fir_activity
      const { data: firData, error } = await supabase
        .from('fir_activity')
        .select(`
          *,
          employee_master (
            id,
            employee_name,
            employee_code
          )
        `)
        .order('created_at', { ascending: false });

      // Fetch profiles to map employee details to Auth Users (UUID)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, employee_code, full_name, role');

      // Create a map of employee_code -> Profile Link
      const profileMap = new Map<string, any>();
      if (profiles) {
        profiles.forEach(p => {
          if (p.employee_code) profileMap.set(p.employee_code, p);
        });
      }

      if (error) {
        console.error('Error fetching reports:', error);
        return [];
      }

      if (!firData || firData.length === 0) {
        return [];
      }

      // Map Supabase data to Report interface
      const reports: Report[] = firData.map((row: any) => {
        const employeeMaster = row.employee_master;
        const employeeCode = employeeMaster?.employee_code;
        const linkedProfile = employeeCode ? profileMap.get(employeeCode) : null;

        const reporterName = employeeMaster?.employee_name || 'Unknown Employee';

        // Determine status and level based on stages
        let status = ReportStatus.Reported;
        let level = 1;

        // Map database status to 4-stage workflow
        if (row.status === 'CLOSED') {
          status = ReportStatus.Closed;
          level = 4;
        } else if (row.status === 'SUPER_ADMIN_REVIEW') {
          status = ReportStatus.SuperAdminReview;
          level = 3;
        } else if (row.status === 'PERSON_RESPONSE') {
          status = ReportStatus.PersonResponse;
          level = 2;
        } else {
          status = ReportStatus.Reported;
          level = 1;
        }

        // Map attachments (ensure it's an array)
        let attachments: Attachment[] = [];
        if (Array.isArray(row.attachments)) {
          attachments = row.attachments;
        }

        const assignedToUser: User = {
          id: linkedProfile?.id || row.employee_id?.toString() || 'unknown', // Use Profile UUID if linked
          name: linkedProfile?.full_name || reporterName, // Use Profile Name if linked
          role: linkedProfile?.role || 'Reporter',
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(linkedProfile?.full_name || reporterName)}&background=random`
        };

        // Determine Current Owner
        let currentOwner = USERS.manager1; // Default fallback
        if (status === ReportStatus.Reported) {
          currentOwner = assignedToUser;
        } else if (status === ReportStatus.PersonResponse) {
          currentOwner = assignedToUser;
        } else if (status === ReportStatus.SuperAdminReview) {
          currentOwner = USERS.admin1;
        }

        return {
          id: row.id,
          title: row.title || (row.fir_type === 'GOOD' ? 'Positive Activity' : 'Incident Report'),
          description: row.description || '',
          reporter: {
            id: row.submitted_person_id || row.user_id || row.created_by_id || 'creator_id',
            name: row.created_by || 'Unknown Creator',
            role: 'Reporter',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(row.created_by || 'U')}&background=random`
          },
          assignedTo: assignedToUser,
          currentOwner: currentOwner,
          status: status,
          priority: (row.priority as Priority) || Priority.Medium,
          category: (row.category as Category) || Category.Other,
          fir_type: row.fir_type || 'BAD',
          level: level,
          reportedAt: row.created_at,
          attachments: attachments,
          timeline: [],

          response_comment: row.response_comment,
          response_attachments: row.stage_2_attachments || [],
          final_decision: row.final_decision,
          closed_at: row.closed_at,
          closed_by: row.stage_3_by // Reuse column
        };
      });

      return reports;

    } catch (err) {
      console.error('Unexpected error in getReports:', err);
      // Fallback to empty array on error to avoid showing confusing mock data
      return [];
    }
  }

  async getReportById(id: string): Promise<Report | undefined> {
    const reports = await this.getReports();
    return reports.find(r => r.id === id);
  }

  async createReport(reportData: Partial<Report>): Promise<Report> {
    return {
      id: 'temp',
      title: '',
      description: '',
      reporter: USERS.reporter1,
      assignedTo: USERS.manager1,
      currentOwner: USERS.manager1,
      status: ReportStatus.Reported,
      priority: Priority.Low,
      category: Category.Other,
      fir_type: 'BAD',
      level: 1,
      reportedAt: new Date().toISOString(),
      attachments: [],
      timeline: []
    };
  }

  // Stage 1 -> 2: Send to Person (Happens automatically on creation usually, or manual trigger)
  async sendToPerson(id: string): Promise<void> {
    const { error } = await supabase
      .from('fir_activity')
      .update({
        status: 'PERSON_RESPONSE'
      })
      .eq('id', id);
    if (error) throw error;
  }

  // Stage 2: Person Response
  async submitResponse(id: string, accepted: boolean, comment: string, attachments: Attachment[] = []): Promise<void> {
    const { error } = await supabase
      .from('fir_activity')
      .update({
        status: 'SUPER_ADMIN_REVIEW',
        stage_2_status: accepted ? 'ACCEPTED' : 'REFUSED', // Reuse column for audit
        response_comment: comment,
        stage_2_notes: comment, // Reuse for audit
        stage_2_attachments: attachments
      })
      .eq('id', id);
    if (error) throw error;
  }

  // Stage 3: Super Admin Review
  async adminReview(id: string, decision: 'CONFIRM' | 'SEND_BACK', notes: string, user: User): Promise<void> {
    let updateData: any = {};

    if (decision === 'CONFIRM') {
      updateData = {
        status: 'CLOSED',
        final_decision: 'CONFIRMED',
        closed_at: new Date().toISOString(),
        stage_3_by: user.name,
        stage_3_notes: notes
      };
    } else {
      updateData = {
        status: 'PERSON_RESPONSE', // Send back
        final_decision: 'SENT_BACK', // Audit
        stage_3_by: user.name,
        stage_3_notes: notes
      };
    }

    const { error } = await supabase
      .from('fir_activity')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  async addComment(reportId: string, text: string, action?: Comment['action'], nextOwner?: User): Promise<Report> {
    const report = await this.getReportById(reportId);
    if (!report) throw new Error('Report not found');
    return report;
  }
}

export const reportService = new ReportService();