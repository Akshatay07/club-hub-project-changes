// Auth
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  role?: "student" | "faculty";
}

export interface AuthResponse {
  token: string;
  user: User;
}

// User
export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "faculty" | "student";
}

// ✅ FIXED CLUB (ONLY ONE)
export interface Club {
  _id: string;
  name: string;
  status: "healthy" | "critical" | "warning";
  membersCount: number;
  rating: number;
  budgetAllocated?: number;
  budgetUsed?: number;
}

// Events
export interface Event {
  _id: string;
  name: string;
  club?: string;
  clubId?: any;
  clubName?: string;
  status: "approved" | "pending" | "warning" | "rejected";
  rating?: string;
  date: string;
  time: string;
  venue?: string;
  location?: string;
  maxCapacity?: number;
  description?: string;
  budgetUsed?: number;
  signedAttendanceSheets?: any[];
  attendanceAttached?: boolean;
  approvalStage?: string;
}

// Student event
export interface StudentEvent extends Event {
  registrationStatus: "registered" | "attended" | "cancelled" | null;
}

// Event Registration
export interface EventRegistration {
  _id: string;
  event: Event;
  student: string;
  status: "registered" | "attended" | "cancelled";
  createdAt: string;
}

// Feedback
export interface Feedback {
  _id: string;
  student: { _id: string; name: string };
  targetType: "club" | "event";
  targetId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// Faculty Stats
export interface FacultyStats {
  totalEvents: number;
  pendingEvents: number;
  totalRegistrations: number;
  feedbackCount: number;
  clubRating: number;
}

// Complaints
export interface Complaint {
  _id: string;
  text: string;
  type: "alert" | "rating";
  createdAt: string;
}

// Metrics
export interface DashboardMetrics {
  totalClubs: number;
  eventsThisMonth: number;
  pendingApprovals: number;
  avgRating: number;
}

// Quick Stats
export interface QuickStatsData {
  upcomingEvents: number;
  reportsPending: number;
  totalParticipants: number;
}

// Budget (updated for clubs)
export interface BudgetData {
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
  clubs: {
    name: string;
    allocated: number;
    used: number;
    remaining: number;
  }[];
}

// Chart data
export interface MonthlyEventData {
  month: string;
  all: number;
  pending: number;
  confirmed: number;
}

// Calendar events
export interface CalendarEvent {
  time: string;
  title: string;
  club: string;
  status: "approved" | "pending" | "warning";
}

export interface CalendarDayEvents {
  date: string;
  events: CalendarEvent[];
}

// Notifications
export interface AppNotification {
  _id: string;
  user: string;
  title: string;
  description: string;
  type: "info" | "warning" | "success";
  read: boolean;
  relatedEvent?: string;
  createdAt: string;
}