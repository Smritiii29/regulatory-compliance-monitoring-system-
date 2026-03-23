import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { submissionsAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle, XCircle, Clock, Download, Eye, Search, Filter, X
} from 'lucide-react';

const Submissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);

  const isAdminOrPrincipal = user?.role === 'admin' || user?.role === 'principal';

  const fetchSubmissions = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (departmentFilter) params.department = departmentFilter;
    submissionsAPI.list(params)
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSubmissions(); }, [statusFilter, departmentFilter]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'submitted': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case 'under_review': return <Badge variant="outline"><Eye className="w-3 h-3 mr-1" />Under Review</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleReview = async (action: 'approve' | 'reject', remarks: string) => {
    if (!selectedSub) return;
    try {
      await submissionsAPI.review(selectedSub.id, action, remarks);
      toast({ title: `Submission ${action}d successfully` });
      setReviewOpen(false);
      fetchSubmissions();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submissions</h1>
        <p className="text-muted-foreground">
          {isAdminOrPrincipal ? 'Review and manage compliance proof submissions' : 'Track your submitted proofs'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_statuses">All Statuses</SelectItem>
            <SelectItem value="submitted">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {isAdminOrPrincipal && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_departments">All Departments</SelectItem>
              {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(statusFilter || departmentFilter) && (
          <Button variant="ghost" onClick={() => { setStatusFilter(''); setDepartmentFilter(''); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{submissions.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{submissions.filter(s => s.status === 'submitted').length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-500">{submissions.filter(s => s.status === 'approved').length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-500">{submissions.filter(s => s.status === 'rejected').length}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : submissions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No submissions found</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusBadge(s.status)}
                      <span className="text-sm text-muted-foreground">#{s.id}</span>
                    </div>
                    <h3 className="font-medium">{s.circular_title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span>By: <strong>{s.user_name}</strong></span>
                      {s.user_department && <span>Dept: {s.user_department}</span>}
                      <span>Category: {s.circular_category}</span>
                      <span>Submitted: {new Date(s.submitted_at).toLocaleString()}</span>
                    </div>
                    {s.remarks && <p className="text-sm mt-2 text-muted-foreground italic">"{s.remarks}"</p>}
                    {s.admin_remarks && (
                      <p className="text-sm mt-1 font-medium">
                        Admin: <span className="text-muted-foreground italic">"{s.admin_remarks}"</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {s.file_name && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={submissionsAPI.downloadUrl(s.id)} target="_blank" rel="noopener">
                          <Download className="w-4 h-4 mr-1" /> {s.file_name}
                        </a>
                      </Button>
                    )}
                    {isAdminOrPrincipal && s.status === 'submitted' && (
                      <Button size="sm" onClick={() => { setSelectedSub(s); setReviewOpen(true); }}>
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <ReviewForm submission={selectedSub} onReview={handleReview} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

function ReviewForm({ submission, onReview }: { submission: any; onReview: (action: 'approve' | 'reject', remarks: string) => void }) {
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);

  if (!submission) return null;

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(true);
    await onReview(action, remarks);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <DialogHeader><DialogTitle>Review Submission</DialogTitle></DialogHeader>
      <div className="space-y-2">
        <p className="text-sm"><strong>Circular:</strong> {submission.circular_title}</p>
        <p className="text-sm"><strong>Submitted by:</strong> {submission.user_name} ({submission.user_department})</p>
        <p className="text-sm"><strong>Date:</strong> {new Date(submission.submitted_at).toLocaleString()}</p>
        {submission.remarks && <p className="text-sm"><strong>Remarks:</strong> {submission.remarks}</p>}
        {submission.file_name && (
          <Button size="sm" variant="outline" asChild>
            <a href={submissionsAPI.downloadUrl(submission.id)} target="_blank" rel="noopener">
              <Download className="w-4 h-4 mr-1" /> View: {submission.file_name}
            </a>
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <Label>Admin Remarks</Label>
        <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional review notes..." rows={3} />
      </div>
      <DialogFooter className="gap-2">
        <Button variant="destructive" onClick={() => handleAction('reject')} disabled={loading}>
          <XCircle className="w-4 h-4 mr-1" /> Reject
        </Button>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleAction('approve')} disabled={loading}>
          <CheckCircle className="w-4 h-4 mr-1" /> Approve
        </Button>
      </DialogFooter>
    </div>
  );
}

export default Submissions;
