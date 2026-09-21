import type { RoleKey } from "@prisma/client";

// Icons are referenced by string key, not by component, because this config is built
// in a Server Component and passed as a prop into a Client Component (DashboardShell) —
// component/function references aren't serializable across that boundary. The actual
// icon components are resolved client-side in components/shared/icon-map.tsx.
export type IconKey =
  | "dashboard"
  | "students"
  | "parents"
  | "teachers"
  | "academics"
  | "batches"
  | "timetable"
  | "material"
  | "settingsUsers"
  | "settingsRoles"
  | "homework"
  | "recordings"
  | "attendance"
  | "tests"
  | "atRisk"
  | "payments"
  | "performance"
  | "leads"
  | "announcements"
  | "automation"
  | "communication"
  | "messageTemplates"
  | "analytics"
  | "engagement"
  | "interventions"
  | "leaderboard"
  | "badges"
  | "gamification"
  | "referrals"
  | "support"
  | "knowledgeBase"
  | "studyAssistant"
  | "studyPlan"
  | "teacherAssistant"
  | "predictiveRisk"
  | "learningPath"
  | "examPrep"
  | "commandCenter"
  | "systemHealth"
  | "aiUsage"
  | "apiKeys"
  | "paymentGateway"
  | "integrations"
  | "notesSubscription";

export interface NavItem {
  label: string;
  href: string;
  icon: IconKey;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAV_BY_ROLE: Record<RoleKey, NavSection[]> = {
  SUPER_ADMIN: adminNav(),
  ADMIN: adminNav(),
  TEACHER: [
    {
      items: [{ label: "Dashboard", href: "/teacher", icon: "dashboard" }],
    },
    {
      title: "Teaching",
      items: [
        { label: "My Batches", href: "/teacher/batches", icon: "batches" },
        { label: "Homework", href: "/teacher/homework", icon: "homework" },
        { label: "Timetable", href: "/teacher/timetable", icon: "timetable" },
        { label: "Knowledge Base", href: "/knowledge-base", icon: "knowledgeBase" },
      ],
    },
    {
      title: "Help",
      items: [{ label: "Support", href: "/support", icon: "support" }],
    },
  ],
  STUDENT: [
    {
      items: [{ label: "Dashboard", href: "/student", icon: "dashboard" }],
    },
    {
      title: "Learning",
      items: [
        { label: "Timetable", href: "/student/timetable", icon: "timetable" },
        { label: "Homework", href: "/student/homework", icon: "homework" },
        { label: "Tests", href: "/student/tests", icon: "tests" },
        { label: "Exam Prep", href: "/student/exam-prep", icon: "examPrep" },
        { label: "Recordings", href: "/student/recordings", icon: "recordings" },
        { label: "Study Material", href: "/student/study-material", icon: "material" },
        { label: "Attendance", href: "/student/attendance", icon: "attendance" },
        { label: "Learning Path", href: "/student/learning-path", icon: "learningPath" },
      ],
    },
    {
      title: "Help",
      items: [{ label: "Support", href: "/support", icon: "support" }],
    },
  ],
  PARENT: [
    {
      items: [
        { label: "Dashboard", href: "/parent", icon: "dashboard" },
        { label: "Payments", href: "/parent/payments", icon: "payments" },
        { label: "Notes by Post", href: "/parent/notes-subscription", icon: "notesSubscription" },
      ],
    },
    {
      title: "Help",
      items: [{ label: "Support", href: "/support", icon: "support" }],
    },
  ],
  COUNSELOR: [
    {
      items: [{ label: "Dashboard", href: "/counselor", icon: "dashboard" }],
    },
    {
      title: "Admissions",
      items: [{ label: "My Leads", href: "/counselor/leads", icon: "leads" }],
    },
    {
      title: "Review",
      items: [{ label: "Knowledge Base", href: "/knowledge-base", icon: "knowledgeBase" }],
    },
    {
      title: "Help",
      items: [{ label: "Support", href: "/support", icon: "support" }],
    },
  ],
};

function adminNav(): NavSection[] {
  return [
    {
      items: [{ label: "Dashboard", href: "/admin", icon: "dashboard" }],
    },
    {
      title: "Admissions",
      items: [
        { label: "Leads", href: "/admin/leads", icon: "leads" },
        { label: "Referrals", href: "/admin/referrals", icon: "referrals" },
      ],
    },
    {
      title: "People",
      items: [
        { label: "Students", href: "/admin/students", icon: "students" },
        { label: "Parents", href: "/admin/parents", icon: "parents" },
        { label: "Teachers", href: "/admin/teachers", icon: "teachers" },
      ],
    },
    {
      title: "Academics",
      items: [
        { label: "Academic Structure", href: "/admin/academics", icon: "academics" },
        { label: "Timetable", href: "/admin/timetable", icon: "timetable" },
      ],
    },
    {
      title: "Learning",
      items: [
        { label: "Study Material", href: "/admin/study-material", icon: "material" },
        { label: "Knowledge Base", href: "/knowledge-base", icon: "knowledgeBase" },
      ],
    },
    {
      title: "Performance",
      items: [
        { label: "At-Risk Students", href: "/admin/at-risk", icon: "atRisk" },
        { label: "Analytics", href: "/admin/analytics", icon: "analytics" },
      ],
    },
    {
      title: "Engagement",
      items: [
        { label: "Engagement Dashboard", href: "/admin/engagement", icon: "engagement" },
        { label: "Predictive Risk", href: "/admin/predictive-risk", icon: "predictiveRisk" },
        { label: "Interventions", href: "/admin/interventions", icon: "interventions" },
      ],
    },
    {
      title: "Gamification",
      items: [
        { label: "Leaderboard", href: "/admin/leaderboard", icon: "leaderboard" },
        { label: "Badges", href: "/admin/badges", icon: "badges" },
      ],
    },
    {
      title: "Payments",
      items: [
        { label: "Payments", href: "/admin/payments", icon: "payments" },
        { label: "Notes Subscriptions", href: "/admin/notes-subscriptions", icon: "notesSubscription" },
      ],
    },
    {
      title: "Automation",
      items: [{ label: "Activity Log", href: "/admin/automation", icon: "automation" }],
    },
    {
      title: "Communication",
      items: [{ label: "Communication Center", href: "/admin/communication", icon: "communication" }],
    },
    {
      title: "Support",
      items: [
        { label: "Support Tickets", href: "/admin/support", icon: "support" },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Users", href: "/admin/settings/users", icon: "settingsUsers" },
        { label: "Roles & Permissions", href: "/admin/settings/roles", icon: "settingsRoles" },
        { label: "Performance Rules", href: "/admin/settings/performance", icon: "performance" },
        { label: "Automation Rules", href: "/admin/settings/automation", icon: "automation" },
        { label: "Message Templates", href: "/admin/settings/message-templates", icon: "messageTemplates" },
        { label: "Gamification Points", href: "/admin/settings/gamification", icon: "gamification" },
        { label: "Payment Gateway", href: "/admin/settings/payment-gateway", icon: "paymentGateway" },
        { label: "Integrations", href: "/admin/settings/integrations", icon: "integrations" },
        { label: "API Keys", href: "/admin/settings/api-keys", icon: "apiKeys" },
      ],
    },
    {
      title: "System",
      items: [
        { label: "System Health", href: "/admin/system-health", icon: "systemHealth" },
        { label: "AI Usage", href: "/admin/ai-usage", icon: "aiUsage" },
      ],
    },
  ];
}
