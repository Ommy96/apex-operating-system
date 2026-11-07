export const TASK_STATUSES = ["todo", "in_progress", "blocked", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CASE_STATUSES = ["open", "in_progress", "referred", "resolved", "closed", "lost_to_follow_up"] as const;
export type ManagedCaseStatus = (typeof CASE_STATUSES)[number];

const taskTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  todo: ["in_progress", "cancelled"],
  in_progress: ["todo", "blocked", "completed", "cancelled"],
  blocked: ["in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

const caseTransitions: Record<ManagedCaseStatus, readonly ManagedCaseStatus[]> = {
  open: ["in_progress", "referred", "resolved", "closed", "lost_to_follow_up"],
  in_progress: ["open", "referred", "resolved", "closed", "lost_to_follow_up"],
  referred: ["in_progress", "resolved", "closed", "lost_to_follow_up"],
  resolved: ["in_progress", "closed"],
  closed: [],
  lost_to_follow_up: [],
};

export function allowedTaskTransitions(status: TaskStatus): readonly TaskStatus[] {
  return taskTransitions[status];
}

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  return from === to || taskTransitions[from].includes(to);
}

export function allowedCaseTransitions(status: ManagedCaseStatus): readonly ManagedCaseStatus[] {
  return caseTransitions[status];
}

export function canTransitionCaseStatus(from: ManagedCaseStatus, to: ManagedCaseStatus): boolean {
  return from === to || caseTransitions[from].includes(to);
}

export const WORK_RECORD_TYPES = [
  "life_event",
  "vulnerability_assessment",
  "need",
  "home_visit",
  "school_visit",
  "donor_request",
] as const;

export type WorkRecordType = (typeof WORK_RECORD_TYPES)[number];

export function isClosedWorkStatus(status: string): boolean {
  return status === "completed" || status === "cancelled";
}

export function isOverdueTask(status: string, dueDate: string | null, today: string): boolean {
  return !isClosedWorkStatus(status) && Boolean(dueDate && dueDate < today);
}