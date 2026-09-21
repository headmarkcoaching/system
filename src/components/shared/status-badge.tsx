import { Badge, type BadgeProps } from "@/components/ui/badge";

type Tone = NonNullable<BadgeProps["variant"]>;

const STATUS_CONFIG: Record<string, { label: string; tone: Tone }> = {
  // Student
  ACTIVE: { label: "Active", tone: "success" },
  TRIAL: { label: "Trial", tone: "secondary" },
  PAYMENT_PENDING: { label: "Payment Pending", tone: "warning" },
  INACTIVE: { label: "Inactive", tone: "outline" },
  ALUMNI: { label: "Alumni", tone: "outline" },
  // Batch
  UPCOMING: { label: "Upcoming", tone: "secondary" },
  COMPLETED: { label: "Completed", tone: "outline" },
  ARCHIVED: { label: "Archived", tone: "outline" },
  // Live class
  LIVE: { label: "Live Now", tone: "destructive" },
  CANCELLED: { label: "Cancelled", tone: "outline" },
  // Attendance
  PRESENT: { label: "Present", tone: "success" },
  ABSENT: { label: "Absent", tone: "destructive" },
  LATE: { label: "Late", tone: "warning" },
  EXCUSED: { label: "Excused", tone: "secondary" },
  PARTIAL: { label: "Partial", tone: "warning" },
  // Homework submission
  PENDING: { label: "Pending", tone: "warning" },
  SUBMITTED: { label: "Submitted", tone: "secondary" },
  REVIEWED: { label: "Reviewed", tone: "success" },
  RESUBMISSION_REQUESTED: { label: "Resubmit", tone: "destructive" },
  // Performance
  EXCELLENT: { label: "Excellent", tone: "success" },
  PROGRESSING: { label: "Progressing", tone: "secondary" },
  NEEDS_ATTENTION: { label: "Needs Attention", tone: "warning" },
  AT_RISK: { label: "At Risk", tone: "destructive" },
  // Payment
  PAID: { label: "Paid", tone: "success" },
  PARTIALLY_PAID: { label: "Partially Paid", tone: "warning" },
  OVERDUE: { label: "Overdue", tone: "destructive" },
  PAID_UP: { label: "Paid Up", tone: "success" },
  NO_PLAN: { label: "No Plan", tone: "outline" },
  // Enrollment / generic
  PENDING_REVIEW: { label: "Pending Review", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "destructive" },
  // Automation / WhatsApp
  SUCCESS: { label: "Success", tone: "success" },
  FAILED: { label: "Failed", tone: "destructive" },
  SKIPPED: { label: "Skipped", tone: "secondary" },
  QUEUED: { label: "Queued", tone: "secondary" },
  SENT: { label: "Sent", tone: "success" },
  DELIVERED: { label: "Delivered", tone: "success" },
  READ: { label: "Read", tone: "success" },
  // Engagement
  HIGHLY_ENGAGED: { label: "Highly Engaged", tone: "success" },
  ENGAGED: { label: "Engaged", tone: "secondary" },
  LOW_ENGAGEMENT: { label: "Low Engagement", tone: "warning" },
  // Intervention
  OPEN: { label: "Open", tone: "warning" },
  IN_PROGRESS: { label: "In Progress", tone: "secondary" },
  // Referral
  INVITED: { label: "Invited", tone: "secondary" },
  REGISTERED: { label: "Registered", tone: "secondary" },
  ENROLLED: { label: "Enrolled", tone: "success" },
  REWARDED: { label: "Rewarded", tone: "success" },
  // Support ticket
  WAITING_FOR_USER: { label: "Waiting for User", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
  CLOSED: { label: "Closed", tone: "outline" },
  URGENT: { label: "Urgent", tone: "destructive" },
  HIGH: { label: "High", tone: "warning" },
  MEDIUM: { label: "Medium", tone: "secondary" },
  LOW: { label: "Low", tone: "outline" },
  // Predictive Risk (reuses LOW/HIGH above)
  MODERATE: { label: "Moderate", tone: "secondary" },
  CRITICAL: { label: "Critical", tone: "destructive" },
  // Student Goals (ACTIVE/CANCELLED reuse the Student/generic mappings above)
  ACHIEVED: { label: "Achieved", tone: "success" },
  MISSED: { label: "Missed", tone: "destructive" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status] ?? { label: toTitleCase(status), tone: "outline" as Tone };
  return (
    <Badge variant={config.tone} className={className}>
      {config.label}
    </Badge>
  );
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
