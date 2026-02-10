import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { complianceItems, departmentStats, ComplianceItem, academicDepartments } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Building2,
  TrendingUp,
  AlertCircle,
  Users,
  Wrench,
  Calendar,
  Shield,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import complianceStatusImage from '@/assets/compliance-status.png';

const statusConfig: Record<ComplianceItem['status'], { label: string; variant: 'success' | 'warning' | 'destructive' | 'info'; icon: React.ElementType }> = {
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertTriangle },
  'in-progress': { label: 'In Progress', variant: 'info', icon: Clock },
};

const priorityConfig: Record<ComplianceItem['priority'], { label: string; color: string }> = {
  high: { label: 'High', color: 'text-destructive' },
  medium: { label: 'Medium', color: 'text-warning' },
  low: { label: 'Low', color: 'text-muted-foreground' },
};

// Animated Counter Component
const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{count}{suffix}</span>;
};

const ComplianceStatus = () => {
  const { isAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const filteredItems = complianceItems.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || item.department === departmentFilter;
    return matchesStatus && matchesDepartment;
  });

  const stats = {
    completed: complianceItems.filter((i) => i.status === 'completed').length,
    pending: complianceItems.filter((i) => i.status === 'pending').length,
    overdue: complianceItems.filter((i) => i.status === 'overdue').length,
    inProgress: complianceItems.filter((i) => i.status === 'in-progress').length,
  };

  const overallScore = Math.round(
    departmentStats.reduce((acc, d) => acc + d.complianceScore, 0) / departmentStats.length
  );

  // Risk flags with proper departments
  const riskFlags = [
    {
      type: 'Faculty Shortage',
      department: 'Mechanical Engineering',
      severity: 'high',
      description: 'Faculty-student ratio below NHERC requirements',
    },
    {
      type: 'Infrastructure Gap',
      department: 'Biomedical Engineering',
      severity: 'medium',
      description: 'Laboratory equipment inventory pending update',
    },
    {
      type: 'Delayed Submission',
      department: 'Electrical and Electronics Engineering',
      severity: 'high',
      description: 'Annual budget utilization report overdue by 5 days',
    },
  ];

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Two-Column Hero Layout */}
      <div className="relative rounded-xl overflow-hidden shadow-lg bg-card border animate-fade-in">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left Column - Title and Description */}
          <div className="p-8 flex flex-col justify-center bg-gradient-to-br from-primary/5 to-transparent">
            <h1 className="text-3xl font-bold text-foreground mb-3">Compliance Status</h1>
            <p className="text-muted-foreground leading-relaxed">
              Department-wise monitoring and risk assessment dashboard. Track compliance progress, 
              identify gaps, and ensure accreditation readiness across all academic departments.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <Badge variant="success" className="text-xs">Real-time Tracking</Badge>
              <Badge variant="info" className="text-xs">Risk Assessment</Badge>
            </div>
          </div>
          {/* Right Column - Contextual Image */}
          <div className="relative h-56 md:h-auto">
            <img 
              src={complianceStatusImage} 
              alt="Compliance Status & Risk Monitoring" 
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-card/60" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-card hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold"><AnimatedCounter value={overallScore} suffix="%" /></p>
                <p className="text-sm text-muted-foreground">Overall Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success"><AnimatedCounter value={stats.completed} /></p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-info"><AnimatedCounter value={stats.inProgress} /></p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning"><AnimatedCounter value={stats.pending} /></p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-destructive/20 bg-destructive/5 hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive"><AnimatedCounter value={stats.overdue} /></p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Flags (Admin Only) */}
      {isAdmin && riskFlags.length > 0 && (
        <Alert className="border-destructive/30 bg-destructive/5 animate-fade-in">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <strong className="text-destructive">Attention Required:</strong> {riskFlags.length}{' '}
            compliance risks identified that need immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {isAdmin && (
        <Card className="shadow-card animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Risk Flags
            </CardTitle>
            <CardDescription>
              Critical compliance gaps requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {riskFlags.map((flag, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-4 rounded-lg border cursor-help transition-all hover:shadow-md hover:scale-[1.02] ${
                        flag.severity === 'high'
                          ? 'border-destructive/30 bg-destructive/5'
                          : 'border-warning/30 bg-warning/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {flag.type === 'Faculty Shortage' ? (
                          <Users className="w-5 h-5 text-destructive" />
                        ) : flag.type === 'Infrastructure Gap' ? (
                          <Wrench className="w-5 h-5 text-warning" />
                        ) : (
                          <Calendar className="w-5 h-5 text-destructive" />
                        )}
                        <span className="font-medium">{flag.type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{flag.description}</p>
                      <Badge
                        variant={flag.severity === 'high' ? 'destructive' : 'warning'}
                        className="text-xs"
                      >
                        {flag.department}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-sm">
                      <strong>{flag.type}:</strong> {flag.description}. 
                      Contact {flag.department} for immediate action.
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department Progress (Admin Only) */}
      {isAdmin && (
        <Card className="shadow-card animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Department-wise Compliance Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentStats.map((dept, index) => (
                <div key={dept.name} className="space-y-2 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{dept.name}</span>
                      {dept.pendingItems > 0 && (
                        <Badge variant="warning" className="text-xs">
                          {dept.pendingItems} pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {dept.activeDocuments}/{dept.totalDocuments} docs
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          dept.complianceScore >= 90
                            ? 'text-success'
                            : dept.complianceScore >= 80
                            ? 'text-primary'
                            : dept.complianceScore >= 70
                            ? 'text-warning'
                            : 'text-destructive'
                        }`}
                      >
                        {dept.complianceScore}%
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={dept.complianceScore} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
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

      {/* Compliance Items Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Compliance Items</CardTitle>
          <CardDescription>
            {filteredItems.length} items • Click on an item to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compliance Item</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No compliance items found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const statusInfo = statusConfig[item.status];
                    const StatusIcon = statusInfo.icon;
                    const priorityInfo = priorityConfig[item.priority];

                    return (
                      <TableRow key={item.id} className="hover:bg-secondary/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                                item.status === 'overdue'
                                  ? 'bg-destructive/10'
                                  : item.status === 'completed'
                                  ? 'bg-success/10'
                                  : 'bg-secondary'
                              }`}
                            >
                              <StatusIcon
                                className={`w-5 h-5 ${
                                  item.status === 'overdue'
                                    ? 'text-destructive'
                                    : item.status === 'completed'
                                    ? 'text-success'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            </div>
                            <span className="font-medium">{item.item}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {item.department}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(item.dueDate).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.submittedDate
                            ? new Date(item.submittedDate).toLocaleDateString('en-IN')
                            : '-'}
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
        <p className="flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Compliance data synced from department submissions • Email notifications sent for overdue items
        </p>
      </div>
    </div>
  );
};

export default ComplianceStatus;
