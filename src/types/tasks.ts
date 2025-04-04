
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  completed_at: string | null;
  assignee_name?: string | null;
  assigner_name?: string | null;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date: Date | null;
  assigned_to: string | null;
}
