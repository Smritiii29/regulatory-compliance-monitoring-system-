import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { circularsAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Filter, Upload, FileText, Calendar, AlertTriangle,
  CheckCircle, Clock, Download, Plus, Trash2, X
} from 'lucide-react';

const CATEGORIES = [
  'Regulation Update', 'Hackathon Event', 'Workshop / Seminar',
  'Curriculum Update', 'Infrastructure', 'Faculty Development',
  'Student Activities', 'Audit & Accreditation', 'Examination',
  'Research & Innovation', 'Placement & Internship', 'Other'
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

  useEffect(() => { fetchCirculars(); }, [categoryFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCirculars();
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'active': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

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
              <Button><Plus className="w-4 h-4 mr-2" /> Upload Circular</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <UploadCircularForm onSuccess={() => { setUploadOpen(false); fetchCirculars(); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search circulars..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </form>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_categories">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_statuses">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        {(categoryFilter || statusFilter || search) && (
          <Button variant="ghost" onClick={() => { setCategoryFilter(''); setStatusFilter(''); setSearch(''); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Circular List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : circulars.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No circulars found</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {circulars.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(c.status)}
                      <h3 className="font-semibold truncate">{c.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{c.category}</Badge>
                      {c.regulation_type && <Badge variant="outline">{c.regulation_type}</Badge>}
                      <Badge variant={priorityColor(c.priority) as any}>{c.priority} priority</Badge>
                      {c.deadline && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(c.deadline).toLocaleDateString()}
                        </Badge>
                      )}
                      <Badge variant="secondary">{c.target_departments === 'all' ? 'All Depts' : c.target_departments}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>By {c.uploader_name}</span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      <span>{c.submission_count} submissions ({c.approved_count} approved)</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {c.file_path && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={circularsAPI.downloadUrl(c.id)} target="_blank" rel="noopener">
                          <Download className="w-4 h-4 mr-1" /> Download
                        </a>
                      </Button>
                    )}
                    {/* Submit proof button for non-admin */}
                    {!isAdminOrPrincipal && c.status === 'active' && !c.my_submission && (
                      <Button size="sm" onClick={() => { setSelectedCircular(c); setSubmitOpen(true); }}>
                        <Upload className="w-4 h-4 mr-1" /> Submit Proof
                      </Button>
                    )}
                    {c.my_submission && (
                      <Badge variant={c.my_submission.status === 'approved' ? 'default' : c.my_submission.status === 'rejected' ? 'destructive' : 'secondary'}>
                        {c.my_submission.status}
                      </Badge>
                    )}
                    {isAdminOrPrincipal && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCircular(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit Proof Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <SubmitProofForm circular={selectedCircular} onSuccess={() => { setSubmitOpen(false); fetchCirculars(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Upload Circular Form ─────────────────────────────────────────────

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
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      if (category) fd.append('category', category);
      if (regulationType) fd.append('regulation_type', regulationType);
      if (deadline) fd.append('deadline', deadline);
      fd.append('priority', priority);
      fd.append('academic_year', academicYear);
      fd.append('target_departments', targetDepts === 'all' ? 'all' : selectedDepts.join(','));
      if (file) fd.append('file', file);

      await circularsAPI.create(fd);
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
      <DialogHeader><DialogTitle>Upload New Circular</DialogTitle></DialogHeader>

      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Circular title" required />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description..." rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category (auto-detected if blank)</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Regulation Type</Label>
          <Select value={regulationType} onValueChange={setRegulationType}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{REGULATION_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Deadline</Label>
          <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Academic Year</Label>
          <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Target Departments</Label>
        <Select value={targetDepts} onValueChange={setTargetDepts}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="specific">Specific Departments</SelectItem>
          </SelectContent>
        </Select>
        {targetDepts === 'specific' && (
          <div className="flex flex-wrap gap-2 mt-2">
            {DEPARTMENTS.map(d => (
              <Badge key={d} variant={selectedDepts.includes(d) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedDepts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}>
                {d}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Attach File (PDF, DOC, etc.)</Label>
        <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload Circular'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Submit Proof Form ────────────────────────────────────────────────

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
      const fd = new FormData();
      fd.append('circular_id', String(circular.id));
      fd.append('remarks', remarks);
      if (file) fd.append('file', file);

      const { submissionsAPI } = await import('@/services/api');
      await submissionsAPI.create(fd);
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
      <DialogHeader><DialogTitle>Submit Proof</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">Submitting for: <strong>{circular.title}</strong></p>

      <div className="space-y-2">
        <Label>Remarks</Label>
        <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add any remarks..." rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Attach Proof (PDF, DOC, images, etc.)</Label>
        <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
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
