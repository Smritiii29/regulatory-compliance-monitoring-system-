import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { circularsAPI } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

const CATEGORIES = [
  'Regulation Update',
  'Hackathon Event',
  'Workshop / Seminar',
  'Curriculum Update',
  'Infrastructure',
  'Faculty Development',
  'Student Activities',
  'Audit & Accreditation',
  'Examination',
  'Research & Innovation',
  'Placement & Internship',
  'Other',
];

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE'];
const REGULATION_TYPES = ['NAAC', 'NHERC', 'UGC', 'AICTE', 'NBA', 'Other'];

const Circulars = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [circulars, setCirculars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedCircular, setSelectedCircular] = useState<any>(null);
  const [summary, setSummary] = useState('');
  const [summarySource, setSummarySource] = useState<'ai' | 'fallback' | 'cache' | ''>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  const isAdminOrPrincipal = user?.role === 'admin' || user?.role === 'principal';

  const fetchCirculars = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    if (statusFilter) params.status = statusFilter;

    circularsAPI.list(params)
      .then(setCirculars)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCirculars();
  }, [categoryFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCirculars();
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const isSummarizableFile = (fileName?: string) => {
    if (!fileName) return false;
    const normalized = fileName.toLowerCase();
    return normalized.endsWith('.pdf') || normalized.endsWith('.docx');
  };

  const markdownToHtml = (markdown: string) => {
    if (!markdown) return '<p>No summary generated.</p>';

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const lines = markdown.split(/\r?\n/);
    let html = '';
    let inList = false;
    let paragraphBuffer = '';

    const flushParagraph = () => {
      if (!paragraphBuffer.trim()) return;
      html += `<p class="my-2 text-sm leading-6 text-slate-700">${escapeHtml(paragraphBuffer.trim())}</p>`;
      paragraphBuffer = '';
    };

    const closeList = () => {
      if (!inList) return;
      html += '</ul>';
      inList = false;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        flushParagraph();
        closeList();
        continue;
      }

      const headingMatch = line.match(/^##\s+(.*)$/);
      const bulletMatch = line.match(/^[-*+]\s+(.*)$/);

      if (headingMatch) {
        flushParagraph();
        closeList();
        html += `<h3 class="mt-6 mb-2 border-b border-primary pb-2 text-base font-bold text-slate-800">${escapeHtml(headingMatch[1].trim())}</h3>`;
        continue;
      }

      if (bulletMatch) {
        flushParagraph();
        if (!inList) {
          inList = true;
          html += '<ul class="my-2 ml-5 list-disc space-y-1">';
        }
        html += `<li class="text-sm leading-6 text-slate-700">${escapeHtml(bulletMatch[1].trim())}</li>`;
        continue;
      }

      paragraphBuffer = paragraphBuffer ? `${paragraphBuffer} ${line}` : line;
    }

    flushParagraph();
    closeList();
    return html;
  };

  const renderSummary = () => (
    <div className="prose prose-sm max-w-none text-sm leading-relaxed text-slate-900">
      <div
        className="max-w-none rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(summary) }}
      />
    </div>
  );

  const deleteCircular = async (id: number) => {
    if (!confirm('Delete this circular?')) return;

    try {
      await circularsAPI.delete(id);
      toast({ title: 'Circular deleted' });
      fetchCirculars();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDownload = async (id: number, fileName: string) => {
    try {
      const blob = await circularsAPI.download(id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || 'circular.pdf';
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: 'Download failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleSummarize = async (circularId: number) => {
    setSummary('');
    setSummarySource('');
    setSummaryLoading(true);
    setSummaryDialogOpen(true);

    try {
      const data = await circularsAPI.summarize(circularId);
      setSummary(data.summary || '');
      setSummarySource(data.source || '');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to generate summary',
        variant: 'destructive',
      });
      setSummaryDialogOpen(false);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Circulars</h1>
          <p className="text-muted-foreground">Manage and track compliance circulars</p>
        </div>
        {isAdminOrPrincipal && (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Circular
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <UploadCircularForm
                onSuccess={() => {
                  setUploadOpen(false);
                  fetchCirculars();
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="min-w-[200px] flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search circulars..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_categories">All Categories</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_statuses">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        {(categoryFilter || statusFilter || search) && (
          <Button
            variant="ghost"
            onClick={() => {
              setCategoryFilter('');
              setStatusFilter('');
              setSearch('');
            }}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : circulars.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No circulars found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.isArray(circulars) && circulars.map((circular) => (
            <Card key={circular.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {statusIcon(circular.status)}
                      <h3 className="truncate font-semibold">{circular.title}</h3>
                    </div>
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {circular.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Badge>{circular.category}</Badge>
                      {circular.regulation_type && (
                        <Badge variant="outline">{circular.regulation_type}</Badge>
                      )}
                      <Badge variant={priorityColor(circular.priority) as any}>
                        {circular.priority} priority
                      </Badge>
                      {circular.deadline && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(circular.deadline).toLocaleDateString()}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {circular.target_departments === 'all'
                          ? 'All Depts'
                          : circular.target_departments}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>By {circular.uploader_name}</span>
                      <span>{new Date(circular.created_at).toLocaleDateString()}</span>
                      <span>
                        {circular.submission_count} submissions ({circular.approved_count} approved)
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {circular.file_path && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(circular.id, circular.file_name)}
                      >
                        <Download className="mr-1 h-4 w-4" />
                        Download
                      </Button>
                    )}

                    {circular.file_path && isSummarizableFile(circular.file_name) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSummarize(circular.id)}
                        disabled={summaryLoading}
                      >
                        <FileText className="mr-1 h-4 w-4" />
                        Summarize
                      </Button>
                    )}

                    {!isAdminOrPrincipal && circular.status === 'active' && !circular.my_submission && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCircular(circular);
                          setSubmitOpen(true);
                        }}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        Submit Proof
                      </Button>
                    )}

                    {circular.my_submission && (
                      <Badge
                        variant={
                          circular.my_submission.status === 'approved'
                            ? 'default'
                            : circular.my_submission.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {circular.my_submission.status}
                      </Badge>
                    )}

                    {isAdminOrPrincipal && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteCircular(circular.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <SubmitProofForm
            circular={selectedCircular}
            onSuccess={() => {
              setSubmitOpen(false);
              fetchCirculars();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={summaryDialogOpen}
          onOpenChange={(open) => {
          setSummaryDialogOpen(open);
          if (!open) {
            setSummary('');
            setSummarySource('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Summary</DialogTitle>
            <DialogDescription>
              {summarySource === 'ai' && 'AI-generated compliance summary for the selected regulatory document'}
              {summarySource === 'fallback' && 'Generated from extracted document text because AI summary quota is currently unavailable'}
              {summarySource === 'cache' && 'Cached summary for the selected regulatory document'}
              {!summarySource && 'Generating a compliance summary for the selected regulatory document'}
            </DialogDescription>
          </DialogHeader>
          {summaryLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
              <span className="ml-2">Generating summary...</span>
            </div>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto p-2 scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-primary/50">
              {renderSummary()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function UploadCircularForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [regulationType, setRegulationType] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [targetDepts, setTargetDepts] = useState('all');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (category) formData.append('category', category);
      if (regulationType) formData.append('regulation_type', regulationType);
      if (deadline) formData.append('deadline', deadline);
      formData.append('priority', priority);
      formData.append('academic_year', academicYear);
      formData.append(
        'target_departments',
        targetDepts === 'all' ? 'all' : selectedDepts.join(',')
      );
      if (file) formData.append('file', file);

      await circularsAPI.create(formData);
      toast({ title: 'Circular uploaded successfully' });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Upload New Circular</DialogTitle>
      </DialogHeader>

      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Circular title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detailed description..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category (auto-detected if blank)</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Auto-detect" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Regulation Type</Label>
          <Select value={regulationType} onValueChange={setRegulationType}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {REGULATION_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Deadline</Label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Academic Year</Label>
          <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Target Departments</Label>
        <Select value={targetDepts} onValueChange={setTargetDepts}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="specific">Specific Departments</SelectItem>
          </SelectContent>
        </Select>

        {targetDepts === 'specific' && (
          <div className="mt-2 flex flex-wrap gap-2">
            {DEPARTMENTS.map((department) => (
              <Badge
                key={department}
                variant={selectedDepts.includes(department) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() =>
                  setSelectedDepts((prev) =>
                    prev.includes(department)
                      ? prev.filter((value) => value !== department)
                      : [...prev, department]
                  )
                }
              >
                {department}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Attach File (PDF, DOC, etc.)</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload Circular'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function SubmitProofForm({ circular, onSuccess }: { circular: any; onSuccess: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circular) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('circular_id', String(circular.id));
      formData.append('remarks', remarks);
      if (file) formData.append('file', file);

      const { submissionsAPI } = await import('@/services/api');
      await submissionsAPI.create(formData);
      toast({ title: 'Proof submitted successfully' });
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!circular) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Submit Proof</DialogTitle>
      </DialogHeader>

      <p className="text-sm text-muted-foreground">
        Submitting for: <strong>{circular.title}</strong>
      </p>

      <div className="space-y-2">
        <Label>Remarks</Label>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add any remarks..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Attach Proof (PDF, DOC, images, etc.)</Label>
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Proof'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default Circulars;
