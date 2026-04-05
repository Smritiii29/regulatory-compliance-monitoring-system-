import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { submissionsAPI } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  Filter,
  Search,
  X,
  XCircle,
} from 'lucide-react';

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE'];

const Submissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [facultySearch, setFacultySearch] = useState('');
  const [viewMode, setViewMode] = useState('all');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);

  const isAdminOrPrincipal = user?.role === 'admin' || user?.role === 'principal';

  const fetchSubmissions = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter && !statusFilter.startsWith('all_')) params.status = statusFilter;
    if (departmentFilter && !departmentFilter.startsWith('all_')) params.department = departmentFilter;

    submissionsAPI.list(params)
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, departmentFilter]);

  const visibleSubmissions = useMemo(() => {
    if (!facultySearch.trim()) return submissions;
    const pattern = facultySearch.trim().toLowerCase();
    return submissions.filter((submission) =>
      `${submission.user_name || ''} ${submission.user_department || ''} ${submission.circular_title || ''} ${submission.circular_category || ''}`
        .toLowerCase()
        .includes(pattern)
    );
  }, [facultySearch, submissions]);

  const groupedByDepartment = useMemo(() => {
    return visibleSubmissions.reduce((groups: Record<string, any[]>, submission) => {
      const key = submission.user_department || 'Unassigned Department';
      groups[key] = groups[key] || [];
      groups[key].push(submission);
      return groups;
    }, {});
  }, [visibleSubmissions]);

  const groupedByFaculty = useMemo(() => {
    return visibleSubmissions.reduce((groups: Record<string, any[]>, submission) => {
      const facultyName = submission.user_name || 'Unknown Faculty';
      const key = `${facultyName}__${submission.user_department || 'No Department'}`;
      groups[key] = groups[key] || [];
      groups[key].push(submission);
      return groups;
    }, {});
  }, [visibleSubmissions]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      case 'submitted':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending Review</Badge>;
      case 'under_review':
        return <Badge variant="outline"><Eye className="mr-1 h-3 w-3" />Under Review</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  const handleDownload = async (submission: any) => {
    try {
      const blob = await submissionsAPI.download(submission.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = submission.file_name || `submission-${submission.id}`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: 'Download failed', description: err.message, variant: 'destructive' });
    }
  };

  const renderSubmissionCard = (submission: any) => (
    <Card key={submission.id} className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {statusBadge(submission.status)}
              <Badge variant="outline">{submission.circular_category || 'Uncategorized'}</Badge>
              {submission.user_department && (
                <Badge variant="secondary">{submission.user_department}</Badge>
              )}
              <span className="text-xs text-muted-foreground">#{submission.id}</span>
            </div>

            <h3 className="font-medium">{submission.circular_title}</h3>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                Faculty: <strong>{submission.user_name}</strong>
              </span>
              {submission.user_department && <span>Dept: {submission.user_department}</span>}
              <span>Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
            </div>

            {submission.remarks && (
              <p className="mt-2 text-sm italic text-muted-foreground">"{submission.remarks}"</p>
            )}

            {submission.admin_remarks && (
              <p className="mt-1 text-sm font-medium">
                Admin: <span className="italic text-muted-foreground">"{submission.admin_remarks}"</span>
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            {submission.file_name && (
              <Button size="sm" variant="outline" onClick={() => handleDownload(submission)}>
                <Download className="mr-1 h-4 w-4" />
                Download
              </Button>
            )}

            {isAdminOrPrincipal && submission.status === 'submitted' && (
              <Button
                size="sm"
                onClick={() => {
                  setSelectedSub(submission);
                  setReviewOpen(true);
                }}
              >
                <Eye className="mr-1 h-4 w-4" />
                Review
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderGroupedView = (groups: Record<string, any[]>, type: 'department' | 'faculty') => {
    const entries = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));

    if (!entries.length) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No submissions found
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {entries.map(([key, items]) => {
          const [facultyName, facultyDepartment] = key.split('__');
          const title = type === 'department' ? key : facultyName;
          const subtitle = type === 'faculty' ? facultyDepartment : `${items.length} submissions`;

          return (
            <Card key={key}>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {type === 'faculty' ? `Department: ${subtitle}` : subtitle}
                    </p>
                  </div>
                  <Badge variant="outline">{items.length} submissions</Badge>
                </div>
                <div className="space-y-3">
                  {items.map(renderSubmissionCard)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submissions</h1>
        <p className="text-muted-foreground">
          {isAdminOrPrincipal
            ? 'Review, download, and organize faculty proof submissions'
            : 'Track your submitted proofs'}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={facultySearch}
            onChange={(e) => setFacultySearch(e.target.value)}
            placeholder={isAdminOrPrincipal ? 'Search by faculty, department, title...' : 'Search submissions...'}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_statuses">All Statuses</SelectItem>
            <SelectItem value="submitted">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {isAdminOrPrincipal && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_departments">All Departments</SelectItem>
              {DEPARTMENTS.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(statusFilter || departmentFilter || facultySearch) && (
          <Button
            variant="ghost"
            onClick={() => {
              setStatusFilter('');
              setDepartmentFilter('');
              setFacultySearch('');
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pb-4 pt-4 text-center">
            <p className="text-2xl font-bold">{visibleSubmissions.length}</p>
            <p className="text-xs text-muted-foreground">Visible</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4 text-center">
            <p className="text-2xl font-bold text-amber-500">
              {visibleSubmissions.filter((submission) => submission.status === 'submitted').length}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4 text-center">
            <p className="text-2xl font-bold text-green-500">
              {visibleSubmissions.filter((submission) => submission.status === 'approved').length}
            </p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4 text-center">
            <p className="text-2xl font-bold text-red-500">
              {visibleSubmissions.filter((submission) => submission.status === 'rejected').length}
            </p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : isAdminOrPrincipal ? (
        <Tabs value={viewMode} onValueChange={setViewMode} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Submissions</TabsTrigger>
            <TabsTrigger value="department">By Department</TabsTrigger>
            <TabsTrigger value="faculty">By Faculty</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {visibleSubmissions.length ? visibleSubmissions.map(renderSubmissionCard) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No submissions found
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="department">
            {renderGroupedView(groupedByDepartment, 'department')}
          </TabsContent>

          <TabsContent value="faculty">
            {renderGroupedView(groupedByFaculty, 'faculty')}
          </TabsContent>
        </Tabs>
      ) : visibleSubmissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No submissions found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleSubmissions.map(renderSubmissionCard)}
        </div>
      )}

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <ReviewForm
            submission={selectedSub}
            onReview={handleReview}
            onDownload={handleDownload}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

function ReviewForm({
  submission,
  onReview,
  onDownload,
}: {
  submission: any;
  onReview: (action: 'approve' | 'reject', remarks: string) => void;
  onDownload: (submission: any) => Promise<void>;
}) {
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
      <DialogHeader>
        <DialogTitle>Review Submission</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <p className="text-sm"><strong>Circular:</strong> {submission.circular_title}</p>
        <p className="text-sm"><strong>Faculty:</strong> {submission.user_name}</p>
        <p className="text-sm"><strong>Department:</strong> {submission.user_department}</p>
        <p className="text-sm"><strong>Category:</strong> {submission.circular_category}</p>
        <p className="text-sm"><strong>Date:</strong> {new Date(submission.submitted_at).toLocaleString()}</p>
        {submission.remarks && <p className="text-sm"><strong>Remarks:</strong> {submission.remarks}</p>}
        {submission.file_name && (
          <Button size="sm" variant="outline" onClick={() => onDownload(submission)}>
            <Download className="mr-1 h-4 w-4" />
            Download: {submission.file_name}
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <Label>Admin Remarks</Label>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Optional review notes..."
          rows={3}
        />
      </div>
      <DialogFooter className="gap-2">
        <Button variant="destructive" onClick={() => handleAction('reject')} disabled={loading}>
          <XCircle className="mr-1 h-4 w-4" />
          Reject
        </Button>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleAction('approve')} disabled={loading}>
          <CheckCircle className="mr-1 h-4 w-4" />
          Approve
        </Button>
      </DialogFooter>
    </div>
  );
}

export default Submissions;
