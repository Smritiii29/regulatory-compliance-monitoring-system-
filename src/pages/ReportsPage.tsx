import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { reportsAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3, Download, FileText, TrendingUp, Building, PieChart
} from 'lucide-react';

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BIOMEDICAL', 'MTECH CSE'];

const ReportsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const isAdminOrPrincipal = user?.role === 'admin' || user?.role === 'principal';

  useEffect(() => {
    setLoading(true);
    reportsAPI.data(academicYear)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [academicYear]);

  const downloadAnnual = async () => {
    try {
      const blob = await reportsAPI.downloadAnnual(academicYear);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RCMS_Annual_Report_${academicYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Report downloaded' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const downloadDepartment = async (dept: string) => {
    try {
      const blob = await reportsAPI.downloadDepartment(dept, academicYear);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RCMS_Report_${dept}_${academicYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `${dept} report downloaded` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Reports & Analytics
          </h1>
          <p className="text-muted-foreground">Compliance reports and performance analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Academic Year:</Label>
            <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              className="w-[140px]" placeholder="2024-2025" />
          </div>
          {isAdminOrPrincipal && (
            <Button onClick={downloadAnnual}>
              <Download className="w-4 h-4 mr-2" /> Download Annual Report (PDF)
            </Button>
          )}
        </div>
      </div>

      {data && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{data.total_circulars}</p>
                <p className="text-sm text-muted-foreground">Total Circulars</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{data.total_submissions}</p>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{data.approved_submissions}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-purple-600">{data.compliance_rate}%</p>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" /> Category-wise Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.categories).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(data.categories).map(([cat, d]: [string, any]) => {
                    const rate = d.submissions > 0 ? Math.round(d.approved / d.submissions * 100) : 0;
                    return (
                      <div key={cat} className="flex items-center gap-4">
                        <div className="w-[200px] font-medium text-sm">{cat}</div>
                        <div className="flex-1">
                          <Progress value={rate} className="h-3" />
                        </div>
                        <div className="w-[120px] text-right text-sm text-muted-foreground">
                          {d.approved}/{d.submissions} ({rate}%)
                        </div>
                        <Badge variant="secondary">{d.total} circulars</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No category data available</p>
              )}
            </CardContent>
          </Card>

          {/* Department Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" /> Department-wise Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(data.departments).map(([dept, d]: [string, any]) => (
                  <Card key={dept} className="border">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{dept}</h3>
                        <Badge variant="outline">{d.user_count} users</Badge>
                      </div>
                      <Progress value={d.compliance_rate} className="h-2 mb-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{d.approved}/{d.submissions} approved</span>
                        <span>{d.compliance_rate}%</span>
                      </div>
                      {(isAdminOrPrincipal || (user?.role === 'hod' && user?.department === dept)) && (
                        <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => downloadDepartment(dept)}>
                          <Download className="w-3 h-3 mr-1" /> Download PDF
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Circulars</p>
                    <p className="text-2xl font-bold">{data.completed_circulars}/{data.total_circulars}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Submissions</p>
                    <p className="text-2xl font-bold">{data.pending_submissions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-100 text-red-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected Submissions</p>
                    <p className="text-2xl font-bold">{data.rejected_submissions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
