export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum ReportStatus {
  Reported = 'Reported',           // Stage 1: New
  PersonResponse = 'Person Response', // Stage 2: Employee Action
  SuperAdminReview = 'Super Admin Review', // Stage 3: Admin Action
  Closed = 'Closed',               // Stage 4: Final

  // Legacy/Compatibility
  New = 'New',
  Accepted = 'Accepted',
  Refused = 'Refused',
  Escalated = 'Escalated',
  UnderReview = 'Under Review',
  Rejected = 'Rejected',
}

export enum Category {
  Careless = 'Careless',
  FollowUp = 'Follow-up',
  Planning = 'Planning',
  Responsibility = 'Responsibility',
  Communication = 'Communication',
  Other = 'Other',
}

export interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'audio' | 'document';
  url: string;
  name: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  text: string;
  timestamp: string;
  action?: 'comment' | 'accept' | 'reject' | 'confirm' | 'send_back' | 'escalate' | 'request_info' | 'refuse' | 'close';
  attachments?: Attachment[];
}

export interface Report {
  id: string;
  title: string;
  description: string;
  reporter: User; // The person who CREATED the report
  assignedTo: User; // The person who committed the act / needs to respond
  currentOwner: User; // The person who needs to act next
  status: ReportStatus;
  priority: Priority;
  category: string; // Changed from Category enum to string to support dynamic categories
  fir_type: 'GOOD' | 'BAD';
  level: number; // 1=Reported, 2=PersonResponse, 3=AdminReview, 4=Closed
  reportedAt: string;
  attachments: Attachment[];
  timeline: Comment[];
  audioTranscript?: string;

  // Workflow fields
  response_comment?: string;
  response_attachments?: Attachment[];
  final_decision?: string;
  closed_at?: string;
  closed_by?: string;

  // Legacy workflow fields (optional)
  stage2?: {
    status: 'PENDING' | 'ACCEPTED' | 'REFUSED';
    notes?: string;
    by?: string;
  };
  stage3?: {
    status: 'PENDING' | 'CLOSED';
    notes?: string;
    by?: string;
  };
}