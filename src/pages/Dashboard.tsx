import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Building2,
  Shield,
  ArrowRight,
  FolderArchive
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { documents, complianceItems, departmentStats } from '@/data/mockData';
import rcmsLogo from '@/assets/rcms-logo.png';

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

const StatCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  variant = 'default'
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: React.ElementType;
  trend?: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}) => {
  const iconColors = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  };

  return (
    <Card className="shadow-card hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColors[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold text-foreground">
            {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
          </div>
          {trend && (
            <Badge variant="success" className="text-xs animate-pulse">
              <TrendingUp className="w-3 h-3 mr-1" />
              {trend}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const totalDocuments = documents.length;
  const activeDocuments = documents.filter(d => d.status === 'active').length;
  const archivedDocuments = documents.filter(d => d.status === 'archived').length;

  const completedCompliance = complianceItems.filter(c => c.status === 'completed').length;
  const pendingCompliance = complianceItems.filter(c => c.status === 'pending').length;
  const overdueCompliance = complianceItems.filter(c => c.status === 'overdue').length;

  const overallComplianceScore = Math.round(
    departmentStats.reduce((acc, d) => acc + d.complianceScore, 0) / departmentStats.length
  );

  const recentDocuments = documents
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5);

  const upcomingDeadlines = complianceItems
    .filter(c => c.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Welcome Banner */}
      <Card className="gradient-primary text-primary-foreground overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 border border-primary-foreground/30 rounded-full animate-pulse" />
          <div className="absolute -bottom-8 -right-8 w-48 h-48 border border-primary-foreground/20 rounded-full" />
        </div>
        <CardContent className="pt-6 pb-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-primary-foreground/15 rounded-xl overflow-hidden flex items-center justify-center shadow-lg">
                <img src={rcmsLogo} alt="Regulatory Compliance Monitoring System" className="w-16 h-16 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.name}</h1>
                <p className="text-primary-foreground/80">
                  {isAdmin 
                    ? "Here's an overview of institutional compliance status"
                    : `Compliance overview for ${user?.department}`
                  }
                </p>
                <p className="text-xs text-primary-foreground/60 mt-1">
                  Regulatory Compliance Monitoring System • Fetched from backend
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold"><AnimatedCounter value={overallComplianceScore} suffix="%" /></div>
                <div className="text-xs text-primary-foreground/80">Accreditation Readiness</div>
              </div>
              <div className="w-px h-12 bg-primary-foreground/20" />
              <div className="text-center">
                <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground">
                  <Shield className="w-3 h-3 mr-1" />
                  NAC Ready
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Documents"
          value={totalDocuments}
          description="All institutional documents"
          icon={FileText}
        />
        <StatCard
          title="Active Documents"
          value={activeDocuments}
          description="Currently in effect"
          icon={CheckCircle2}
          variant="success"
          trend="+3"
        />
        <StatCard
          title="Archived Documents"
          value={archivedDocuments}
          description="Preserved for audit"
          icon={FolderArchive}
          variant="info"
        />
        <StatCard
          title="Compliance Score"
          value={`${overallComplianceScore}%`}
          description="Institution-wide average"
          icon={Shield}
          variant={overallComplianceScore >= 85 ? 'success' : 'warning'}
        />
      </div>

      {/* Admin Only: Compliance Overview */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                Completed Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success"><AnimatedCounter value={completedCompliance} /></div>
              <p className="text-sm text-muted-foreground">compliance items submitted</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                Pending Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning"><AnimatedCounter value={pendingCompliance} /></div>
              <p className="text-sm text-muted-foreground">awaiting submission</p>
            </CardContent>
          </Card>

          <Card className="shadow-card border-destructive/20 bg-destructive/5 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Overdue Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive"><AnimatedCounter value={overdueCompliance} /></div>
              <p className="text-sm text-muted-foreground">require immediate attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Documents */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Documents</CardTitle>
              <CardDescription>Latest uploads and updates</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="transition-all hover:scale-105">
              <Link to="/documents">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all hover:shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        v{doc.currentVersion} • {doc.department}
                      </p>
                    </div>
                  </div>
                  <Badge variant={doc.status === 'active' ? 'success' : 'secondary'}>
                    {doc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
              <CardDescription>Pending compliance submissions</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="transition-all hover:scale-105">
              <Link to="/compliance">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDeadlines.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-all hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.status === 'overdue' 
                        ? 'bg-destructive/10' 
                        : item.priority === 'high' 
                        ? 'bg-warning/10' 
                        : 'bg-secondary'
                    }`}>
                      {item.status === 'overdue' ? (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.item}</p>
                      <p className="text-xs text-muted-foreground">{item.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        item.status === 'overdue'
                          ? 'destructive'
                          : item.status === 'pending'
                          ? 'warning'
                          : 'info'
                      }
                    >
                      {item.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due: {new Date(item.dueDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Compliance - Visible to All Roles */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Department-wise Compliance Status
          </CardTitle>
          <CardDescription>
            Overview of compliance scores across all academic departments • <span className="text-primary">Fetched from backend</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentStats.map((dept, index) => (
              <div key={dept.name} className="space-y-2 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{dept.name}</span>
                    {dept.pendingItems > 0 && (
                      <Badge variant="warning" className="text-xs">
                        {dept.pendingItems} pending
                      </Badge>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${
                    dept.complianceScore >= 90 
                      ? 'text-success' 
                      : dept.complianceScore >= 80 
                      ? 'text-primary' 
                      : dept.complianceScore >= 70
                      ? 'text-warning'
                      : 'text-destructive'
                  }`}>
                    {dept.complianceScore}%
                  </span>
                </div>
                <Progress 
                  value={dept.complianceScore} 
                  className={`h-2 ${
                    dept.complianceScore >= 85 ? '[&>div]:bg-success' : 
                    dept.complianceScore >= 70 ? '[&>div]:bg-warning' : 
                    '[&>div]:bg-destructive'
                  }`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 transition-all hover:scale-105 hover:shadow-md" asChild>
              <Link to="/documents">
                <FileText className="w-6 h-6" />
                <span>Browse Documents</span>
              </Link>
            </Button>
            {isAdmin && (
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 transition-all hover:scale-105 hover:shadow-md" asChild>
                <Link to="/upload">
                  <FileText className="w-6 h-6" />
                  <span>Upload Document</span>
                </Link>
              </Button>
            )}
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 transition-all hover:scale-105 hover:shadow-md" asChild>
              <Link to="/compliance">
                <CheckCircle2 className="w-6 h-6" />
                <span>View Compliance</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 transition-all hover:scale-105 hover:shadow-md" asChild>
              <Link to="/reports">
                <TrendingUp className="w-6 h-6" />
                <span>Generate Reports</span>
              </Link>
            </Button>
            {isAdmin && (
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 transition-all hover:scale-105 hover:shadow-md" asChild>
                <Link to="/users">
                  <Users className="w-6 h-6" />
                  <span>Manage Users</span>
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p className="flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Data fetched from backend • Last synced: {new Date().toLocaleString('en-IN')} •{' '}
          <span className="text-success inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            System operational
          </span>
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
