
import { Report, ReportStatus, Priority, Category, User, Comment, Attachment, Message } from '@/app/types/fir';
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client';

const supabase = getSupabaseBrowserClient();

// Dynamic user lookup helper
async function getAdminUser(): Promise<User> {
  // Fetch first Super Admin from profiles
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'Super Admin')
    .limit(1)
    .single();

  if (adminProfile) {
    return {
      id: adminProfile.id,
      name: adminProfile.full_name || 'Admin',
      role: 'Super Admin',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(adminProfile.full_name || 'Admin')}&background=random`
    };
  }

  // Fallback if no admin found
  return {
    id: 'admin-fallback',
    name: 'System Admin',
    role: 'Super Admin',
    avatar: 'https://ui-avatars.com/api/?name=System+Admin'
  };
}

// Default user factory (avoid hardcoded mock data)
function createDefaultUser(name: string, role: string = 'Reporter'): User {
  return {
    id: 'unknown',
    name,
    role,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
  };
}

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
      // Note: profiles table might need to be joined better if possible, but this matches original logic
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

      // Map Supabase data to Report interface (using Promise.all for async operations)
      const reports: Report[] = await Promise.all(firData.map(async (row: any) => {
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

        // Determine Current Owner dynamically
        let currentOwner: User = assignedToUser;
        if (status === ReportStatus.SuperAdminReview) {
          currentOwner = await getAdminUser();
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
      }));

      return reports;

    } catch (err) {
      console.error('Unexpected error in getReports:', err);
      return [];
    }
  }

  async getReportById(id: string): Promise<Report | undefined> {
    try {
      // Direct query instead of fetching all reports
      const { data: row, error } = await supabase
        .from('fir_activity')
        .select(`
          *,
          employee_master (
            id,
            employee_name,
            employee_code
          )
        `)
        .eq('id', id)
        .single();

      if (error || !row) {
        console.error('Error fetching report by ID:', error);
        return undefined;
      }

      // Fetch profile for employee lookup
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, employee_code, full_name, role');

      const profileMap = new Map<string, any>();
      if (profiles) {
        profiles.forEach(p => {
          if (p.employee_code) profileMap.set(p.employee_code, p);
        });
      }

      const employeeMaster = row.employee_master;
      const employeeCode = employeeMaster?.employee_code;
      const linkedProfile = employeeCode ? profileMap.get(employeeCode) : null;
      const reporterName = employeeMaster?.employee_name || 'Unknown Employee';

      // Map status
      let status = ReportStatus.Reported;
      let level = 1;

      if (row.status === 'CLOSED') {
        status = ReportStatus.Closed;
        level = 4;
      } else if (row.status === 'SUPER_ADMIN_REVIEW') {
        status = ReportStatus.SuperAdminReview;
        level = 3;
      } else if (row.status === 'PERSON_RESPONSE') {
        status = ReportStatus.PersonResponse;
        level = 2;
      }

      const attachments: Attachment[] = Array.isArray(row.attachments) ? row.attachments : [];

      const assignedToUser: User = {
        id: linkedProfile?.id || row.employee_id?.toString() || 'unknown',
        name: linkedProfile?.full_name || reporterName,
        role: linkedProfile?.role || 'Reporter',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(linkedProfile?.full_name || reporterName)}&background=random`
      };

      let currentOwner: User = assignedToUser;
      if (status === ReportStatus.SuperAdminReview) {
        currentOwner = await getAdminUser();
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
        closed_by: row.stage_3_by
      };
    } catch (err) {
      console.error('Unexpected error in getReportById:', err);
      return undefined;
    }
  }

  async createReport(reportData: Partial<Report>): Promise<Report> {
    // Get current user from Supabase auth
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      throw new Error('Authentication required to create report');
    }

    // Fetch creator profile
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('id, full_name, role, employee_code')
      .eq('id', authUser.id)
      .single();

    const creatorName = creatorProfile?.full_name || authUser.email || 'Unknown';

    // Insert into fir_activity
    const { data: newReport, error } = await supabase
      .from('fir_activity')
      .insert({
        title: reportData.title || 'New Report',
        description: reportData.description || '',
        fir_type: reportData.fir_type || 'BAD',
        priority: reportData.priority || 'Medium',
        category: reportData.category || 'Other',
        status: 'REPORTED',
        created_by: creatorName,
        created_by_id: authUser.id,
        employee_id: reportData.assignedTo?.id,
        attachments: reportData.attachments || []
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }

    const reporter = createDefaultUser(creatorName, creatorProfile?.role || 'Reporter');
    const assignedTo = reportData.assignedTo || reporter;

    return {
      id: newReport.id,
      title: newReport.title,
      description: newReport.description,
      reporter,
      assignedTo,
      currentOwner: assignedTo,
      status: ReportStatus.Reported,
      priority: newReport.priority as Priority,
      category: newReport.category as Category,
      fir_type: newReport.fir_type,
      level: 1,
      reportedAt: newReport.created_at,
      attachments: newReport.attachments || [],
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

  // ============= MESSAGE TIMELINE METHODS =============

  /**
   * Add a message to the report timeline
   */
  async addMessage(
    reportId: string,
    message: string,
    user: User,
    messageType: 'comment' | 'action' | 'system' = 'comment',
    action: Message['action'] = null,
    attachments: Attachment[] = []
  ): Promise<Message | null> {
    const { data, error } = await supabase
      .from('fir_messages')
      .insert({
        report_id: reportId,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
        message,
        message_type: messageType,
        action,
        attachments
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return null;
    }
    return data as Message;
  }

  /**
   * Get all messages for a report, chronologically ordered
   */
  async getMessages(reportId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('fir_messages')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    return (data || []) as Message[];
  }

  /**
   * Log a system message (for automated workflow updates)
   */
  async logSystemMessage(reportId: string, message: string, action?: Message['action']): Promise<void> {
    const systemUser: User = { id: 'system', name: 'System', role: 'System' };
    await this.addMessage(reportId, message, systemUser, 'system', action);
  }

  // Legacy comment method - keeping for compatibility
  async addComment(reportId: string, text: string, action?: Comment['action'], nextOwner?: User): Promise<Report> {
    const report = await this.getReportById(reportId);
    if (!report) throw new Error('Report not found');
    return report;
  }
}

export const reportService = new ReportService();
