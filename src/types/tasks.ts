
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assigner_name?: string;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date: Date | null;
  assigned_to: string | null;
}
