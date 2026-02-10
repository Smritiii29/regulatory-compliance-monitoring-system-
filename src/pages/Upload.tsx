import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload as UploadIcon,
  FileText,
  Info,
  CheckCircle2,
  ArrowLeft,
  File,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Navigate, Link } from 'react-router-dom';

const categories = [
  { value: 'approval', label: 'Approval Documents' },
  { value: 'regulation', label: 'Regulatory Documents' },
  { value: 'handbook', label: 'Handbooks & Manuals' },
  { value: 'curriculum', label: 'Curriculum Documents' },
  { value: 'policy', label: 'Policy Documents' },
  { value: 'report', label: 'Reports & Assessments' },
];

const departments = [
  'Administration',
  'Principal Office',
  'Computer Science & Engineering',
  'Mechanical Engineering',
  'Electronics & Communication',
  'Civil Engineering',
  'Human Resources',
  'Finance',
];

const Upload = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    department: user?.department || '',
    description: '',
    notes: '',
  });

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/documents" replace />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!formData.title || !formData.category || !formData.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsUploading(true);

    // Simulate upload
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.success('Document uploaded successfully', {
      description: `${formData.title} has been added to the repository as version 1.0`,
    });

    setIsUploading(false);
    navigate('/documents');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/documents">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Upload Document</h1>
          <p className="text-muted-foreground">
            Add a new document to the central repository
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-info/30 bg-info/5">
        <Info className="h-4 w-4 text-info" />
        <AlertDescription className="text-sm">
          <strong>Versioning:</strong> Uploading a new document creates version 1.0. To update an
          existing document, use the "Update Document" option in the Documents page to create a new
          version.
        </AlertDescription>
      </Alert>

      {/* Upload Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Document Details
          </CardTitle>
          <CardDescription>
            Enter the document metadata and upload the file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">Document File (PDF only) *</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file
                    ? 'border-success bg-success/5'
                    : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                      <File className="w-6 h-6 text-success" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="file" className="cursor-pointer">
                    <UploadIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF files only, max 50MB
                    </p>
                    <input
                      id="file"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                placeholder="e.g., NHERC Approval Letter 2024"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Category & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the document..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Version Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Version Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes about this version (e.g., Initial upload, changes made)..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Version Info */}
            <div className="p-4 rounded-lg bg-secondary/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Auto-assigned Version: 1.0</p>
                <p className="text-xs text-muted-foreground">
                  New documents automatically start at version 1.0
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/documents')}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isUploading}>
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  <>
                    <UploadIcon className="w-4 h-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>
          Documents are stored securely with version control • Email notification will be sent to
          relevant stakeholders
        </p>
      </div>
    </div>
  );
};

export default Upload;
