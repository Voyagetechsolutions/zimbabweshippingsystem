
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Card, CardContent, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Truck, Package, Calendar, Users, 
  Check, Clock, X, ExternalLink 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  due_date: string;
  assigned_to: string | null;
  created_at: string;
  related_shipment?: string | null;
}

const TaskManagementPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check authentication first before rendering anything else
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // This useEffect will only run after the component has mounted
  // and the authentication checks have passed
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // This is a mock fetch since we don't have the actual tasks table yet
      // In a real implementation, this would fetch from Supabase
      
      // Simulating data loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data for demonstration
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Verify UK collection schedule',
          description: 'Confirm all collection schedules for next week',
          status: 'Pending',
          priority: 'High',
          due_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
          assigned_to: null,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Contact delayed shipment customers',
          description: 'Reach out to customers with delayed shipments ZS-12345 and ZS-12346',
          status: 'In Progress',
          priority: 'Urgent',
          due_date: new Date().toISOString(),
          assigned_to: null,
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          related_shipment: 'ZS-12345'
        },
        {
          id: '3',
          title: 'Coordinate Harare delivery logistics',
          description: 'Work with local driver team for upcoming deliveries',
          status: 'In Progress',
          priority: 'Medium',
          due_date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
          assigned_to: null,
          created_at: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
        },
        {
          id: '4',
          title: 'Process customs documentation',
          description: 'Complete customs documentation for next batch of shipments',
          status: 'Pending',
          priority: 'High',
          due_date: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
          assigned_to: null,
          created_at: new Date(Date.now() - 86400000 * 3).toISOString() // 3 days ago
        },
        {
          id: '5',
          title: 'Update shipping rates',
          description: 'Review and update shipping rates for all service tiers',
          status: 'Completed',
          priority: 'Medium',
          due_date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
          assigned_to: null,
          created_at: new Date(Date.now() - 86400000 * 5).toISOString() // 5 days ago
        }
      ];
      
      setTasks(mockTasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error.message);
      toast({
        title: 'Error loading tasks',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    // This would update the task in Supabase in a real implementation
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
    
    toast({
      title: 'Task Updated',
      description: `Task status changed to ${newStatus}`,
    });
  };

  const getPriorityBadge = (priority: Task['priority']) => {
    switch (priority) {
      case 'Low':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Low</Badge>;
      case 'Medium':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Medium</Badge>;
      case 'High':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">High</Badge>;
      case 'Urgent':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Urgent</Badge>;
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Pending</Badge>;
      case 'In Progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
      case 'Completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'Cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const isPastDue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  // Filter tasks by status
  const pendingTasks = tasks.filter(task => task.status === 'Pending');
  const inProgressTasks = tasks.filter(task => task.status === 'In Progress');
  const completedTasks = tasks.filter(task => task.status === 'Completed');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Task Management</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-500">
                Pending Tasks
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks.length}</div>
              <p className="text-xs text-gray-500">Tasks waiting to be started</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-500">
                In Progress
              </CardTitle>
              <Truck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressTasks.length}</div>
              <p className="text-xs text-gray-500">Tasks currently being worked on</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-500">
                Completed
              </CardTitle>
              <Check className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks.length}</div>
              <p className="text-xs text-gray-500">Tasks successfully completed</p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                  </div>
                ) : tasks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-gray-500 truncate max-w-[300px]">{task.description}</p>
                              {task.related_shipment && (
                                <div className="mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    Shipment: {task.related_shipment}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            <div className={`font-medium ${isPastDue(task.due_date) && task.status !== 'Completed' ? 'text-red-600' : ''}`}>
                              {formatDate(task.due_date)}
                              {isPastDue(task.due_date) && task.status !== 'Completed' && (
                                <p className="text-xs text-red-600">Overdue</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {task.status !== 'Completed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => updateTaskStatus(task.id, 'Completed')}
                                  className="h-8 px-2"
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                              {task.status === 'Pending' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => updateTaskStatus(task.id, 'In Progress')}
                                  className="h-8 px-2"
                                >
                                  <Clock className="h-4 w-4 text-blue-500" />
                                </Button>
                              )}
                              {task.status !== 'Cancelled' && task.status !== 'Completed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => updateTaskStatus(task.id, 'Cancelled')}
                                  className="h-8 px-2"
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-500 mb-1">No tasks available</h3>
                    <p className="text-sm text-gray-500">
                      There are no tasks in the system at the moment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                  </div>
                ) : pendingTasks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-gray-500 truncate max-w-[300px]">{task.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                          <TableCell>
                            <div className={`font-medium ${isPastDue(task.due_date) ? 'text-red-600' : ''}`}>
                              {formatDate(task.due_date)}
                              {isPastDue(task.due_date) && (
                                <p className="text-xs text-red-600">Overdue</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateTaskStatus(task.id, 'In Progress')}
                                className="h-8"
                              >
                                Start Task
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-500 mb-1">No pending tasks</h3>
                    <p className="text-sm text-gray-500">
                      There are no pending tasks at the moment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="in-progress">
            <Card>
              <CardHeader>
                <CardTitle>In Progress Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                  </div>
                ) : inProgressTasks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inProgressTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-gray-500 truncate max-w-[300px]">{task.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                          <TableCell>
                            <div className={`font-medium ${isPastDue(task.due_date) ? 'text-red-600' : ''}`}>
                              {formatDate(task.due_date)}
                              {isPastDue(task.due_date) && (
                                <p className="text-xs text-red-600">Overdue</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => updateTaskStatus(task.id, 'Completed')}
                                className="h-8"
                              >
                                Complete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-500 mb-1">No in-progress tasks</h3>
                    <p className="text-sm text-gray-500">
                      There are no tasks currently in progress.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>Completed Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green"></div>
                  </div>
                ) : completedTasks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-gray-500 truncate max-w-[300px]">{task.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-1" />
                              <span>Completed</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatDate(task.due_date)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Check className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-500 mb-1">No completed tasks</h3>
                    <p className="text-sm text-gray-500">
                      There are no completed tasks to display.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(TaskManagementPage);
