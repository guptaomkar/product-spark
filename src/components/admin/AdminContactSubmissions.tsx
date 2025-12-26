import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Search,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function AdminContactSubmissions() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load contact submissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setSubmissions(prev =>
        prev.map(s => (s.id === id ? { ...s, status: newStatus } : s))
      );
      
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(prev => prev ? { ...prev, status: newStatus } : null);
      }

      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-blue-500/30">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const inProgressCount = submissions.filter(s => s.status === 'in_progress').length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Contact Submissions</CardTitle>
                <CardDescription className="text-sm">
                  {pendingCount > 0 && (
                    <span className="text-yellow-600">{pendingCount} pending</span>
                  )}
                  {pendingCount > 0 && inProgressCount > 0 && ' • '}
                  {inProgressCount > 0 && (
                    <span className="text-blue-600">{inProgressCount} in progress</span>
                  )}
                  {pendingCount === 0 && inProgressCount === 0 && 'All caught up!'}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSubmissions} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No submissions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-transparent hover:border-border"
                  onClick={() => setSelectedSubmission(submission)}
                >
                  {/* Mobile layout */}
                  <div className="flex flex-col gap-3 sm:hidden">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{submission.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{submission.email}</p>
                        </div>
                      </div>
                      {getStatusBadge(submission.status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {submission.subject || 'No subject'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {submission.message}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(submission.created_at), 'MMM dd, hh:mm a')}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden sm:flex sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{submission.name}</p>
                          {getStatusBadge(submission.status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {submission.email} • {submission.subject || 'No subject'}
                        </p>
                        <p className="text-sm text-muted-foreground/70 line-clamp-1 mt-1">
                          {submission.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(submission.created_at), 'MMM dd, yyyy')}
                        </div>
                        <p className="text-xs">{format(new Date(submission.created_at), 'hh:mm a')}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Contact Submission
            </DialogTitle>
            <DialogDescription>
              Received {selectedSubmission && format(new Date(selectedSubmission.created_at), 'MMMM dd, yyyy \'at\' hh:mm a')}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Sender Info */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{selectedSubmission.name}</p>
                  <a
                    href={`mailto:${selectedSubmission.email}`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    {selectedSubmission.email}
                  </a>
                </div>
              </div>

              {/* Subject */}
              {selectedSubmission.subject && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Subject</p>
                  <p className="text-foreground">{selectedSubmission.subject}</p>
                </div>
              )}

              {/* Message */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <p className="text-foreground whitespace-pre-wrap">{selectedSubmission.message}</p>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedSubmission.status === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStatus(selectedSubmission.id, 'pending')}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Button>
                  <Button
                    variant={selectedSubmission.status === 'in_progress' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStatus(selectedSubmission.id, 'in_progress')}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    In Progress
                  </Button>
                  <Button
                    variant={selectedSubmission.status === 'resolved' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStatus(selectedSubmission.id, 'resolved')}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Resolved
                  </Button>
                  <Button
                    variant={selectedSubmission.status === 'closed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateStatus(selectedSubmission.id, 'closed')}
                    disabled={isUpdating}
                    className="flex-1 sm:flex-none"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Closed
                  </Button>
                </div>
              </div>

              {/* Reply Button */}
              <Button className="w-full" asChild>
                <a href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject || 'Your inquiry to DataEnrich'}`}>
                  <Mail className="w-4 h-4 mr-2" />
                  Reply via Email
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}