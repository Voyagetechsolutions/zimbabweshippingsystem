import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCcw, AlertCircle, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface Issue {
  id: string;
  issue_type: string;
  tracking_number: string;
  description: string;
  status: string;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

const IssuesComplaintsTab = () => {
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    fetchIssues();
  }, [showResolved]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      // Note: This assumes you'll create a 'delivery_issues' table
      let query = supabase
        .from('delivery_issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (!showResolved) {
        query = query.eq('status', 'active');
      }

      const { data, error } = await query;

      if (error && error.code !== 'PGRST116') throw error; // Ignore table doesn't exist error

      setIssues(data || []);
    } catch (error: any) {
      console.error('Error fetching issues:', error);
      // Don't show error if table doesn't exist yet
      if (error.code !== 'PGRST116') {
        toast({
          title: 'Error',
          description: 'Failed to load issues',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resolveIssue = async (issueId: string) => {
    if (!resolutionNotes.trim()) {
      toast({
        title: 'Resolution Notes Required',
        description: 'Please provide notes on how the issue was resolved',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('delivery_issues')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes
        })
        .eq('id', issueId);

      if (error) throw error;

      toast({
        title: 'Issue Resolved',
        description: 'The issue has been marked as resolved',
      });

      setResolvingIssueId(null);
      setResolutionNotes('');
      fetchIssues();
    } catch (error: any) {
      console.error('Error resolving issue:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve issue',
        variant: 'destructive',
      });
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-medium">Delivery Issues & Complaints</CardTitle>
            <CardDescription>
              Track and resolve delivery-related issues
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowResolved(!showResolved)}
            >
              {showResolved ? 'Show Active' : 'View Resolved'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchIssues} 
              disabled={loading}
            >
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-16 text-gray-500 border rounded-xl bg-gray-50 dark:bg-gray-900">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {showResolved ? 'No resolved issues' : 'No active issues'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {showResolved 
                  ? 'There are no resolved issues or complaints yet'
                  : 'There are currently no reported issues or complaints'
                }
              </p>
              
              {!showResolved && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowResolved(true)}
                >
                  View Resolved Issues
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <Card key={issue.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <CardTitle className="text-base">{issue.issue_type}</CardTitle>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span>
                            <strong>Tracking:</strong> {issue.tracking_number}
                          </span>
                          <span>
                            <strong>Reported:</strong> {getTimeAgo(issue.created_at)}
                          </span>
                        </div>
                      </div>
                      <Badge 
                        variant={issue.status === 'active' ? 'destructive' : 'default'}
                        className={issue.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {issue.status === 'active' ? '⚠ ACTIVE' : '✓ RESOLVED'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description:</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        {issue.description}
                      </p>
                    </div>

                    {issue.resolution_notes && (
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Resolution Notes:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                          {issue.resolution_notes}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Resolved: {format(new Date(issue.resolved_at!), 'PPP')}
                        </p>
                      </div>
                    )}

                    {issue.status === 'active' && (
                      <Dialog 
                        open={resolvingIssueId === issue.id}
                        onOpenChange={(open) => !open && setResolvingIssueId(null)}
                      >
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => setResolvingIssueId(issue.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Resolve Issue
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Resolve Issue</DialogTitle>
                            <DialogDescription>
                              Provide details on how this issue was resolved
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium mb-1">Issue:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{issue.issue_type}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-1">Tracking #:</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{issue.tracking_number}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Resolution Notes:</label>
                              <Textarea
                                placeholder="Describe how the issue was resolved..."
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                className="mt-1"
                                rows={4}
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setResolvingIssueId(null)}>
                              Cancel
                            </Button>
                            <Button onClick={() => resolveIssue(issue.id)}>
                              Mark as Resolved
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IssuesComplaintsTab;
