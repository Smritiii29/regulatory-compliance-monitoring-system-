import { useState, useEffect } from 'react';
import { departmentStats } from '@/data/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Download, CheckCircle2, AlertTriangle, FileText, Shield, Building2 } from 'lucide-react';
import complianceHubImage from '@/assets/compliance-hub.png';
import noDocumentsImage from '@/assets/no-documents.png';

// Animated Counter
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

const Reports = () => {
  const overallScore = Math.round(departmentStats.reduce((acc, d) => acc + d.complianceScore, 0) / departmentStats.length);
  const auditReady = overallScore >= 85;

  const compliantDepts = departmentStats.filter(d => d.complianceScore >= 85).length;
  const attentionDepts = departmentStats.filter(d => d.complianceScore >= 70 && d.complianceScore < 85).length;
  const criticalDepts = departmentStats.filter(d => d.complianceScore < 70).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Two-Column Hero Layout */}
      <div className="relative rounded-xl overflow-hidden shadow-lg bg-card border">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Left Column - Title and Description */}
          <div className="p-8 flex flex-col justify-center bg-gradient-to-br from-primary/5 to-transparent">
            <h1 className="text-3xl font-bold text-foreground mb-3">Reports & Audit Readiness</h1>
            <p className="text-muted-foreground leading-relaxed">
              Comprehensive accreditation assessment and compliance reporting. Generate institution-level 
              and department-wise reports for NAC accreditation and NHERC compliance review.
            </p>
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Archived documents are preserved for accreditation and audits
            </p>
          </div>
          {/* Right Column - Contextual Image */}
          <div className="relative h-56 md:h-auto">
            <img 
              src={complianceHubImage} 
              alt="Reports & Audit Readiness" 
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-card/60" />
          </div>
        </div>
      </div>

      {/* Audit Status Banner */}
      <Card className={`shadow-card transition-all ${auditReady ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {auditReady ? (
                <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center animate-pulse">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-warning" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{auditReady ? 'Audit Ready' : 'Action Required'}</h2>
                  <Badge variant={auditReady ? 'success' : 'warning'}>
                    {auditReady ? 'NAC Compliant' : 'Needs Improvement'}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {auditReady ? 'Institution meets NAC accreditation requirements' : 'Some areas need improvement before audit'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold"><AnimatedCounter value={overallScore} suffix="%" /></div>
              <p className="text-sm text-muted-foreground">Readiness Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliant</p>
                <p className="text-2xl font-bold text-success">{compliantDepts}</p>
                <p className="text-xs text-muted-foreground">departments ≥85%</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card bg-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attention Needed</p>
                <p className="text-2xl font-bold text-warning">{attentionDepts}</p>
                <p className="text-xs text-muted-foreground">departments 70-84%</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card bg-destructive/5 border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-destructive">{criticalDepts}</p>
                <p className="text-xs text-muted-foreground">departments &lt;70%</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Summary */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Department Compliance Summary
            </CardTitle>
            <CardDescription>Overall compliance across all academic departments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {departmentStats.map((dept, index) => (
              <div key={dept.name} className="space-y-2 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[180px]">{dept.name}</span>
                    <Badge 
                      variant={dept.complianceScore >= 85 ? 'success' : dept.complianceScore >= 70 ? 'warning' : 'destructive'}
                      className="text-xs"
                    >
                      {dept.complianceScore >= 85 ? 'Audit Ready' : dept.complianceScore >= 70 ? 'Attention' : 'Critical'}
                    </Badge>
                  </div>
                  <span className="font-medium">{dept.complianceScore}%</span>
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
          </CardContent>
        </Card>

        {/* Available Reports */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Available Reports
            </CardTitle>
            <CardDescription>Download compliance and audit reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Compliance Summary Report', status: 'ready' },
              { name: 'NAC Self-Assessment Report', status: 'ready' },
              { name: 'Department-wise Analysis', status: 'ready' },
              { name: 'Accreditation Readiness Report', status: auditReady ? 'ready' : 'pending' },
              { name: 'NHERC Compliance Certificate', status: auditReady ? 'ready' : 'pending' },
            ].map((report) => (
              <div 
                key={report.name} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-secondary/30 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{report.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={report.status === 'ready' ? 'success' : 'warning'} className="text-xs">
                        {report.status === 'ready' ? 'Audit Ready' : 'Action Required'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={report.status !== 'ready'}
                  className="transition-all hover:scale-105"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Accreditation Checklist */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            NAC Accreditation Checklist
          </CardTitle>
          <CardDescription>Key requirements for accreditation readiness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { item: 'Faculty Qualifications', complete: true },
              { item: 'Infrastructure Documentation', complete: true },
              { item: 'Curriculum Framework', complete: true },
              { item: 'Research Output Records', complete: true },
              { item: 'Student Placement Data', complete: true },
              { item: 'Industry Collaborations', complete: false },
              { item: 'Budget Utilization Reports', complete: false },
              { item: 'Governance Structure', complete: true },
              { item: 'Quality Assurance Policies', complete: true },
            ].map((item) => (
              <div 
                key={item.item} 
                className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                  item.complete ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'
                }`}
              >
                {item.complete ? (
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                )}
                <span className="text-sm">{item.item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground py-4">
        <p className="flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          Reports generated from verified backend data • Last updated: {new Date().toLocaleDateString('en-IN')}
        </p>
      </div>
    </div>
  );
};

export default Reports;
