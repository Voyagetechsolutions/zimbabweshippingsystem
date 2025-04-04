
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarIcon, Edit, Trash2 } from 'lucide-react';
import { Task, TaskFormData, TaskPriority, TaskStatus } from '@/types/tasks';

const taskFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(5, 'Description must be at least 5 characters').max(500),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  due_date: z.date().nullable(),
  assigned_to: z.string().nullable(),
});

const TaskManagement: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<{id: string, full_name: string}[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      due_date: null,
      assigned_to: null
    }
  });

  useEffect(() => {
    if (selectedTask) {
      form.reset({
        title: selectedTask.title,
        description: selectedTask.description || '',
        priority: selectedTask.priority,
        due_date: selectedTask.due_date ? parseISO(selectedTask.due_date) : null,
        assigned_to: selectedTask.assigned_to
      });
    } else {
      form.reset({
        title: '',
        description: '',
        priority: 'MEDIUM',
        due_date: null,
        assigned_to: null
      });
    }
  }, [selectedTask, form]);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [currentFilter]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          assignee:assigned_to(full_name),
          creator:user_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (currentFilter !== 'all') {
        query = query.eq('status', currentFilter.toUpperCase());
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const mappedTasks: Task[] = data.map(item => ({
          id: item.id,
          title: item.subject,
          description: item.message,
          status: item.status as TaskStatus,
          priority: item.priority as TaskPriority,
          assigned_to: item.assigned_to,
          assigned_by: item.user_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          due_date: null,
          completed_at: null,
          assignee_name: item.assignee?.full_name,
          assigner_name: item.creator?.full_name
        }));
        
        setTasks(mappedTasks);
      }
    } catch (error: any) {
      console.error('Error fetching tasks:', error.message);
      toast({
        title: 'Error',
        description: 'Failed to load tasks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;

      if (data) {
        setUsers(data);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (formData: TaskFormData) => {
    if (!user) return;

    try {
      if (selectedTask) {
        // Update existing task
        const { error } = await supabase
          .from('support_tickets')
          .update({
            subject: formData.title,
            message: formData.description,
            priority: formData.priority,
            assigned_to: formData.assigned_to,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedTask.id);

        if (error) throw error;

        toast({
          title: 'Task Updated',
          description: 'Task has been updated successfully',
        });
      } else {
        // Create new task
        const { error } = await supabase
          .from('support_tickets')
          .insert({
            subject: formData.title,
            message: formData.description,
            priority: formData.priority,
            assigned_to: formData.assigned_to,
            user_id: user.id,
            status: 'Open'
          });

        if (error) throw error;

        toast({
          title: 'Task Created',
          description: 'New task has been created successfully',
        });
      }

      setIsDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      console.error('Error saving task:', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Task status has been updated to ${newStatus}`,
      });

      fetchTasks();
    } catch (error: any) {
      console.error('Error updating task status:', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;

      toast({
        title: 'Task Deleted',
        description: 'Task has been deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'LOW':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const createBulkTasks = async () => {
    if (!user) return;
    
    try {
      // Example of creating bulk tasks - this would typically come from a form
      const taskList = [
        {
          subject: 'Contact shipping partners',
          message: 'Contact our UK shipping partners to negotiate rates for Q2',
          priority: 'HIGH' as TaskPriority,
          assigned_to: users[0]?.id,
          status: 'Open',
          user_id: user.id
        },
        {
          subject: 'Update shipping rates on website',
          message: 'Update the shipping rates on the website based on new partner agreements',
          priority: 'MEDIUM' as TaskPriority,
          assigned_to: users[0]?.id,
          status: 'Open',
          user_id: user.id
        }
      ];
      
      // Fix to include user_id in each task
      const { error } = await supabase
        .from('support_tickets')
        .insert(taskList.map(task => ({
          ...task,
          user_id: user.id
        })));

      if (error) throw error;

      toast({
        title: 'Tasks Created',
        description: `${taskList.length} tasks have been created successfully`,
      });

      fetchTasks();
    } catch (error: any) {
      console.error('Error creating bulk tasks:', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Task Management</h2>
          <p className="text-gray-500">Manage and track support tickets and tasks</p>
        </div>
        <div className="flex space-x-4">
          <Select value={currentFilter} onValueChange={setCurrentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => {
              setSelectedTask(null);
              setIsDialogOpen(true);
            }}
            className="bg-zim-green hover:bg-zim-green/80"
          >
            Create Task
          </Button>
        </div>
      </div>

      {loadingTasks ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      {task.title}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Select 
                          defaultValue={task.status} 
                          onValueChange={(value) => handleUpdateStatus(task.id, value as TaskStatus)}
                        >
                          <SelectTrigger className="h-8 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getPriorityColor(task.priority)} px-2 py-1 rounded-full text-xs`}>
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.assignee_name || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(task.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No tasks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Task Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription>
              {selectedTask 
                ? 'Update the details of the selected task' 
                : 'Fill in the details to create a new task'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Task title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe the task in detail" 
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="URGENT">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select 
                      value={field.value || ""} 
                      onValueChange={val => field.onChange(val || null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-zim-green hover:bg-zim-green/80">
                  {selectedTask ? 'Update Task' : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteTask}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagement;
