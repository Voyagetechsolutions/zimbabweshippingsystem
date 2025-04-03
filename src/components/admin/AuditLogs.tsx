
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RefreshCcw,
  Filter,
  AlertTriangle,
  FileText,
  Trash2,
  Edit,
  Plus,
  LogIn,
  LogOut,
  ShieldAlert,
  User,
  PackageCheck,
  Clock,
} from "lucide-react";
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any | null;
  ip_address: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Get user information for each log
        const logsWithUsers = await Promise.all(
          data.map(async (log) => {
            // Fetch user profile information
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', log.user_id)
              .single();
            
            return {
              ...log,
              user_email: profileData?.email || 'Unknown',
              user_name: profileData?.full_name || 'Unknown User'
            };
          })
        );
        
        setLogs(logsWithUsers as AuditLog[]);
      }
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique actions and entities for filters
  const getUniqueActions = () => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions);
  };

  const getUniqueEntities = () => {
    const entities = new Set(logs.map(log => log.entity_type));
    return Array.from(entities);
  };

  // Get icon for action type
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <Plus className="h-4 w-4" />;
      case 'update':
        return <Edit className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'login':
        return <LogIn className="h-4 w-4" />;
      case 'logout':
        return <LogOut className="h-4 w-4" />;
      case 'permission_change':
        return <ShieldAlert className="h-4 w-4" />;
      case 'status_change':
        return <PackageCheck className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get color for action type
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'login':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'logout':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'permission_change':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'status_change':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  // Format JSON for display
  const formatJSON = (json: any) => {
    if (!json) return 'No details';
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch (e) {
        return json;
      }
    }
    return JSON.stringify(json, null, 2);
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      searchQuery === '' ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesAction = actionFilter === 'all' || log.action.toLowerCase() === actionFilter.toLowerCase();
    const matchesEntity = entityFilter === 'all' || log.entity_type.toLowerCase() === entityFilter.toLowerCase();
    
    return matchesSearch && matchesAction && matchesEntity;
  });

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Audit Logs</CardTitle>
              <CardDescription>View system activity and security events</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchAuditLogs}
              className="h-10 px-4"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-grow">
              <Input
                placeholder="Search logs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <div className="flex gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Action" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {getUniqueActions().map(action => (
                    <SelectItem key={action} value={action.toLowerCase()}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Entity" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {getUniqueEntities().map(entity => (
                    <SelectItem key={entity} value={entity.toLowerCase()}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zim-green"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center p-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No audit logs found</h3>
              <p className="text-gray-500">
                {searchQuery || actionFilter !== 'all' || entityFilter !== 'all' 
                  ? "Try adjusting your filters" 
                  : "There are no audit logs in the system"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-500" />
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{log.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          <div className="flex items-center gap-1">
                            {getActionIcon(log.action)}
                            <span>{log.action}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{log.entity_type}</span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entity_id || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {log.details ? (
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="details">
                              <AccordionTrigger className="py-2">
                                <span className="text-xs">View Details</span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <pre className="text-xs overflow-x-auto bg-gray-50 p-2 rounded">
                                  {formatJSON(log.details)}
                                </pre>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ) : (
                          <span className="text-gray-500 text-xs">No details</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
