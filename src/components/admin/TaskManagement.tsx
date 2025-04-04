
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, startOfToday, addDays, isSameDay } from 'date-fns';
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle, CardFooter 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { 
  Clipboard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CalendarDays, 
  Plus, 
  ListFilter, 
  Search, 
  RefreshCcw,
  Ban,
  AlertTriangle,
  CheckCheck
} from 'lucide-react';
import { Task, TaskFormData, TaskPriority, TaskStatus } from '@/types/tasks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const taskFormSchema = z.object({
  title: z.string().min(3, {
    message: "Task title must be at least 3 characters.",
  }),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  due_date: z.date().nullable(),
  assigned_to: z.string().nullable(),
});

const TaskManagement = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      due_date: null,
      assigned_to: null,
    },
  });

  const updateForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      due_date: null,
      assigned_to: null,
    },
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (currentTask && isUpdateDialogOpen) {
      updateForm.reset({
        title: currentTask.title,
        description: currentTask.description || '',
        priority: currentTask.priority,
        due_date: currentTask.due_date ? parseISO(currentTask.due_date) : null,
        assigned_to: currentTask.assigned_to,
      });
    }
  }, [currentTask, isUpdateDialogOpen, updateForm]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          id,
          subject as title,
          message as description,
          status,
          priority,
          assigned_to,
          user_id as assigned_by,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log("Fetched tasks:", data);
      // Map the data to match our Task interface
      if (data) {
        const mappedTasks = data.map((task: any) => ({
          ...task,
          assigned_to: task.assigned_to || null,
          assigned_by: task.assigned_by || null,
          due_date: null, // We'll need to add this column to the table
          completed_at: task.status === 'COMPLETED' ? task.updated_at : null,
        })) as Task[];
        
        // Try to get user names
        const userIds = Array.from(new Set([
          ...mappedTasks.filter(t => t.assigned_to).map(t => t.assigned_to),
          ...mappedTasks.filter(t => t.assigned_by).map(t => t.assigned_by)
        ].filter(Boolean) as string[]));

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          if (profiles) {
            const userMap = profiles.reduce((acc, profile) => {
              acc[profile.id] = profile.full_name;
              return acc;
            }, {} as Record<string, string>);

            mappedTasks.forEach(task => {
              if (task.assigned_to) {
                task.assignee_name = userMap[task.assigned_to];
              }
              if (task.assigned_by) {
                task.assigner_name = userMap[task.assigned_by];
              }
            });
          }
        }

        setTasks(mappedTasks);
      }
    } catch (error: any) {
      console.error("Error fetching tasks:", error.message);
      toast({
        title: 'Error fetching tasks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (error) throw error;

      if (data) {
        setUsers(data);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error.message);
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <RefreshCcw className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge>
            {status}
          </Badge>
        );
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'LOW':
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-800">
            Low
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge variant="outline" className="border-green-300 text-green-800">
            Medium
          </Badge>
        );
      case 'HIGH':
        return (
          <Badge variant="outline" className="border-yellow-300 text-yellow-800">
            High
          </Badge>
        );
      case 'URGENT':
        return (
          <Badge variant="outline" className="border-red-300 text-red-800">
            Urgent
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {priority}
          </Badge>
        );
    }
  };

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const today = startOfToday();
    const dueDateObj = parseISO(dueDate);
    const tomorrow = addDays(today, 1);
    
    if (isBefore(dueDateObj, today)) {
      return (
        <Badge variant="destructive" className="ml-2">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    } else if (isSameDay(dueDateObj, today)) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 ml-2">
          Today
        </Badge>
      );
    } else if (isSameDay(dueDateObj, tomorrow)) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 ml-2">
          Tomorrow
        </Badge>
      );
    }
    
    return null;
  };

  const onSubmitNewTask = async (data: TaskFormData) => {
    try {
      // Convert to format matching our table
      const taskData = {
        subject: data.title,
        message: data.description || '',
        priority: data.priority,
        assigned_to: data.assigned_to,
        status: 'Open',
      };

      const { error } = await supabase
        .from('support_tickets')
        .insert([taskData]);

      if (error) throw error;

      toast({
        title: 'Task created',
        description: 'The task has been created successfully',
      });
      
      setIsCreateDialogOpen(false);
      form.reset();
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error creating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onSubmitUpdateTask = async (data: TaskFormData) => {
    if (!currentTask) return;
    
    try {
      // Convert to format matching our table
      const taskData = {
        subject: data.title,
        message: data.description || '',
        priority: data.priority,
        assigned_to: data.assigned_to,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('support_tickets')
        .update(taskData)
        .eq('id', currentTask.id);

      if (error) throw error;

      toast({
        title: 'Task updated',
        description: 'The task has been updated successfully',
      });
      
      setIsUpdateDialogOpen(false);
      updateForm.reset();
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'COMPLETED' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Task status changed to ${newStatus.toLowerCase()}`,
      });
      
      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (task.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (task.assignee_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Task Management</CardTitle>
              <CardDescription>
                Create and manage tasks for your team
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-zim-green hover:bg-zim-green/90">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Input
                placeholder="Search tasks by title, description, or assignee"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <div className="flex items-center">
                    <ListFilter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline"
                onClick={fetchTasks}
                className="h-10 px-4"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16">
              <Clipboard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter !== 'all' ? "Try adjusting your filters" : "Create your first task to get started"}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-zim-green hover:bg-zim-green/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">
                            {task.description || "No description"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.assignee_name || "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {task.due_date ? (
                            <>
                              <CalendarDays className="h-4 w-4 mr-2 text-gray-400" />
                              {format(parseISO(task.due_date), 'MMM d, yyyy')}
                              {getDueDateStatus(task.due_date)}
                            </>
                          ) : (
                            <span className="text-gray-500">No due date</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(task.priority)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(task.status as TaskStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCurrentTask(task);
                              setIsUpdateDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          
                          {task.status !== 'COMPLETED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-200"
                              onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                            >
                              <CheckCheck className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          
                          {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200"
                              onClick={() => handleStatusChange(task.id, 'CANCELLED')}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task for your team to work on.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNewTask)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
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
                        placeholder="Enter task description" 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span className="text-muted-foreground">Pick a date</span>
                              )}
                              <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
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
                      onValueChange={field.onChange} 
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  form.reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-zim-green hover:bg-zim-green/90">Create Task</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Update Task Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
            <DialogDescription>
              Update the details for this task.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onSubmitUpdateTask)} className="space-y-4">
              <FormField
                control={updateForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={updateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter task description" 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={updateForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
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
                  control={updateForm.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span className="text-muted-foreground">Pick a date</span>
                              )}
                              <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date("1900-01-01")}
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
                control={updateForm.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsUpdateDialogOpen(false);
                  updateForm.reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-zim-green hover:bg-zim-green/90">Update Task</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskManagement;
