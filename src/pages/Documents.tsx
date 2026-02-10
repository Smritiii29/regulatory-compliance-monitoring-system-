import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { documents, Document, academicDepartments } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileText,
  Search,
  Download,
  Eye,
  MoreVertical,
  Archive,
  History,
  Filter,
  Plus,
  AlertCircle,
  Shield,
  GitBranch,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import documentRepositoryImage from '@/assets/document-repository.png';
import noDocumentsImage from '@/assets/no-documents.png';

const categoryLabels: Record<string, string> = {
  approval: 'Approval',
  regulation: 'Regulation',
  handbook: 'Handbook',
  curriculum: 'Curriculum',
  policy: 'Policy',
  report: 'Report',
};

const Documents = () => {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeDocuments = filteredDocuments.filter((d) => d.status === 'active');
  const archivedDocuments = filteredDocuments.filter((d) => d.status === 'archived');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Two-Column Hero Layout */}
      <div className="relative rounded-xl overflow-hidden shadow-lg bg-card border">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left Column - Title and Description */}
          <div className="p-8 flex flex-col justify-center bg-gradient-to-br from-primary/5 to-transparent">
            <h1 className="text-3xl font-bold text-foreground mb-3">Central Document Repository</h1>
            <p className="text-muted-foreground leading-relaxed">
              Institutional records with complete version history and long-term audit safety. 
              All documents are versioned and preserved for regulatory compliance.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg cursor-help">
                    <GitBranch className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Version Controlled</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Version Control:</strong> All documents maintain a complete version history. 
                    Updates create new versions while preserving the original for audit compliance.
                  </p>
                </TooltipContent>
              </Tooltip>
              <Badge variant="info" className="text-xs">Audit-Safe Storage</Badge>
            </div>
          </div>
          {/* Right Column - Contextual Image */}
          <div className="relative h-56 md:h-auto group">
            <img 
              src={documentRepositoryImage} 
              alt="Central Document Repository" 
              className="w-full h-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-card/60" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            Central repository for all institutional documents
          </p>
        </div>
        {isAdmin && (
          <Button asChild className="transition-all hover:scale-105 hover:shadow-lg">
            <Link to="/upload">
              <Plus className="w-4 h-4 mr-2" />
              Upload Document
            </Link>
          </Button>
        )}
      </div>

      {/* Compliance Notice */}
      <Alert className="border-info/30 bg-info/5">
        <Shield className="h-4 w-4 text-info" />
        <AlertDescription className="text-sm">
          <strong>Compliance Notice:</strong> Documents cannot be permanently deleted for compliance
          and audit safety. All versions are preserved and changes are tracked for regulatory review.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents by title or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents ({filteredDocuments.length})
          </CardTitle>
          <CardDescription>
            {activeDocuments.length} active, {archivedDocuments.length} archived • Versioned documents stored securely
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
              <img 
                src={noDocumentsImage} 
                alt="No documents available" 
                className="w-64 h-48 object-contain opacity-80 mb-4"
              />
              <p className="text-muted-foreground text-center max-w-md">
                No documents found matching your criteria. 
                {isAdmin && ' Upload institutional documents to begin compliance tracking.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow 
                      key={doc.id} 
                      className={`transition-all hover:shadow-md group ${
                        doc.status === 'archived' 
                          ? 'bg-muted/30 opacity-80 hover:opacity-100' 
                          : 'hover:bg-secondary/40'
                      }`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all cursor-help ${
                                doc.status === 'active' 
                                  ? 'bg-primary/10 group-hover:bg-primary/20 group-hover:shadow-sm ring-1 ring-primary/20' 
                                  : 'bg-muted/50 ring-1 ring-border'
                              }`}>
                                <FileText className={`w-5 h-5 ${
                                  doc.status === 'active' ? 'text-primary' : 'text-muted-foreground'
                                }`} />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="text-xs">{doc.status === 'active' ? 'Active document' : 'Archived for audit safety'}</p>
                            </TooltipContent>
                          </Tooltip>
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded by {doc.uploadedBy} • <span className="text-primary/80">Versioned document</span>
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{categoryLabels[doc.category]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="font-mono text-sm bg-secondary px-2 py-1 rounded cursor-help">
                              v{doc.currentVersion}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{doc.versions.length} version(s) available</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.status === 'active' ? 'success' : 'secondary'}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {doc.department}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(doc.lastUpdated).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-secondary">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowVersionHistory(false);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedDocument(doc);
                                setShowVersionHistory(true);
                              }}
                            >
                              <History className="w-4 h-4 mr-2" />
                              Version History
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Download Latest
                            </DropdownMenuItem>
                            {isAdmin && doc.status === 'active' && (
                              <DropdownMenuItem className="text-warning focus:text-warning">
                                <Archive className="w-4 h-4 mr-2" />
                                Archive Document
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Detail Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedDocument?.title}
            </DialogTitle>
            <DialogDescription>
              {showVersionHistory ? 'Version history and changes' : 'Document details and metadata'}
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && !showVersionHistory && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <p className="font-medium">{categoryLabels[selectedDocument.category]}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Version</p>
                  <p className="font-mono font-medium">v{selectedDocument.currentVersion}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={selectedDocument.status === 'active' ? 'success' : 'secondary'}>
                    {selectedDocument.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedDocument.department}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedDocument.description || 'No description available'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uploaded By</p>
                  <p className="text-sm">{selectedDocument.uploadedBy}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="text-sm">
                    {new Date(selectedDocument.lastUpdated).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="p-3 bg-info/5 border border-info/20 rounded-lg text-sm text-muted-foreground">
                <Shield className="w-4 h-4 inline mr-2 text-info" />
                Versioned document • Audit-safe storage • Fetched from backend
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1 transition-all hover:scale-[1.02]">
                  <Download className="w-4 h-4 mr-2" />
                  Download Document
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowVersionHistory(true)}
                >
                  <History className="w-4 h-4 mr-2" />
                  View Versions
                </Button>
              </div>
            </div>
          )}

          {selectedDocument && showVersionHistory && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                {selectedDocument.versions.map((version, index) => (
                  <div
                    key={version.version}
                    className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                      index === 0 ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">v{version.version}</span>
                          {index === 0 && (
                            <Badge variant="status">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {version.notes}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Uploaded by {version.uploadedBy} on{' '}
                          {new Date(version.uploadedAt).toLocaleDateString('en-IN')}
                          {' • '}{version.fileSize}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="transition-all hover:scale-105">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowVersionHistory(false)}
              >
                Back to Details
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p className="flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Versioned documents stored securely • All changes tracked for compliance
        </p>
      </div>
    </div>
  );
};

export default Documents;
