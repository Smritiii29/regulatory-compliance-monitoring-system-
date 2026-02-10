import { useState } from 'react';
import { activityLog, academicDepartments, ActivityLogEntry } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Upload,
  RefreshCw,
  Archive,
  Eye,
  Download,
  Shield,
  Filter,
  History,
} from 'lucide-react';
import complianceHubImage from '@/assets/compliance-hub.png';

const actionConfig: Record<ActivityLogEntry['action'], { label: string; icon: React.ElementType; variant: 'default' | 'success' | 'warning' | 'info' | 'secondary' }> = {
  upload: { label: 'Upload', icon: Upload, variant: 'success' },
  update: { label: 'Update', icon: RefreshCw, variant: 'info' },
  archive: { label: 'Archive', icon: Archive, variant: 'warning' },
  view: { label: 'View', icon: Eye, variant: 'secondary' },
  download: { label: 'Download', icon: Download, variant: 'default' },
};

const ActivityLog = () => {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const filteredLog = activityLog.filter((entry) => {
    const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
    const matchesDepartment = departmentFilter === 'all' || entry.department === departmentFilter;
    return matchesAction && matchesDepartment;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Two-Column Hero Layout */}
      <div className="relative rounded-xl overflow-hidden shadow-lg bg-card border">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left Column - Title and Description */}
          <div className="p-8 flex flex-col justify-center bg-gradient-to-br from-primary/5 to-transparent">
            <h1 className="text-3xl font-bold text-foreground mb-3">Activity Log</h1>
            <p className="text-muted-foreground leading-relaxed">
              Complete audit trail of all system actions. Every upload, update, archive, and access 
              is recorded for regulatory traceability and accreditation review.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Badge variant="info" className="text-xs">Immutable Records</Badge>
              <Badge variant="secondary" className="text-xs">Audit-Safe</Badge>
            </div>
          </div>
          {/* Right Column - Contextual Image */}
          <div className="relative h-56 md:h-auto">
            <img 
              src={complianceHubImage} 
              alt="Compliance Hub - Audit Traceability" 
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-card/60" />
          </div>
        </div>
      </div>

      {/* Audit Trail Notice */}
      <Alert className="border-primary/30 bg-primary/5 animate-fade-in">
        <Shield className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Audit Traceability:</strong> All actions are recorded for audit traceability and accreditation review. 
          This log is immutable and maintained for regulatory compliance.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="download">Download</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {academicDepartments.map((dept) => (
                  <SelectItem key={dept.abbreviation} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            System Activity Log
          </CardTitle>
          <CardDescription>
            {filteredLog.length} records • Showing all tracked actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No activity records found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLog.map((entry) => {
                    const config = actionConfig[entry.action];
                    const ActionIcon = config.icon;
                    return (
                      <TableRow key={entry.id} className="hover:bg-secondary/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              entry.action === 'upload' ? 'bg-success/10' :
                              entry.action === 'update' ? 'bg-info/10' :
                              entry.action === 'archive' ? 'bg-warning/10' :
                              'bg-secondary'
                            }`}>
                              <ActionIcon className={`w-4 h-4 ${
                                entry.action === 'upload' ? 'text-success' :
                                entry.action === 'update' ? 'text-info' :
                                entry.action === 'archive' ? 'text-warning' :
                                'text-muted-foreground'
                              }`} />
                            </div>
                            <Badge variant={config.variant}>{config.label}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{entry.documentName}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">
                            v{entry.version}
                          </span>
                        </TableCell>
                        <TableCell>{entry.performedBy}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {entry.department}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>
          <span className="inline-flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Audit-safe storage
          </span>
          {' • '}
          All records are immutable and preserved for compliance
        </p>
      </div>
    </div>
  );
};

export default ActivityLog;
